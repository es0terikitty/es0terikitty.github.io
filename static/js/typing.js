(function() {

  var WORDS = [
    "the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at",
    "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what",
    "so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take",
    "people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also",
    "back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us",
    "great","between","need","large","often","hand","high","place","small","under","long","right","still","house","world","last","school","never","city","tree",
    "cross","farm","hard","start","might","story","saw","far","sea","draw","left","late","run","while","press","close","night","real","life","few",
    "north","open","seem","together","next","white","children","begin","got","walk","example","ease","paper","group","always","music","those","both","mark","book",
    "letter","until","mile","river","car","feet","care","second","enough","plain","girl","usual","young","ready","above","ever","red","list","though","feel",
    "talk","bird","soon","body","dog","family","direct","pose","leave","song","measure","door","product","black","short","number","class","wind","question","happen",
    "complete","ship","area","half","rock","order","fire","south","problem","piece","told","knew","pass","since","top","whole","king","space","heard","best",
    "hour","better","true","during","hundred","am","remember","step","early","hold","west","ground","interest","reach","fast","verb","sing","listen","six","table",
    "travel","less","morning","ten","simple","several","vowel","toward","war","lay","against","pattern","slow","center","love","person","money","serve","appear","road",
    "map","rain","rule","govern","pull","cold","notice","voice","unit","power","town","fine","certain","fly","fall","lead","cry","dark","machine","note",
    "wait","plan","figure","star","box","noun","field","rest","correct","able","pound","done","beauty","drive","stood","contain","front","teach","week","final",
    "gave","green","oh","quick","develop","ocean","warm","free","minute","strong","special","mind","behind","clear","tail","produce","fact","street","inch","lot",
    "nothing","course","stay","wheel","full","force","blue","object","decide","surface","deep","moon","island","foot","yet","busy","test","record","boat","common",
    "gold","possible","plane","stead","dry","wonder","laugh","thousand","ago","ran","check","game","shape","equate","hot","miss","brought","heat","snow","tire",
    "bring","yes","distant","fill","east","paint","language","among","grand","ball","yet","wave","drop","heart","am","present","heavy","dance","engine","position",
    "arm","wide","sail","material","size","vary","settle","speak","weight","general","ice","matter","circle","pair","include","divide","syllable","felt","perhaps","pick",
    "sudden","count","square","reason","length","represent","art","subject","region","energy","hunt","probable","bed","brother","egg","ride","cell","believe","fraction","forest",
    "sit","race","window","store","summer","train","sleep","prove","lone","leg","exercise","wall","catch","mount","wish","sky","board","joy","winter","sat",
    "written","wild","instrument","kept","glass","grass","cow","job","edge","sign","visit","past","soft","fun","bright","gas","weather","month","million","bear",
    "finish","happy","hope","flower","clothe","strange","gone","jump","baby","eight","village","meet","root","buy","raise","solve","metal","whether","push","seven",
    "paragraph","third","shall","held","hair","describe","cook","floor","either","result","burn","hill","safe","cat","century","consider","type","law","bit","coast",
    "copy","phrase","silent","tall","sand","soil","roll","temperature","finger","industry","value","fight","lie","beat","excite","natural","view","sense","ear","else",
    "quite","broke","case","middle","kill","son","lake","moment","scale","loud","spring","observe","child","straight","consonant","nation","dictionary","milk","speed","method",
    "organ","pay","age","section","dress","cloud","surprise","quiet","stone","tiny","climb","cool","design","poor","lot","experiment","bottom","key","iron","single",
    "stick","flat","twenty","skin","smile","crease","hole","trade","melody","trip","office","receive","row","mouth","exact","symbol","die","least","trouble","shout",
    "except","wrote","seed","tone","join","suggest","clean","break","lady","yard","rise","bad","blow","oil","blood","touch","grew","cent","mix","team",
    "wire","cost","lost","brown","wear","garden","equal","sent","choose","fell","fit","flow","fair","bank","collect","save","control","decimal","gentle","woman",
    "captain","practice","separate","difficult","doctor","please","protect","noon","whose","locate","ring","character","insect","caught","period","indicate","radio","spoke","atom","human",
    "history","effect","electric","expect","crop","modern","element","hit","student","corner","party","supply","bone","rail","imagine","provide","agree","thus","capital","won",
    "chair","danger","fruit","rich","thick","soldier","process","operate","guess","necessary","sharp","wing","create","neighbor","wash","bat","rather","crowd","corn","compare",
    "poem","string","bell","depend","meat","rub","tube","famous","dollar","stream","fear","sight","thin","triangle","planet","hurry","chief","colony","clock","mine",
    "enter","major","fresh","search","send","yellow","gun","allow","print","dead","spot","desert","suit","current","lift","rose","continue","block","chart","hat",
    "sell","success","company","subtract","event","particular","deal","swim","term","opposite","wife","shoe","shoulder","spread","arrange","camp","invent","cotton","born","determine",
    "quart","nine","truck","noise","level","chance","gather","shop","stretch","throw","shine","property","column","molecule","select","wrong","gray","repeat","require","broad",
    "prepare","salt","nose","plural","anger","claim","continent","oxygen","sugar","death","pretty","skill","women","season","solution","magnet","silver","thank","branch","match",
    "suffix","especially","fig","afraid","huge","sister","steel","discuss","forward","similar","guide","experience","score","apple","bought","led","pitch","coat","mass","card",
    "band","rope","slip","win","dream","evening","condition","feed","tool","total","basic","smell","valley","double","seat","continue","block","chart","hat","cell",
    "self","gas","design","farm","corn","compare","poem","string","bell","depend","meat","tube","famous","dollar","stream","fear","sight","thin","triangle","planet",
    "hurry","chief","colony","clock","mine","enter","major","fresh","search","send","yellow","gun","allow","print","dead","spot","desert","suit","current","lift",
    "rose","arrive","master","track","parent","shore","division","sheet","substance","favor","connect","post","spend","chord","fat","glad","original","share","station","dad",
    "bread","charge","proper","bar","offer","segment","slave","duck","instant","market","degree","populate","chick","dear","enemy","reply","drink","occur","support","speech",
    "nature","range","steam","motion","path","liquid","log","meant","quotient","teeth","shell","neck","oxygen","sugar","death","pretty","skill","women","season","solution",
    "magnet","silver","thank","branch","match","suffix","especially","fig","afraid","huge","sister","steel","discuss","forward","similar","guide","experience","score","apple","bought",
    "led","pitch","coat","mass","card","band","rope","slip","win","dream","evening","condition","feed","tool","total","basic","smell","valley","nor","double",
    "seat","arrive","master","track","parent","shore","division","sheet","substance","favor","connect","post","spend","chord","fat","glad","original","share","station","dad",
    "bread","charge","proper","bar","offer","segment","slave","duck","instant","market","degree","populate","chick","dear","enemy","reply","drink","occur","support","speech",
    "nature","range","steam","motion","path","liquid","log","meant","quotient","teeth","shell","neck"
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
  var state = {
    words: [],
    flatChars: [],
    charIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    totalKeystrokes: 0,
    timerDuration: 60,
    timeRemaining: 60,
    timerRunning: false,
    timerFinished: false,
    startTime: null,
    timerInterval: null,
    punctEnabled: false,
    wpmHistory: []
  };

  function init() {
    DOM.wordsInner = document.getElementById("type-words-inner");
    DOM.wordsArea = document.getElementById("type-words");
    DOM.liveWpm = document.getElementById("live-wpm");
    DOM.liveAcc = document.getElementById("live-acc");
    DOM.liveTimer = document.getElementById("live-timer");
    DOM.results = document.getElementById("type-results");
    DOM.hints = document.getElementById("type-hints");
    DOM.resultWpm = document.getElementById("result-wpm");
    DOM.resultAcc = document.getElementById("result-acc");
    DOM.resultChars = document.getElementById("result-chars");
    DOM.resultRaw = document.getElementById("result-raw");
    DOM.punctBtn = document.getElementById("type-punct");

    document.querySelectorAll(".type-mode[data-dur]").forEach(function(b) {
      b.addEventListener("click", function() {
        if (state.timerRunning || state.timerFinished) return;
        document.querySelectorAll(".type-mode[data-dur]").forEach(function(x) { x.classList.remove("active"); });
        b.classList.add("active");
        state.timerDuration = parseInt(b.getAttribute("data-dur"));
        state.timeRemaining = state.timerDuration;
        DOM.liveTimer.textContent = state.timerDuration;
        resetTest();
      });
    });

    DOM.punctBtn.addEventListener("click", function() {
      if (state.timerRunning || state.timerFinished) return;
      state.punctEnabled = !state.punctEnabled;
      DOM.punctBtn.textContent = state.punctEnabled ? "ON" : "OFF";
      resetTest();
    });

    document.addEventListener("keydown", handleKeydown);
    DOM.wordsArea.addEventListener("click", function() { DOM.wordsArea.focus(); });

    resetTest();
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pickWords() {
    var shuffled = shuffle(WORDS.slice());
    var count = Math.max(300, Math.ceil(state.timerDuration * 2.5));
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

  function startTimer() {
    if (state.timerRunning) return;
    state.timerRunning = true;
    state.startTime = Date.now();
    state.timerInterval = setInterval(tick, 100);
  }

  function tick() {
    if (!state.timerRunning) return;
    var elapsed = (Date.now() - state.startTime) / 1000;
    var remaining = Math.max(0, state.timerDuration - elapsed);
    state.timeRemaining = remaining;
    DOM.liveTimer.textContent = Math.ceil(remaining);

    updateLiveStats();

    if (remaining <= 0) {
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
        endTest();
      }
      updateLiveStats();
      return;
    }
  }

  function calcRawWpm() {
    var elapsed = (Date.now() - state.startTime) / 1000;
    if (elapsed < 0.5) return 0;
    return Math.round((state.totalKeystrokes / 5) / (elapsed / 60));
  }

  function endTest() {
    state.timerFinished = true;
    state.timerRunning = false;
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    var total = state.correctChars + state.incorrectChars;
    var acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;
    var elapsed = Math.max(0.5, (Date.now() - state.startTime) / 1000);
    var minutes = elapsed / 60;
    var wpm = Math.round((state.correctChars / 5) / minutes);
    var raw = Math.round((state.totalKeystrokes / 5) / minutes);

    DOM.resultWpm.textContent = wpm || 0;
    DOM.resultAcc.textContent = acc;
    DOM.resultChars.textContent = state.correctChars + state.incorrectChars;
    DOM.resultRaw.textContent = raw || 0;

    DOM.liveWpm.textContent = wpm || 0;
    DOM.liveAcc.textContent = acc;

    DOM.results.style.display = "block";
    DOM.hints.style.display = "none";
  }

  function resetTest() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.timerRunning = false;
    state.timerFinished = false;
    state.timeRemaining = state.timerDuration;
    state.startTime = null;
    DOM.liveTimer.textContent = state.timerDuration;
    DOM.liveWpm.textContent = "0";
    DOM.liveAcc.textContent = "100";
    DOM.results.style.display = "none";
    DOM.hints.style.display = "block";
    renderChars();
    DOM.wordsArea.focus();
  }

  function restart() {
    resetTest();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
