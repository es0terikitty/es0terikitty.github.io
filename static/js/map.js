(function() {
  'use strict';

  var canvas = document.getElementById('map-canvas');
  var wrap = document.querySelector('.map-wrap');
  var statusEl = document.getElementById('map-status');
  if (!canvas || !wrap || !statusEl) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var col = readColors();
  var places = null;
  var borders = null;
  var landPath = null;      // Path2D of all land, in world coords
  var strokePath = null;    // Path2D of all borders, in world coords

  var W = 360, H = 180;     // world size, degrees
  var scale = 1, offX = 0, offY = 0;
  var minScale = 0.5, maxScale = 60;
  var screenLabels = [];    // last frame: [{x,y,label,alpha}]
  var hovered = null;
  var anim = null;

  // pointer state
  var pointers = {};
  var drag = { down: false, lastX: 0, lastY: 0, moved: false, pinchDist: 0, pinchScale: 1 };

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      ocean: cs.getPropertyValue('--bg-panel').trim() || '#0b1120',
      land: cs.getPropertyValue('--bg-panel-alt').trim() || '#111b30',
      border: cs.getPropertyValue('--accent-dim').trim() || '#93c5fd',
      graticule: cs.getPropertyValue('--border').trim() || '#1e2b47',
      accent: cs.getPropertyValue('--accent').trim() || '#3b82f6',
      accentDim: cs.getPropertyValue('--accent-dim').trim() || '#93c5fd',
      fgDim: cs.getPropertyValue('--fg-dim').trim() || '#90a6c7',
      fgMuted: cs.getPropertyValue('--fg-muted').trim() || '#4d6288',
    };
  }

  function hexToRgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function fit() {
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (!cw || !ch) return;
    scale = Math.min(cw / W, ch / H, maxScale);
    offX = (cw - W * scale) / 2;
    offY = (ch - H * scale) / 2;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function clampPan() {
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    var m = 100;
    offX = clamp(offX, cw - W * scale - m, m);
    offY = clamp(offY, ch - H * scale - m, m);
  }
  function sx(lng) { return (lng + 180) * scale + offX; }
  function sy(lat) { return (90 - lat) * scale + offY; }

  function buildPaths() {
    if (!borders || !borders.features) return;
    landPath = new Path2D();
    strokePath = new Path2D();
    borders.features.forEach(function(f) {
      var g = f.geometry;
      if (!g) return;
      var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach(function(rings) {
        rings.forEach(function(ring, ri) {
          var path = new Path2D();
          ring.forEach(function(pt, i) {
            var x = pt[0] + 180, y = 90 - pt[1];
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
          path.closePath();
          landPath.addPath(path);
          if (ri === 0) strokePath.addPath(path);
        });
      });
    });
  }

  // --- Drawing -------------------------------------------------------------
  function draw() {
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (!cw || !ch) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }

    // base: ocean
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.ocean;
    ctx.fillRect(0, 0, cw, ch);

    // world layer (plain map) in world coordinates
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    // faint graticule, under the land
    ctx.lineWidth = 0.5 / scale;
    ctx.strokeStyle = hexToRgba(col.graticule, 0.6);
    ctx.beginPath();
    for (var gL = -180; gL <= 180; gL += 15) {
      ctx.moveTo(gL + 180, 0); ctx.lineTo(gL + 180, H);
    }
    for (var gT = -90; gT <= 90; gT += 15) {
      ctx.moveTo(0, 90 - gT); ctx.lineTo(W, 90 - gT);
    }
    ctx.stroke();
    if (landPath) {
      ctx.fillStyle = col.land;
      ctx.fill(landPath);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.2 / scale;
      ctx.strokeStyle = hexToRgba(col.border, 0.65);
      ctx.stroke(strokePath);
    }

    // labels in screen pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(cw, ch);
    ctx.globalAlpha = 1;
  }

  function drawLabels(cw, ch) {
    if (!places) return;
    function ramp(x, lo, hi) { return clamp((x - lo) / (hi - lo), 0, 1); }
    var countryFade = ramp(scale, 3.0, 4.5) * (1 - ramp(scale, 13, 15));
    var stateFade = ramp(scale, 4.5, 6.5);
    if (countryFade <= 0 && stateFade <= 0) { screenLabels = []; return; }

    var countrySize = clamp(10.5 - (scale - 3) * 0.15, 8, 10.5);
    var stateSize = clamp(8.5 + (scale - 5) * 0.12, 8.5, 11);
    screenLabels = [];
    var i, L, p, alpha, drawn = [];

    function within(x, y) { return x > -50 && x < cw + 50 && y > -50 && y < ch + 50; }
    function declutter(x, y, minDist) {
      for (var i = 0; i < drawn.length; i++) {
        var dx = drawn[i][0] - x, dy = drawn[i][1] - y;
        if (dx * dx + dy * dy < minDist * minDist) return true;
      }
      return false;
    }

    // countries
    if (countryFade > 0) {
      ctx.font = countrySize + 'px MapleMono, monospace';
      L = places.countries;
      for (i = 0; i < L.length; i++) {
        p = { x: sx(L[i].lng), y: sy(L[i].lat) };
        if (!within(p.x, p.y) || declutter(p.x, p.y, 30)) continue;
        alpha = L[i].key === hoveringKey() ? 1 : countryFade;
        drawLabel(L[i], p, alpha, 'country', countrySize);
        drawn.push([p.x, p.y]);
      }
    }

    // states
    if (stateFade > 0) {
      ctx.font = stateSize + 'px MapleMono, monospace';
      L = places.states;
      for (i = 0; i < L.length; i++) {
        p = { x: sx(L[i].lng), y: sy(L[i].lat) };
        if (!within(p.x, p.y) || declutter(p.x, p.y, 24)) continue;
        alpha = L[i].key === hoveringKey() ? 1 : stateFade;
        drawLabel(L[i], p, alpha, 'state', stateSize);
        drawn.push([p.x, p.y]);
      }
    }
  }

  function hoveringKey() { return hovered ? hovered.key : null; }

  function drawLabel(label, p, alpha, type, size) {
    var isHover = hovered === label;
    var text = label.name + ' · ' + label.capital;
    var isCountry = type === 'country';
    ctx.globalAlpha = isHover ? 1 : alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = size + 'px MapleMono, monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(text, p.x + 1, p.y - 4 + 1);
    ctx.fillStyle = isHover ? col.accent : (isCountry ? col.accent : col.fgDim);
    ctx.fillText(text, p.x, p.y - 4);
    ctx.fillStyle = isHover ? col.accent : (isCountry ? hexToRgba(col.accentDim, 0.85) : col.fgMuted);
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, isHover ? 3.5 : (isCountry ? 2.2 : 1.6), 0, Math.PI * 2);
    ctx.fill();
    if (alpha > 0.15) {
      screenLabels.push({ x: p.x, y: p.y, label: label, alpha: alpha });
    }
  }

  // --- Interaction ---------------------------------------------------------
  function onPointerDown(e) {
    var r = wrap.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    pointers[e.pointerId] = { x: x, y: y };
    if (Object.keys(pointers).length === 2) {
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]], b = pointers[ids[1]];
      drag.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      drag.pinchScale = scale;
      drag.down = false;
      anim = null;
    } else {
      drag.down = true;
      drag.lastX = x; drag.lastY = y;
      drag.moved = false;
      anim = null;
    }
    canvas.setPointerCapture && (function() { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} })();
  }

  function onPointerMove(e) {
    var r = wrap.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: x, y: y };

    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.pinchDist > 0) {
        var ns = clamp(drag.pinchScale * (dist / drag.pinchDist), minScale, maxScale);
        var mpx = (a.x + b.x) / 2, mpy = (a.y + b.y) / 2;
        zoomAt(mpx, mpy, ns);
      }
      return;
    }
    if (!drag.down) return;
    var dx = x - drag.lastX, dy = y - drag.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      offX += dx; offY += dy;
      clampPan();
    }
    drag.lastX = x; drag.lastY = y;
  }

  function onPointerUp(e) {
    var r = wrap.getBoundingClientRect();
    if (drag.down && !drag.moved) {
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var hit = null, best = 900, d;
      for (var i = 0; i < screenLabels.length; i++) {
        d = Math.hypot(screenLabels[i].x - x, screenLabels[i].y - y);
        if (d < best) { best = d; hit = screenLabels[i].label; }
      }
      if (hit && best < 20) focus(hit);
    }
    drag.down = false;
    delete pointers[e.pointerId];
    drag.pinchDist = 0;
  }

  function zoomAt(mx, my, newScale) {
    newScale = clamp(newScale, minScale, maxScale);
    var k = newScale / scale;
    offX = mx - (mx - offX) * k;
    offY = my - (my - offY) * k;
    scale = newScale;
    clampPan();
  }

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var r = wrap.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
    zoomAt(mx, my, scale * factor);
  }, { passive: false });

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // hover
  var hx = -9999, hy = -9999;
  canvas.addEventListener('pointermove', function(e) {
    var r = wrap.getBoundingClientRect();
    hx = e.clientX - r.left; hy = e.clientY - r.top;
  });
  setInterval(function() {
    var key = null, best = 900, d;
    for (var i = 0; i < screenLabels.length; i++) {
      if (screenLabels[i].alpha < 0.2) continue;
      d = Math.hypot(screenLabels[i].x - hx, screenLabels[i].y - hy);
      if (d < best) { best = d; key = screenLabels[i].label; }
    }
    if (best > 18) key = null;
    if (key !== hovered) {
      hovered = key;
      canvas.style.cursor = key ? 'pointer' : 'grab';
    }
  }, 60);

  // --- Focus animation -----------------------------------------------------
  function focus(label) {
    statusEl.textContent = label.name + ' — ' + label.capital;
    var targetScale = 8;
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    var toScale = clamp(targetScale, minScale, maxScale);
    var toX = cw / 2 - (label.lng + 180) * toScale;
    var toY = ch / 2 - (90 - label.lat) * toScale;
    if (reduced) {
      scale = toScale; offX = toX; offY = toY; clampPan();
      return;
    }
    var from = { s: scale, x: offX, y: offY };
    var t0 = performance.now(), dur = 800;
    anim = { from: from, to: { s: toScale, x: toX, y: toY }, t0: t0, dur: dur };
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function tick() {
    if (anim) {
      var t = (performance.now() - anim.t0) / anim.dur;
      if (t >= 1) {
        scale = anim.to.s; offX = anim.to.x; offY = anim.to.y;
        anim = null;
      } else {
        var e = ease(t);
        scale = anim.from.s + (anim.to.s - anim.from.s) * e;
        offX = anim.from.x + (anim.to.x - anim.from.x) * e;
        offY = anim.from.y + (anim.to.y - anim.from.y) * e;
      }
      clampPan();
    }
    draw();
    requestAnimationFrame(tick);
  }

  // --- Setup ---------------------------------------------------------------
  fit();
  var ro = new ResizeObserver(function() {
    fit();
  });
  ro.observe(wrap);
  document.addEventListener('themechange', function() {
    col = readColors();
  });

  Promise.all([
    fetch('/data/places.json').then(function(r) { if (!r.ok) throw 0; return r.json(); }),
    fetch('/vendor/ne_110m_admin_0_countries.geojson').then(function(r) { if (!r.ok) throw 0; return r.json(); })
  ]).then(function(res) {
    var data = res[0];
    borders = res[1];
    places = {
      countries: data.countries.map(function(c, i) {
        return { key: 'c' + i, name: c.name, capital: c.capital, lat: c.lat, lng: c.lng };
      }),
      states: data.states.map(function(s, i) {
        return { key: 's' + i, name: s.name, capital: s.capital, lat: s.lat, lng: s.lng };
      }),
    };
    buildPaths();
    statusEl.textContent = 'ready — ' + data.countries.length + ' countries, ' + data.states.length + ' states';
  }).catch(function() {
    statusEl.textContent = 'couldn\'t load place data';
  });

  tick();
})();
