(function() {
  var c = document.getElementById('grid-canvas');
  if (!c) return;

  var ctx = c.getContext('2d');
  var mx = -9999, my = -9999;
  var pts = [];
  var SPACING = 55;
  var RADIUS = 140;
  var STRENGTH = 18;
  var DAMP = 0.88;
  var SPRING = 0.04;

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

    // slight fade at top and bottom
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(15,15,15,1)');
    grad.addColorStop(0.12, 'rgba(15,15,15,0)');
    grad.addColorStop(0.88, 'rgba(15,15,15,0)');
    grad.addColorStop(1, 'rgba(15,15,15,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var cols = Math.ceil(w / SPACING) + 2;
    var rows_n = Math.ceil(h / SPACING) + 2;

    // vertical lines
    ctx.strokeStyle = 'rgba(255, 140, 26, 0.06)';
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

    // horizontal lines
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

    // dots at vertices
    ctx.fillStyle = 'rgba(255, 140, 26, 0.25)';
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var dx = p.ox - mx;
      var dy = p.oy - my;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 1) {
        var force = (1 - dist / RADIUS) * STRENGTH;
        var angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force * 0.15;
        p.vy += Math.sin(angle) * force * 0.15;
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
    mx = e.clientX;
    my = e.clientY;
  });

  window.addEventListener('resize', resize);
  resize();
  tick();
})();
