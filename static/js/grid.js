(function() {
  var c = document.getElementById('grid-canvas');
  if (!c) return;

  var ctx = c.getContext('2d');
  var mx = -9999, my = -9999, lmx = -9999, lmy = -9999;
  var pts = [];
  var SPACING = 55;
  var RADIUS = 140;
  var STRENGTH = 1;
  var DAMP = 0.88;
  var SPRING = 0.04;

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      fade: cs.getPropertyValue('--grid-fade').trim() || '#0a0a0a',
      line: cs.getPropertyValue('--grid-line').trim() || 'rgba(0,0,0,0.06)',
      dot: cs.getPropertyValue('--grid-dot').trim() || 'rgba(0,0,0,0.2)',
    };
  }
  var clr = colors();
  var themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() { clr = colors(); });
  }

  function resize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    build();
  }

  function build() {
    pts = [];
    var cols = Math.ceil(c.width / SPACING) + 2;
    var rows = Math.ceil(c.height / SPACING) + 2;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        pts.push({
          ox: col * SPACING,
          oy: r * SPACING,
          x: col * SPACING,
          y: r * SPACING,
          vx: 0, vy: 0,
        });
      }
    }
  }

  function draw() {
    var w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // hex to rgba helper
    function hexAlpha(hex, a) {
      var r = parseInt(hex.slice(1,3), 16);
      var g = parseInt(hex.slice(3,5), 16);
      var b = parseInt(hex.slice(5,7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, clr.fade);
    grad.addColorStop(0.12, hexAlpha(clr.fade, 0));
    grad.addColorStop(0.88, hexAlpha(clr.fade, 0));
    grad.addColorStop(1, clr.fade);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var cols = Math.ceil(w / SPACING) + 2;
    var rows_n = Math.ceil(h / SPACING) + 2;

    ctx.strokeStyle = clr.line;
    ctx.lineWidth = 1;
    for (var col = 0; col < cols; col++) {
      ctx.beginPath();
      for (var r = 0; r < rows_n; r++) {
        var idx = r * cols + col;
        if (idx >= pts.length) break;
        var p = pts[idx];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (var r = 0; r < rows_n; r++) {
      ctx.beginPath();
      for (var col = 0; col < cols; col++) {
        var idx = r * cols + col;
        if (idx >= pts.length) break;
        var p = pts[idx];
        if (col === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = clr.dot;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pushAt(cx, cy) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var dx = p.ox - cx;
      var dy = p.oy - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 1) {
        var force = (1 - dist / RADIUS) * STRENGTH;
        var angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }
    }
  }

  function tick() {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var dx = p.ox - mx;
      var dy = p.oy - my;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < RADIUS && dist > 1) {
        var force = (1 - dist / RADIUS) * 0.3;
        var angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }
      p.vx += (p.ox - p.x) * SPRING;
      p.vy += (p.oy - p.y) * SPRING;
      p.vx *= DAMP;
      p.vy *= DAMP;
      p.x += p.vx;
      p.y += p.vy;
    }

    draw();
    requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', function(e) {
    var nx = e.clientX, ny = e.clientY;
    var step = 8;
    var dx = nx - lmx;
    var dy = ny - lmy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > step) {
      var steps = Math.ceil(d / step);
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        pushAt(lmx + dx * t, lmy + dy * t);
      }
    } else {
      pushAt(nx, ny);
    }
    lmx = mx = nx;
    lmy = my = ny;
  });

  window.addEventListener('resize', resize);
  resize();
  tick();
})();
