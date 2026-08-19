(() => {
  'use strict';

  const c = document.getElementById('bg-canvas');
  if (!c) return;

  const ctx = c.getContext('2d');
  let mx = -9999, my = -9999, lmx = -9999, lmy = -9999;
  let pts = [];
  const SPACING = 55;
  const RADIUS = 120;
  const STRENGTH = 0.4;
  const DAMP = 0.88;
  const SPRING = 0.04;

  const cs = getComputedStyle(document.documentElement);
  const clr = {
    fade: cs.getPropertyValue('--canvas-fade').trim() || '#08080a',
    line: cs.getPropertyValue('--canvas-line').trim() || 'rgba(150, 170, 220, 0.05)',
    dot: cs.getPropertyValue('--canvas-dot').trim() || 'rgba(150, 170, 220, 0.20)',
  };

  function resize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    build();
  }

  function build() {
    pts = [];
    const cols = Math.ceil(c.width / SPACING) + 2;
    const rows = Math.ceil(c.height / SPACING) + 2;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
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

  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function draw() {
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, clr.fade);
    grad.addColorStop(0.12, hexAlpha(clr.fade, 0));
    grad.addColorStop(0.88, hexAlpha(clr.fade, 0));
    grad.addColorStop(1, clr.fade);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / SPACING) + 2;
    const rows_n = Math.ceil(h / SPACING) + 2;

    ctx.strokeStyle = clr.line;
    ctx.lineWidth = 1;
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      for (let r = 0; r < rows_n; r++) {
        const idx = r * cols + col;
        if (idx >= pts.length) break;
        const p = pts[idx];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let r = 0; r < rows_n; r++) {
      ctx.beginPath();
      for (let col = 0; col < cols; col++) {
        const idx = r * cols + col;
        if (idx >= pts.length) break;
        const p = pts[idx];
        if (col === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = clr.dot;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pushAt(cx, cy) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = p.ox - cx;
      const dy = p.oy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RADIUS && dist > 1) {
        const force = (1 - dist / RADIUS) * STRENGTH;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }
    }
  }

  function tick() {
    const now = performance.now();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = p.ox - mx;
      const dy = p.oy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < RADIUS && dist > 1) {
        const force = (1 - dist / RADIUS) * 0.12;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }
      const ax = p.ox + Math.sin(now * 0.001 + p.ox * 0.02) * 7;
      const ay = p.oy + Math.cos(now * 0.0012 + p.oy * 0.02) * 7;
      p.vx += (ax - p.x) * SPRING;
      p.vy += (ay - p.y) * SPRING;
      p.vx *= DAMP;
      p.vy *= DAMP;
      p.x += p.vx;
      p.y += p.vy;
    }

    draw();
    requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', (e) => {
    const nx = e.clientX, ny = e.clientY;
    const step = 8;
    const dx = nx - lmx;
    const dy = ny - lmy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > step) {
      const steps = Math.ceil(d / step);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
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
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw();
    return;
  }
  tick();
})();