(function() {
  var doc = document;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit(pre) {
    var body = pre.parentElement;
    function doFit() {
      var w = body.clientWidth * 0.72;
      var h = body.clientHeight * 0.72;
      if (!w || !h) return;
      var lines = pre.textContent.split('\n');
      var n = lines.length;
      var cw = 0;
      lines.forEach(function(l) { cw = Math.max(cw, l.length); });
      pre.style.fontSize = '12px';
      pre.style.transform = 'none';
      var tw = cw * 7.2;
      var th = n * 13.2;
      var s = Math.min(w / tw, h / th, 1);
      if (s < 1) {
        pre.style.transformOrigin = 'center center';
        pre.style.transform = 'scale(' + s + ')';
      }
    }
    doFit();
    window.addEventListener('resize', doFit);
  }

  var arts = doc.querySelectorAll('.cover-art');
  for (var i = 0; i < arts.length; i++) fit(arts[i]);

  /* filter: author toggles + search */
  var grid = doc.getElementById('cover-grid');
  var search = doc.getElementById('novels-search');
  if (!grid || !search) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.cover-card'));
  var btns = doc.querySelectorAll('.author-btn');
  var activeAuthor = 'all';

  function apply() {
    var q = (search.value || '').toLowerCase().trim();
    var shown = 0;
    cards.forEach(function(c) {
      var okAuthor = activeAuthor === 'all' || c.getAttribute('data-author') === activeAuthor;
      var okSearch = !q || (c.getAttribute('data-title') || '').indexOf(q) >= 0;
      var show = okAuthor && okSearch;
      c.classList.toggle('hidden', !show);
      if (show) shown++;
    });
  }

  for (var b = 0; b < btns.length; b++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var k = 0; k < btns.length; k++) btns[k].classList.remove('active');
        btn.classList.add('active');
        activeAuthor = btn.getAttribute('data-author');
        apply();
      });
    })(btns[b]);
  }
  search.addEventListener('input', apply);
  apply();
})();