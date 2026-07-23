(function() {

  // Fallback word list, used only if wordlists.js fails to load.
  var WORDS_FALLBACK = [
    "the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at",
    "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what",
    "so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take",
    "people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also",
    "back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us",
    "great","between","need","large","often","hand","high","place","small","under","long","right","still","house","world","last","school","never","city","tree"
  ];

  var PUNCT_SET = [".", ",", ";", ":", "!", "?"];
  var APOSTROPHE_MAP = {
    "dont": "don't", "cant": "can't", "wont": "won't", "its": "it's",
    "im": "i'm", "youre": "you're", "theyre": "they're", "isnt": "isn't",
    "doesnt": "doesn't", "didnt": "didn't", "wasnt": "wasn't", "couldnt": "couldn't",
    "wouldnt": "wouldn't", "shouldnt": "shouldn't", "ive": "i've", "youve": "you've",
    "weve": "we've", "theyve": "they've", "theyll": "they'll", "youll": "you'll",
    "well": "we'll", "ill": "i'll", "hes": "he's", "shes": "she's",
    "thats": "that's", "whats": "what's", "whos": "who's", "heres": "here's",
    "theres": "there's", "lets": "let's", "oclock": "o'clock"
  };

  var DOM = {};
  var idleTimer = null;

  var state = {
    mode: "time",           // "time" | "words"
    words: [],
    flatChars: [],
    charIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    totalKeystrokes: 0,
    timerDuration: 30,
    wordCount: 30,
    difficulty: "easy",
    timeRemaining: 30,
    timerRunning: false,
    timerFinished: false,
    startTime: null,
    timerInterval: null,
    punctEnabled: false,
    wpmHistory: [],
    lastSampleSecond: 0
  };

  function init() {
    DOM.wordsInner = document.getElementById("type-words-inner");
    DOM.wordsArea = document.getElementById("type-words");
    DOM.caret = document.getElementById("type-caret");
    DOM.mobileInput = document.getElementById("type-mobile-input");
    DOM.liveWpm = document.getElementById("live-wpm");
    DOM.liveAcc = document.getElementById("live-acc");
    DOM.liveTimer = document.getElementById("live-timer");
    DOM.results = document.getElementById("type-results");
    DOM.hints = document.getElementById("type-hints");
    DOM.resultWpm = document.getElementById("result-wpm");
    DOM.resultAcc = document.getElementById("result-acc");
    DOM.resultChars = document.getElementById("result-chars");
    DOM.resultRaw = document.getElementById("result-raw");
    DOM.bestBadge = document.getElementById("type-best-badge");
    DOM.graph = document.getElementById("type-graph");
    DOM.punctBtn = document.getElementById("type-punct");
    DOM.restartBtn = document.getElementById("type-restart");
    DOM.timeGroup = document.getElementById("type-time-group");
    DOM.wordsGroup = document.getElementById("type-words-group");

    // mode switch: time vs words
    document.querySelectorAll("#type-mode-toggle .type-toggle").forEach(function(b) {
      b.addEventListener("click", function() {
        if (state.timerRunning || state.timerFinished) return;
        var mode = b.getAttribute("data-mode");
        if (mode === state.mode) return;
        state.mode = mode;
        document.querySelectorAll("#type-mode-toggle .type-toggle").forEach(function(x) { x.classList.remove("active"); });
        b.classList.add("active");
        DOM.timeGroup.style.display = mode === "time" ? "flex" : "none";
        DOM.wordsGroup.style.display = mode === "words" ? "flex" : "none";
        resetTest();
      });
    });

    // time duration group
    document.querySelectorAll("#type-time-group .type-mode[data-dur]").forEach(function(b) {
      b.addEventListener("click", function() {
        if (state.timerRunning || state.timerFinished) return;
        document.querySelectorAll("#type-time-group .type-mode").forEach(function(x) { x.classList.remove("active"); });
        b.classList.add("active");
        state.timerDuration = parseInt(b.getAttribute("data-dur"), 10);
        state.timeRemaining = state.timerDuration;
        resetTest();
      });
    });

    // word count group
    document.querySelectorAll("#type-words-group .type-mode[data-count]").forEach(function(b) {
      b.addEventListener("click", function() {
        if (state.timerRunning || state.timerFinished) return;
        document.querySelectorAll("#type-words-group .type-mode").forEach(function(x) { x.classList.remove("active"); });
        b.classList.add("active");
        state.wordCount = parseInt(b.getAttribute("data-count"), 10);
        resetTest();
      });
    });

    // difficulty group
    document.querySelectorAll("#type-diff-group .type-mode[data-diff]").forEach(function(b) {
      b.addEventListener("click", function() {
        if (state.timerRunning || state.timerFinished) return;
        document.querySelectorAll("#type-diff-group .type-mode").forEach(function(x) { x.classList.remove("active"); });
        b.classList.add("active");
        state.difficulty = b.getAttribute("data-diff");
        resetTest();
      });
    });

    DOM.punctBtn.addEventListener("click", function() {
      if (state.timerRunning || state.timerFinished) return;
      state.punctEnabled = !state.punctEnabled;
      DOM.punctBtn.textContent = state.punctEnabled ? "ON" : "OFF";
      resetTest();
    });

    DOM.restartBtn.addEventListener("click", function() {
      DOM.restartBtn.classList.add("spin");
      setTimeout(function() { DOM.restartBtn.classList.remove("spin"); }, 500);
      restart();
    });

    document.addEventListener("keydown", handleKeydown);

    DOM.wordsArea.addEventListener("click", function() {
      DOM.wordsArea.focus();
      if (DOM.mobileInput) DOM.mobileInput.focus();
    });

    window.addEventListener("resize", function() {
      updateCaret();
      scrollToChar(state.charIndex);
    });

    resetTest();
  }

  function getWordList() {
    if (window.TYPING_WORDLISTS && window.TYPING_WORDLISTS[state.difficulty] && window.TYPING_WORDLISTS[state.difficulty].length) {
      return window.TYPING_WORDLISTS[state.difficulty];
    }
    return WORDS_FALLBACK;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pickWords() {
    var list = getWordList();
    var shuffled = shuffle(list.slice());
    var count;
    if (state.mode === "words") {
      count = state.wordCount;
    } else {
      count = Math.max(300, Math.ceil(state.timerDuration * 2.5));
    }
    var picked = [];
    for (var i = 0; i < count; i++) {
      picked.push(shuffled[i % shuffled.length]);
    }
    return picked;
  }

  function applyPunctuation(words) {
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i].toLowerCase();
      if (APOSTROPHE_MAP[w] && Math.random() < 0.15) {
        w = APOSTROPHE_MAP[w];
      } else if (state.punctEnabled && Math.random() < 0.2) {
        w += PUNCT_SET[Math.floor(Math.random() * PUNCT_SET.length)];
      }
      out.push(w);
    }
    return out;
  }

  function buildWords() {
    var raw = pickWords();
    var processed = applyPunctuation(raw);
    var flat = [];
    for (var wi = 0; wi < processed.length; wi++) {
      if (wi > 0) flat.push(" ");
      var w = processed[wi];
      for (var ci = 0; ci < w.length; ci++) {
        flat.push(w[ci]);
      }
    }
    return { words: processed, flatChars: flat };
  }

  function renderChars() {
    var data = buildWords();
    state.words = data.words;
    state.flatChars = data.flatChars;
    state.charIndex = 0;
    state.correctChars = 0;
    state.incorrectChars = 0;
    state.totalKeystrokes = 0;
    state.wpmHistory = [];
    state.lastSampleSecond = 0;

    var html = "";
    for (var i = 0; i < state.flatChars.length; i++) {
      var ch = state.flatChars[i];
      if (ch === " ") {
        html += "<span class=\"tc tc-space\" data-i=\"" + i + "\">&nbsp;</span>";
      } else {
        html += "<span class=\"tc\" data-i=\"" + i + "\">" + escHtml(ch) + "</span>";
      }
    }
    DOM.wordsInner.innerHTML = html;
    var first = DOM.wordsInner.querySelector(".tc");
    if (first) first.classList.add("current");
    scrollToChar(0);
    updateCaret();
  }

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function scrollToChar(idx) {
    var spans = DOM.wordsInner.querySelectorAll(".tc");
    if (spans.length === 0) return;
    var target = idx < spans.length ? spans[idx] : spans[spans.length - 1];
    if (!target) return;
    var area = DOM.wordsArea;
    var targetLeft = target.offsetLeft;
    var targetWidth = target.offsetWidth;
    var targetCenter = targetLeft + targetWidth / 2;
    var areaCenter = area.clientWidth / 2;
    area.scrollLeft = targetCenter - areaCenter;
  }

  function updateCaret() {
    if (!DOM.caret) return;
    var spans = DOM.wordsInner.querySelectorAll(".tc");
    if (!spans.length) return;
    if (state.charIndex >= spans.length) {
      var last = spans[spans.length - 1];
      DOM.caret.style.left = (last.offsetLeft + last.offsetWidth) + "px";
      DOM.caret.style.top = last.offsetTop + "px";
      return;
    }
    var target = spans[state.charIndex];
    DOM.caret.style.left = target.offsetLeft + "px";
    DOM.caret.style.top = target.offsetTop + "px";
  }

  function markActive() {
    if (!DOM.caret) return;
    DOM.caret.classList.remove("blink");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      DOM.caret.classList.add("blink");
    }, 500);
  }

  function currentWordIndex() {
    var idx = 0;
    for (var i = 0; i < state.charIndex; i++) {
      if (state.flatChars[i] === " ") idx++;
    }
    return Math.min(idx + 1, state.words.length);
  }

  function startTimer() {
    if (state.timerRunning) return;
    state.timerRunning = true;
    state.startTime = Date.now();
    state.timerInterval = setInterval(tick, 100);
  }

  function updateTimerDisplay(elapsed) {
    if (state.mode === "time") {
      var remaining = Math.max(0, state.timerDuration - elapsed);
      DOM.liveTimer.textContent = Math.ceil(remaining);
      DOM.liveTimer.classList.toggle("urgent", remaining <= 5 && remaining > 0);
    } else {
      DOM.liveTimer.textContent = currentWordIndex() + "/" + state.words.length;
      DOM.liveTimer.classList.remove("urgent");
    }
  }

  function sampleWpm(elapsed) {
    var sec = Math.floor(elapsed);
    if (sec > state.lastSampleSecond) {
      state.lastSampleSecond = sec;
      var minutes = elapsed / 60;
      var wpm = minutes > 0 ? Math.round((state.correctChars / 5) / minutes) : 0;
      state.wpmHistory.push(Math.max(0, wpm));
    }
  }

  function tick() {
    if (!state.timerRunning) return;
    var elapsed = (Date.now() - state.startTime) / 1000;

    updateTimerDisplay(elapsed);
    updateLiveStats();
    sampleWpm(elapsed);

    if (state.mode === "time" && state.timerDuration - elapsed <= 0) {
      endTest();
    }
  }

  function updateLiveStats() {
    var elapsed = (Date.now() - state.startTime) / 1000;
    if (elapsed < 0.5) return;
    var minutes = elapsed / 60;
    var wpm = Math.round((state.correctChars / 5) / minutes);
    var total = state.correctChars + state.incorrectChars;
    var acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;
    DOM.liveWpm.textContent = wpm || 0;
    DOM.liveAcc.textContent = acc;
  }

  function handleKeydown(e) {
    if (state.timerFinished) {
      if (e.key === "Tab") { e.preventDefault(); restart(); }
      if (e.key === "Escape") { window.location.href = "/"; }
      return;
    }

    if (e.key === "Escape") {
      if (!state.timerRunning) { window.location.href = "/"; }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      restart();
      return;
    }

    if (state.timerRunning === false && state.timerFinished === false) {
      if (e.key.length === 1 || e.key === "Backspace") {
        startTimer();
      }
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (state.charIndex > 0) {
        state.charIndex--;
        var span = DOM.wordsInner.querySelector(".tc[data-i=\"" + state.charIndex + "\"]");
        if (span) {
          if (span.classList.contains("correct")) state.correctChars--;
          if (span.classList.contains("incorrect")) state.incorrectChars--;
          span.classList.remove("correct", "incorrect", "current");
        }
        var nextSpan = DOM.wordsInner.querySelector(".tc[data-i=\"" + state.charIndex + "\"]");
        if (nextSpan) nextSpan.classList.add("current");
        scrollToChar(state.charIndex);
        updateCaret();
        markActive();
      }
      return;
    }

    if (e.key.length === 1) {
      state.totalKeystrokes++;
      var span = DOM.wordsInner.querySelector(".tc[data-i=\"" + state.charIndex + "\"]");
      if (!span) return;

      var expected = state.flatChars[state.charIndex];
      if (e.key === expected) {
        span.classList.add("correct");
        state.correctChars++;
      } else {
        span.classList.add("incorrect");
        state.incorrectChars++;
      }

      span.classList.remove("current");
      state.charIndex++;
      var nextSpan = DOM.wordsInner.querySelector(".tc[data-i=\"" + state.charIndex + "\"]");
      if (nextSpan) {
        nextSpan.classList.add("current");
        scrollToChar(state.charIndex);
      } else {
        updateCaret();
        endTest();
        return;
      }
      updateCaret();
      markActive();
      updateLiveStats();
      return;
    }
  }

  function calcRawWpm() {
    var elapsed = (Date.now() - state.startTime) / 1000;
    if (elapsed < 0.5) return 0;
    return Math.round((state.totalKeystrokes / 5) / (elapsed / 60));
  }

  function pbKey() {
    var modeVal = state.mode === "time" ? state.timerDuration : state.wordCount;
    return "typingpb_" + state.mode + "_" + modeVal + "_" + state.difficulty + "_" + (state.punctEnabled ? "on" : "off");
  }

  function checkPersonalBest(wpm) {
    try {
      var key = pbKey();
      var prev = parseInt(localStorage.getItem(key) || "0", 10);
      if (wpm > prev) {
        localStorage.setItem(key, String(wpm));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  function animateCount(el, target, duration) {
    if (!el) return;
    var startTime = null;
    function step(ts) {
      if (startTime === null) startTime = ts;
      var p = Math.min(1, (ts - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  function renderGraph() {
    if (!DOM.graph) return;
    var hist = state.wpmHistory;
    if (hist.length < 2) { DOM.graph.innerHTML = ""; return; }
    var w = 300, h = 56;
    var max = Math.max.apply(null, hist.concat([10]));
    var stepX = w / (hist.length - 1);
    var points = hist.map(function(v, i) {
      var x = i * stepX;
      var y = h - (v / max) * (h - 6) - 3;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    DOM.graph.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" class="type-graph-svg">' +
      '<polyline points="' + points + '" class="type-graph-line" vector-effect="non-scaling-stroke"/>' +
      "</svg>";
  }

  function endTest() {
    state.timerFinished = true;
    state.timerRunning = false;
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    clearTimeout(idleTimer);
    if (DOM.caret) DOM.caret.classList.remove("blink");

    var total = state.correctChars + state.incorrectChars;
    var acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;
    var elapsed = Math.max(0.5, (Date.now() - state.startTime) / 1000);
    var minutes = elapsed / 60;
    var wpm = Math.round((state.correctChars / 5) / minutes) || 0;
    var raw = Math.round((state.totalKeystrokes / 5) / minutes) || 0;
    var chars = state.correctChars + state.incorrectChars;

    animateCount(DOM.resultWpm, wpm, 500);
    animateCount(DOM.resultAcc, acc, 500);
    animateCount(DOM.resultChars, chars, 500);
    animateCount(DOM.resultRaw, raw, 500);

    DOM.liveWpm.textContent = wpm;
    DOM.liveAcc.textContent = acc;

    var isBest = checkPersonalBest(wpm);
    if (DOM.bestBadge) DOM.bestBadge.style.display = isBest ? "inline-flex" : "none";

    renderGraph();

    DOM.wordsArea.classList.add("test-done");
    DOM.results.style.display = "block";
    DOM.hints.style.display = "none";
  }

  function resetTest() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    clearTimeout(idleTimer);
    state.timerRunning = false;
    state.timerFinished = false;
    state.timeRemaining = state.timerDuration;
    state.startTime = null;
    DOM.liveWpm.textContent = "0";
    DOM.liveAcc.textContent = "100";
    DOM.results.style.display = "none";
    DOM.hints.style.display = "block";
    if (DOM.bestBadge) DOM.bestBadge.style.display = "none";
    if (DOM.graph) DOM.graph.innerHTML = "";
    DOM.wordsArea.classList.remove("test-done");
    renderChars();
    updateTimerDisplay(0);
    DOM.wordsArea.focus();
    markActive();
  }

  function restart() {
    resetTest();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
