(function() {
  'use strict';

  var viz = document.getElementById('globe-viz');
  var overlay = document.getElementById('globe-overlay');
  var wrap = document.querySelector('.globe-wrap');
  var statusEl = document.getElementById('globe-status');
  if (!viz || !overlay || !wrap || !window.Globe) {
    if (statusEl) statusEl.textContent = 'globe unavailable';
    return;
  }

  // --- WebGL check ---------------------------------------------------------
  var probe = document.createElement('canvas');
  var gl = probe.getContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  if (!gl) {
    statusEl.textContent = 'webgl not supported in this browser';
    return;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var labels = null;
  var borders = null;
  var altitude = 2.5;
  var col = readColors();
  var flyMs = reduced ? 0 : 900;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    return {
      accent: cs.getPropertyValue('--accent').trim() || '#3b82f6',
      accentDim: cs.getPropertyValue('--accent-dim').trim() || '#93c5fd',
      fgDim: cs.getPropertyValue('--fg-dim').trim() || '#90a6c7',
      fgMuted: cs.getPropertyValue('--fg-muted').trim() || '#4d6288',
      shadow: cs.getPropertyValue('--bg-panel').trim() || '#0b1120',
    };
  }

  function hexToRgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // --- Globe ---------------------------------------------------------------
  var globe;
  try {
    globe = new Globe(viz, { rendererConfig: { antialias: true, alpha: true } });
  } catch (e) {
    statusEl.textContent = 'webgl not supported in this browser';
    return;
  }
  globe
    .globeImageUrl('/vendor/earth-night.jpg')
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor(hexToRgba(col.accent, 0.4))
    .atmosphereAltitude(0.18)
    .showGraticules(false);

  var controls = globe.controls();
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.7;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 1.12;
  controls.maxDistance = 7;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;

  // pause auto-rotate while interacting, resume after idle
  var resumeTimer = null;
  function userInteracted() {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
    if (!reduced) {
      resumeTimer = setTimeout(function() { controls.autoRotate = true; }, 1600);
    }
  }
  controls.addEventListener('start', userInteracted);

  globe.onZoom(function(pov) { altitude = pov.altitude; });

  // --- Sizing --------------------------------------------------------------
  function size() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (w && h) globe.width(w).height(h);
  }
  size();
  var ro = new ResizeObserver(size);
  ro.observe(wrap);
  document.addEventListener('themechange', applyTheme);
  window.addEventListener('resize', size);

  function applyTheme() {
    col = readColors();
    globe.atmosphereColor(hexToRgba(col.accent, 0.4));
    if (borders && globe) {
      globe.polygonStrokeColor(function() { return hexToRgba(col.accentDim, 0.35); });
    }
  }

  // --- Data ----------------------------------------------------------------
  Promise.all([
    fetch('/data/places.json').then(function(r) { if (!r.ok) throw 0; return r.json(); }),
    fetch('/vendor/ne_110m_admin_0_countries.geojson').then(function(r) { if (!r.ok) throw 0; return r.json(); })
  ]).then(function(res) {
    var data = res[0];
    borders = res[1];
    labels = {
      countries: data.countries.map(function(c, i) {
        return { key: 'c' + i, name: c.name, capital: c.capital, lat: c.lat, lng: c.lng };
      }),
      states: data.states.map(function(s, i) {
        return { key: 's' + i, name: s.name, capital: s.capital, lat: s.lat, lng: s.lng, country: s.country };
      }),
    };
    statusEl.textContent = 'ready — ' + data.countries.length + ' countries, ' + data.states.length + ' states';
    if (borders && borders.features) {
      globe
        .polygonsData(borders.features)
        .polygonGeoJsonGeometry(function(d) { return d.geometry; })
        .polygonCapColor(function() { return 'rgba(0,0,0,0)'; })
        .polygonSideColor(function() { return 'rgba(0,0,0,0)'; })
        .polygonStrokeColor(function() { return hexToRgba(col.accentDim, 0.35); })
        .polygonAltitude(0.004)
        .polygonCapCurvatureResolution(4)
        .polygonsTransitionDuration(0);
    }
  }).catch(function() {
    statusEl.textContent = 'couldn\'t load place data';
  });

  // --- Overlay label rendering --------------------------------------------
  var ctx = overlay.getContext('2d');
  var camPos = { x: 0, y: 0, z: 0 };
  var tmpPos = { x: 0, y: 0, z: 0 };
  var screen = []; // [{x,y,visible}]
  var hovered = null;
  var hoveringKey = null;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function project(lat, lng) {
    var c = globe.getCoords(lat, lng);
    tmpPos.x = c.x; tmpPos.y = c.y; tmpPos.z = c.z;
    // front-facing if outward normal points toward the camera
    var facing = tmpPos.x * camPos.x + tmpPos.y * camPos.y + tmpPos.z * camPos.z > 0;
    var s = globe.getScreenCoords(lat, lng);
    return { x: s.x, y: s.y, facing: facing };
  }

  function draw() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (w === 0 || h === 0 || !labels) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (overlay.width !== pw || overlay.height !== ph) {
      overlay.width = pw;
      overlay.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cam = globe.camera();
    camPos.x = cam.position.x;
    camPos.y = cam.position.y;
    camPos.z = cam.position.z;

    // state labels fade in as we zoom toward the surface
    var stateFade = clamp((1.65 - altitude) / 0.55, 0, 1);
    // country labels thin out when we're close to the ground
    var countryKeep = clamp((altitude - 1.15) / 0.8, 0, 1);
    if (countryKeep <= 0 && stateFade <= 0) return;

    var countrySize = clamp(10 + (2.5 - altitude) * 1.6, 7.5, 13);
    var stateSize = clamp(9 + (1.6 - altitude) * 2, 7, 10.5);

    screen.length = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = countrySize + 'px MapleMono, monospace';

    // countries
    var i, L, p, alpha;
    L = labels.countries;
    for (i = 0; i < L.length; i++) {
      p = project(L[i].lat, L[i].lng);
      if (!p.facing || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
        screen.push({ x: p.x, y: p.y, visible: false });
        continue;
      }
      alpha = countryKeep;
      if (L[i].key === hoveringKey) alpha = 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = hexToRgba(col.shadow, 0.9);
      ctx.fillText(L[i].name + ' · ' + L[i].capital, p.x, p.y - 5);
      ctx.fillStyle = hovered === L[i] ? col.accent : hexToRgba(col.accent, alpha);
      ctx.fillText(L[i].name + ' · ' + L[i].capital, p.x, p.y - 5);
      ctx.fillStyle = hovered === L[i] ? col.accent : hexToRgba(col.accentDim, clamp(alpha, 0.25, 1) * 0.9);
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, hovered === L[i] ? 3 : 1.6, 0, Math.PI * 2);
      ctx.fill();
      screen.push({ x: p.x, y: p.y, visible: true, label: L[i] });
    }

    // states
    if (stateFade > 0) {
      ctx.font = stateSize + 'px MapleMono, monospace';
      L = labels.states;
      for (i = 0; i < L.length; i++) {
        p = project(L[i].lat, L[i].lng);
        if (!p.facing || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
          screen.push({ x: p.x, y: p.y, visible: false });
          continue;
        }
        alpha = stateFade;
        if (L[i].key === hoveringKey) alpha = 1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hexToRgba(col.shadow, 0.85);
        ctx.fillText(L[i].name + ' · ' + L[i].capital, p.x, p.y - 4);
        ctx.fillStyle = hovered === L[i] ? col.accent : col.fgDim;
        ctx.fillText(L[i].name + ' · ' + L[i].capital, p.x, p.y - 4);
        ctx.fillStyle = hovered === L[i] ? col.accent : col.fgMuted;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 2, hovered === L[i] ? 2.6 : 1.3, 0, Math.PI * 2);
        ctx.fill();
        screen.push({ x: p.x, y: p.y, visible: true, label: L[i] });
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- Interaction (hover + click-to-fly) ---------------------------------
  var px = 0, py = 0, down = false, moved = false;

  wrap.addEventListener('pointermove', function(e) {
    var rect = wrap.getBoundingClientRect();
    px = e.clientX - rect.left;
    py = e.clientY - rect.top;
  });

  wrap.addEventListener('pointerdown', function(e) {
    down = true; moved = false;
  });

  wrap.addEventListener('pointermove', function(e) {
    if (down) {
      var dx = e.movementX || 0, dy = e.movementY || 0;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    }
  });

  wrap.addEventListener('pointerup', function(e) {
    if (down && !moved) {
      var rect = wrap.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var hit = null, best = 900, d;
      for (var i = 0; i < screen.length; i++) {
        if (!screen[i].visible) continue;
        d = Math.hypot(screen[i].x - x, screen[i].y - y);
        if (d < best) { best = d; hit = screen[i].label; }
      }
      if (hit && best < 22) {
        statusEl.textContent = hit.name + ' — ' + hit.capital;
        globe.pointOfView({ lat: hit.lat, lng: hit.lng, altitude: 1.2 }, flyMs);
      }
    }
    down = false;
  });

  // hover hit-test against last drawn frame
  setInterval(function() {
    var key = null, best = 900, d;
    for (var i = 0; i < screen.length; i++) {
      if (!screen[i].visible) continue;
      d = Math.hypot(screen[i].x - px, screen[i].y - py);
      if (d < best) { best = d; key = screen[i].label; }
    }
    if (best > 16) key = null;
    if (key !== hovered) {
      hovered = key;
      hoveringKey = key ? key.key : null;
      wrap.style.cursor = key ? 'pointer' : 'grab';
    }
  }, 60);

  // --- Draw loop -----------------------------------------------------------
  function frame() {
    draw();
    requestAnimationFrame(frame);
  }
  frame();
})();
