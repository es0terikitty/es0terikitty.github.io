// Wiktionary lookup engine — ported from tristonarmstrong/omarchy-dictionary
// (Model.js, MIT). Pure data + URL building + response parsing — no DOM, no
// fetch. The page script owns the network call and rendering. The fuzzy
// matcher needs its wordlist injected via setWordlist() (see dict-wordlist.js,
// loaded lazily only when a lookup misses).
(function(global) {
  'use strict';

  // ---- Languages ----
  // `wikiName` is the heading each Wiktionary edition uses for its own
  // language section (e.g. "English" on en.wikt, "日本語" on ja.wikt). The
  // parser matches against it, so it must match Wiktionary's section title.
  var LANGUAGES = [
    { value: "ar", label: "Arabic",     wikiName: "Arabic" },
    { value: "bn", label: "Bengali",    wikiName: "Bengali" },
    { value: "zh", label: "Chinese",    wikiName: "Chinese" },
    { value: "nl", label: "Dutch",      wikiName: "Dutch" },
    { value: "en", label: "English",    wikiName: "English" },
    { value: "fr", label: "French",     wikiName: "French" },
    { value: "de", label: "German",     wikiName: "German" },
    { value: "hi", label: "Hindi",      wikiName: "Hindi" },
    { value: "id", label: "Indonesian", wikiName: "Indonesian" },
    { value: "it", label: "Italian",    wikiName: "Italian" },
    { value: "ja", label: "Japanese",   wikiName: "日本語" },
    { value: "ko", label: "Korean",     wikiName: "한국어" },
    { value: "ms", label: "Malay",      wikiName: "Malay" },
    { value: "fa", label: "Persian",    wikiName: "Persian" },
    { value: "pl", label: "Polish",     wikiName: "Polish" },
    { value: "pt", label: "Portuguese", wikiName: "Portuguese" },
    { value: "ru", label: "Russian",    wikiName: "Russian" },
    { value: "es", label: "Spanish",    wikiName: "Spanish" },
    { value: "sw", label: "Swahili",    wikiName: "Swahili" },
    { value: "sv", label: "Swedish",    wikiName: "Swedish" },
    { value: "th", label: "Thai",       wikiName: "ภาษาไทย" },
    { value: "tr", label: "Turkish",    wikiName: "Turkish" },
    { value: "vi", label: "Vietnamese", wikiName: "Vietnamese" }
  ].sort(function(a, b) { return a.label.localeCompare(b.label); });

  var LANG_BY_VALUE = {};
  for (var i = 0; i < LANGUAGES.length; i++) LANG_BY_VALUE[LANGUAGES[i].value] = LANGUAGES[i];

  function langLabel(value) {
    var l = LANG_BY_VALUE[String(value || "en").toLowerCase()];
    return l ? l.label : String(value || "en");
  }
  function langWikiName(value) {
    var l = LANG_BY_VALUE[String(value || "en").toLowerCase()];
    return l ? l.wikiName : "English";
  }

  function defaultLanguage() { return "en"; }

  function languages() { return LANGUAGES.slice(); }

  // ---- API layer ----
  // MediaWiki extracts endpoint: plain text with ==/===/==== section markers
  // preserved — that structure is what the parser below walks.
  function apiBase(langCode) {
    var code = String(langCode || defaultLanguage()).trim().toLowerCase() || defaultLanguage();
    return "https://" + code + ".wiktionary.org/w/api.php?origin=*&action=query&prop=extracts&explaintext=1&format=json&titles=";
  }

  function lookupUrl(word, langCode) {
    var w = String(word || "").trim();
    if (w === "") return "";
    return apiBase(langCode) + encodeURIComponent(w);
  }

  // ---- Response parsing & normalisation ----
  function parseResponse(raw, langCode) {
    var text = String(raw || "").trim();
    if (text === "") {
      return { ok: false, kind: "empty", error: "empty response" };
    }
    var data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, kind: "invalid", error: "could not parse response" };
    }
    if (!data || typeof data !== "object") {
      return { ok: false, kind: "invalid", error: "could not parse response" };
    }

    if (data.query && data.query.pages && typeof data.query.pages === "object") {
      var pages = data.query.pages;
      var pageIds = Object.keys(pages);
      if (pageIds.length === 0) {
        return { ok: false, kind: "empty", error: "no entry returned" };
      }
      var page = pages[pageIds[0]];
      if (!page || page.missing !== undefined) {
        return {
          ok: false,
          kind: "notfound",
          error: "no entry for \"" + (page && page.title ? page.title : "word") + "\""
        };
      }
      var extract = page.extract != null ? String(page.extract).trim() : "";
      if (extract === "") {
        return { ok: false, kind: "empty", error: "no extract returned" };
      }
      var entry = normalizeEntry(page, langCode);
      if (!entry) return { ok: false, kind: "empty", error: "no entry returned" };
      return { ok: true, entry: entry, variants: pageIds.length };
    }

    // Legacy Free Dictionary shapes, kept so rollback is trivial.
    if (!Array.isArray(data) && data.title && data.message) {
      return {
        ok: false,
        kind: "notfound",
        error: String(data.message),
        hint: data.resolution ? String(data.resolution) : ""
      };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, kind: "empty", error: "no entry returned" };
    }

    var legacyEntry = normalizeEntry(data[0], langCode);
    if (!legacyEntry) return { ok: false, kind: "empty", error: "no entry returned" };
    return { ok: true, entry: legacyEntry, variants: data.length };
  }

  function normalizeEntry(raw, langCode) {
    if (!raw || typeof raw !== "object") return null;

    if (raw.extract != null) {
      var word = String(raw.title || "").trim();
      if (word === "") return null;
      return parseWiktionaryWikitext(word, raw.extract, langCode);
    }

    var fword = String(raw.word || "").trim();
    if (fword === "") return null;

    var phonetic = String(raw.phonetic || "").trim();
    if (phonetic === "" && Array.isArray(raw.phonetics)) {
      for (var i = 0; i < raw.phonetics.length; i++) {
        var p = raw.phonetics[i];
        if (p && typeof p === "object" && p.text) {
          phonetic = String(p.text).trim();
          if (phonetic !== "") break;
        }
      }
    }

    var audioUrl = "";
    if (Array.isArray(raw.phonetics)) {
      for (var j = 0; j < raw.phonetics.length; j++) {
        var ph = raw.phonetics[j];
        if (ph && typeof ph === "object" && ph.audio && String(ph.audio).trim() !== "") {
          audioUrl = String(ph.audio).trim();
          break;
        }
      }
    }

    var meanings = [];
    if (Array.isArray(raw.meanings)) {
      for (var k = 0; k < raw.meanings.length; k++) {
        var m = normalizeMeaning(raw.meanings[k]);
        if (m) meanings.push(m);
      }
    }

    if (meanings.length === 0) return null;

    return {
      word: fword,
      phonetic: phonetic,
      audioUrl: audioUrl,
      source: "dictionaryapi",
      meanings: meanings
    };
  }

  function normalizeMeaning(raw) {
    if (!raw || typeof raw !== "object") return null;
    var pos = String(raw.partOfSpeech || "").trim();
    if (pos === "") return null;

    var defs = [];
    if (Array.isArray(raw.definitions)) {
      for (var i = 0; i < raw.definitions.length; i++) {
        var d = normalizeDefinition(raw.definitions[i]);
        if (d) defs.push(d);
      }
    }

    if (defs.length === 0) return null;

    return {
      partOfSpeech: pos,
      definitions: defs,
      synonyms: stringList(raw.synonyms),
      antonyms: stringList(raw.antonyms)
    };
  }

  function normalizeDefinition(raw) {
    if (!raw || typeof raw !== "object") return null;
    var text = String(raw.definition || "").trim();
    if (text === "") return null;
    return {
      definition: text,
      example: raw.example ? String(raw.example).trim() : "",
      synonyms: stringList(raw.synonyms),
      antonyms: stringList(raw.antonyms)
    };
  }

  function stringList(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length; i++) {
      var s = String(value[i] || "").trim();
      if (s !== "") out.push(s);
    }
    return out;
  }

  // ---- Wiktionary extract parser ----
  // Turns "== Lang == / === POS ==== / defs…" plain text into structured
  // { word, phonetic, source, language, meanings[] } entries.

  function parseSections(text) {
    text = String(text || "").replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
    var root = { level: 1, title: "", body: "", children: [] };
    var stack = [root];
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = /^(={2,5})\s*([^{}=\n][^{}=\n]*?)\s*\1\s*$/.exec(lines[i]);
      if (m) {
        var lvl = m[1].length;
        while (stack.length > 1 && stack[stack.length - 1].level >= lvl) stack.pop();
        var sec = { level: lvl, title: String(m[2]).trim(), body: "", children: [] };
        stack[stack.length - 1].children.push(sec);
        stack.push(sec);
      } else if (stack.length > 1) {
        var top = stack[stack.length - 1];
        top.body += (top.body ? "\n" : "") + lines[i];
      }
    }
    return root.children;
  }

  function stripInlineHeaders(text) {
    return String(text || "").replace(/^={2,}[^\n=].{0,80}?={2,}\s*$/gm, "").trim();
  }

  var WIKT_POS_KEYS = {
    noun: 1, verb: 1, adjective: 1, adj: 1, adverb: 1, adv: 1,
    pronoun: 1, preposition: 1, postposition: 1, particle: 1,
    interjection: 1, conjunction: 1, determiner: 1, article: 1,
    numeral: 1, contraction: 1, letter: 1, symbol: 1, initialism: 1,
    prefix: 1, suffix: 1, infix: 1, circumfix: 1, "combining form": 1,
    phrase: 1, idiom: 1, proverb: 1, clause: 1, predicative: 1,
    "auxiliary verb": 1, "modal verb": 1, "proper noun": 1, name: 1,
    ordinal: 1, cardinal: 1, gerund: 1, participle: 1, infinitive: 1
  };
  var WIKT_SKIP_DROP = {
    translations: 1, "derived terms": 1, "related terms": 1,
    descendants: 1, references: 1, "further reading": 1,
    anagrams: 1, conjugation: 1, declension: 1, inflection: 1,
    "see also": 1, "external links": 1, quotations: 1,
    homophones: 1, hyponyms: 1, hypernyms: 1,
    meronyms: 1, holonyms: 1, troponyms: 1,
    "coordinate terms": 1, "alternative forms": 1,
    synonyms: 1, antonyms: 1, "usage notes": 1
  };

  function wiktCanonicalPos(t) {
    if (t === "adj") return "adjective";
    if (t === "adv") return "adverb";
    if (t === "auxiliary verb" || t === "modal verb" || t === "gerund" ||
        t === "participle" || t === "infinitive") return "verb";
    if (t === "proper noun" || t === "name") return "noun";
    return t;
  }

  function wiktExtractIpa(body) {
    var m = /IPA[^:\n]*:\s*\/([^\n/]+)\//.exec(body);
    if (m) return "/" + m[1] + "/";
    var m2 = /IPA[^:\n]*:\s*\[([^\n\]]+)\]/.exec(body);
    if (m2) return "[" + m2[1] + "]";
    return "";
  }

  function wiktIsInflectionLine(line, headword) {
    if (!line || line.indexOf("(") < 0) return false;
    var openIdx = line.indexOf("(");
    var closeIdx = line.lastIndexOf(")");
    if (openIdx < 0 || closeIdx < 0 || closeIdx !== line.length - 1) return false;
    var head = line.substring(0, openIdx).trim().toLowerCase();
    var annot = line.substring(openIdx + 1, closeIdx);
    if (!head || !annot) return false;
    var heads = head.split(/[,\s]+/).filter(Boolean);
    if (!heads.length) return null;
    var hw = String(headword || "").trim().toLowerCase();
    var headOK = true;
    for (var i = 0; i < heads.length; i++) {
      var p = heads[i];
      if (p === hw || p === hw + "s" || p === hw + "es") continue;
      if (/^[a-z]+'$/.test(p)) continue;
      if (/^[a-z]+$/.test(p)) continue;
      headOK = false;
      break;
    }
    if (!headOK) return false;
    return /third-person|present participle|simple past|past participle|plural|comparative|superlative|diminutive|feminine|masculine|neuter|genitive|nominative|accusative|dative|ablative|not comparable|UK|US|dialectal|imperative|auxiliary|conjugation|^by$|predicative/i.test(annot);
  }

  function wiktExtractDefs(headword, body) {
    var t = stripInlineHeaders(String(body || "").replace(/\s+$/, "").trim());
    if (!t) return [];
    var blocks = t.split(/\n\s*\n/);

    if (blocks.length) {
      var first = blocks[0];
      var fLines = first.split("\n");
      if (fLines.length === 1) {
        var stripped = fLines[0].replace(/[^a-zA-Z\s,]/g, "").trim().toLowerCase();
        var hw = String(headword || "").trim().toLowerCase();
        var parts = stripped.split(/[,\s]+/).filter(Boolean);
        var headMatch = parts.length > 0;
        for (var i = 0; i < parts.length && headMatch; i++) {
          var p = parts[i];
          if (p === hw || p === hw + "s" || p === hw + "es") continue;
          if (/^[a-z]+'$/.test(p)) continue;
          if (/^[a-z]+$/.test(p)) continue;
          headMatch = false;
        }
        if (headMatch || wiktIsInflectionLine(first, headword)) blocks.shift();
      }
    }

    var skipRE = /^\s*(Synonyms?|Antonyms?|Coordinate terms?|Related terms?|Derived terms?|For more quotations using this term|Usage notes|See also|External links|Trivia|Footnotes|Source|Notes|History|Compare|Quotations|Anagram)/i;
    var attrStartRE = /^(?:[12]\d{3}|January|February|March|April|May|June|July|August|September|October|November|December|c\.|circa|ca\.)\b/;
    var onlyLabelRE = /^\([A-Za-z][A-Za-z ,]*\)\s*$/;
    var numberRangeRE = /^\d+\s*-\s*\d+,\s*\d/;

    var defs = [];
    function emit(text) {
      var s = String(text || "").replace(/\s+$/, "").trim();
      if (!s) return;
      if (/^\[[^\]]+\]\s*$/.test(s)) return;
      if (attrStartRE.test(s)) return;
      if (onlyLabelRE.test(s)) return;
      if (numberRangeRE.test(s)) return;
      if (s.length < 8) return;
      defs.push({ definition: s, example: "", synonyms: [], antonyms: [] });
    }

    for (var bi = 0; bi < blocks.length; bi++) {
      var block = blocks[bi].trim();
      if (!block) continue;
      if (/^Alternative forms\s+of\s+/i.test(block)) continue;
      var bLines = block.split("\n");
      for (var lj = 0; lj < bLines.length; lj++) {
        var line = bLines[lj].replace(/\s+$/, "").trim();
        if (!line) continue;
        if (skipRE.test(line)) continue;
        if (line.charAt(0) === "*") line = line.substring(1).trim();
        if (attrStartRE.test(line)) {
          if (lj + 1 < bLines.length) {
            var next = bLines[lj + 1].replace(/\s+$/, "").trim();
            if (next && !skipRE.test(next) && !attrStartRE.test(next) &&
                !onlyLabelRE.test(next) && next.length >= 12) {
              emit(line + " — " + next);
              lj++;
            }
          }
          continue;
        }
        emit(line);
      }
    }
    return defs;
  }

  function parseWiktionaryWikitext(headword, rawText, langCode) {
    var top = parseSections(rawText);
    if (!top.length) return null;

    var target = String(langCode || defaultLanguage()).toLowerCase();
    var targetName = langWikiName(target).toLowerCase();
    var labelLower = langLabel(target).toLowerCase();
    var lang = null;
    for (var i = 0; i < top.length; i++) {
      var t = top[i];
      if (t.level !== 2) continue;
      var titleLower = t.title.toLowerCase();
      if (titleLower === targetName || titleLower === labelLower) {
        lang = t;
        break;
      }
    }
    if (!lang) {
      for (var fi = 0; fi < top.length; fi++) {
        if (top[fi].level === 2) { lang = top[fi]; break; }
      }
    }
    if (!lang) return null;

    var loose = target !== "en";

    var meanings = [];
    var phonetic = "";

    function visit(node) {
      var key = node.title.toLowerCase().trim();
      var keyBase = key.replace(/\s+\d+$/, "");
      if (key === "pronunciation") {
        phonetic = wiktExtractIpa(node.body) || phonetic;
        return;
      }
      if (key === "etymology" || keyBase === "etymology") {
        for (var ei = 0; ei < node.children.length; ei++) visit(node.children[ei]);
        return;
      }
      if (WIKT_SKIP_DROP[key]) return;
      if (WIKT_POS_KEYS[key]) {
        var defs = wiktExtractDefs(headword, node.body);
        if (defs.length) {
          meanings.push({
            partOfSpeech: wiktCanonicalPos(key),
            definitions: defs,
            synonyms: [],
            antonyms: []
          });
        }
        return;
      }
      if (loose && node.level === 3) {
        var looseDefs = wiktExtractDefs(headword, node.body);
        if (looseDefs.length && node.title.trim().length > 0 && node.title.trim().length < 30) {
          meanings.push({
            partOfSpeech: node.title.trim(),
            definitions: looseDefs,
            synonyms: [],
            antonyms: []
          });
          return;
        }
      }
      for (var ci = 0; ci < node.children.length; ci++) visit(node.children[ci]);
    }

    for (var li = 0; li < lang.children.length; li++) visit(lang.children[li]);

    if (!meanings.length) return null;
    return {
      word: String(headword || "").trim(),
      phonetic: phonetic,
      audioUrl: "",
      source: "wiktionary",
      language: target,
      meanings: meanings
    };
  }

  // ---- Fuzzy match ----

  function levenshtein(a, b) {
    if (a === b) return 0;
    var al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    if (al < bl) {
      var tmp = a; a = b; b = tmp;
      var tlen = al; al = bl; bl = tlen;
    }
    var v0 = []; var v1 = [];
    for (var i = 0; i <= bl; i++) v0[i] = i;
    for (var r = 0; r < al; r++) {
      v1[0] = r + 1;
      var ai = a.charCodeAt(r);
      for (var c = 0; c < bl; c++) {
        var cost = ai === b.charCodeAt(c) ? 0 : 1;
        var ins = v1[c] + 1;
        var del = v0[c + 1] + 1;
        var sub = v0[c] + cost;
        var m = ins < del ? ins : del;
        if (sub < m) m = sub;
        v1[c + 1] = m;
      }
      var swap = v0; v0 = v1; v1 = swap;
    }
    return v0[bl];
  }

  var _WORDLIST = [];

  function setWordlist(list) {
    if (Array.isArray(list)) _WORDLIST = list;
  }

  var AUTO_MATCH_MAX_NORMALIZED = 0.22;
  var ALTERNATIVES_MAX_NORMALIZED = 0.40;
  var ALTERNATIVES_DISTANCE_LIMIT = 3;
  var AUTO_MATCH_GAP = 0.08;
  var ALTERNATIVES_TO_SHOW = 3;

  function fuzzyMatch(rawQuery) {
    var query = String(rawQuery || "").toLowerCase().trim();
    var q = "";
    for (var i = 0; i < query.length; i++) {
      var ch = query.charCodeAt(i);
      if ((ch >= 97 && ch <= 122) ||
          ch === 0xe9 || ch === 0xe8 || ch === 0xea || ch === 0xeb ||
          ch === 0xe0 || ch === 0xe2 || ch === 0xee || ch === 0xef ||
          ch === 0xf1) {
        q += query[i];
      }
    }
    if (q.length < 2) return { autoMatch: null, alternatives: [] };

    var qlen = q.length;
    var results = [];
    for (var k = 0; k < _WORDLIST.length; k++) {
      var w = _WORDLIST[k];
      var wlen = w.length;
      if (w.charAt(0) !== q.charAt(0)) continue;
      if (Math.abs(wlen - qlen) > ALTERNATIVES_DISTANCE_LIMIT) continue;
      var d = levenshtein(q, w);
      if (d > ALTERNATIVES_DISTANCE_LIMIT) continue;
      var score = d / Math.max(qlen, wlen);
      results.push({ word: w, distance: d, score: score });
    }

    results.sort(function(a, b) {
      if (a.score !== b.score) return a.score - b.score;
      if (a.distance !== b.distance) return a.distance - b.distance;
      var ad = Math.abs(a.word.length - qlen);
      var bd = Math.abs(b.word.length - qlen);
      if (ad !== bd) return ad - bd;
      if (a.word < b.word) return -1;
      if (a.word > b.word) return 1;
      return 0;
    });

    var inBand = [];
    for (var ri = 0; ri < results.length; ri++) {
      if (results[ri].score > ALTERNATIVES_MAX_NORMALIZED) break;
      inBand.push(results[ri]);
    }

    if (inBand.length === 0) return { autoMatch: null, alternatives: [] };

    var top = inBand[0];
    var autoOk = top.score <= AUTO_MATCH_MAX_NORMALIZED &&
                 (inBand.length === 1 ||
                  (inBand[1].score - top.score) >= AUTO_MATCH_GAP);
    if (autoOk) return { autoMatch: top.word, alternatives: [] };

    var alts = [];
    for (var n = 0; n < inBand.length && n < ALTERNATIVES_TO_SHOW; n++) {
      alts.push(inBand[n].word);
    }
    return { autoMatch: null, alternatives: alts };
  }

  // ---- Display helpers ----

  function summaryLabel(entry) {
    if (!entry || !entry.meanings) return "";
    var pos = [];
    for (var i = 0; i < entry.meanings.length; i++) {
      if (entry.meanings[i] && entry.meanings[i].partOfSpeech) {
        pos.push(entry.meanings[i].partOfSpeech);
      }
    }
    return pos.join(" · ");
  }

  function sourceLabel(entry) {
    if (!entry || !entry.source) return "";
    if (entry.source === "wiktionary") return "Wiktionary";
    if (entry.source === "dictionaryapi") return "Free Dictionary";
    return String(entry.source);
  }

  global.DictEngine = {
    LANGUAGES: LANGUAGES,
    languages: languages,
    langLabel: langLabel,
    apiBase: apiBase,
    lookupUrl: lookupUrl,
    parseResponse: parseResponse,
    parseWiktionaryWikitext: parseWiktionaryWikitext,
    levenshtein: levenshtein,
    setWordlist: setWordlist,
    fuzzyMatch: fuzzyMatch,
    summaryLabel: summaryLabel,
    sourceLabel: sourceLabel,
    defaultLanguage: defaultLanguage
  };
})(typeof window !== 'undefined' ? window : globalThis);
