/* Compress tool — powered by jSquash (Squoosh codecs), pdf-lib and fflate */
(function() {
  var input = document.getElementById('compress-input');
  var filesList = document.getElementById('compress-files');
  var formatSelect = document.getElementById('compress-format');
  var qualitySlider = document.getElementById('compress-quality');
  var qualityVal = document.getElementById('compress-quality-val');
  var compressBtn = document.getElementById('compress-btn');
  var results = document.getElementById('compress-results');
  var formatRow = document.getElementById('compress-format-row');
  var sliderRow = document.getElementById('compress-slider-row');

  var files = [];
  var totalOriginalSize = 0;
  var pdfLibPromise = null;

  /* ── lazy-loaded compression engines (CDN, cached by the browser) ── */

  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function getPdfLib() {
    if (!pdfLibPromise) {
      pdfLibPromise = window.PDFLib
        ? Promise.resolve(window.PDFLib)
        : loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js').then(function() { return window.PDFLib; });
    }
    return pdfLibPromise;
  }

  function getCodec(name) {
    var urls = {
      jpeg: 'https://cdn.jsdelivr.net/npm/@jsquash/jpeg@1.5.0/encode.js',
      webp: 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.3.0/encode.js',
      png: 'https://cdn.jsdelivr.net/npm/@jsquash/png@3.1.1/encode.js'
    };
    if (!getCodec.cache) getCodec.cache = {};
    if (!getCodec.cache[name]) {
      getCodec.cache[name] = import(urls[name]).catch(function(err) {
        getCodec.cache[name] = null; // allow retry, fall back to canvas
        throw err;
      });
    }
    return getCodec.cache[name];
  }

  function getFflate() {
    return import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
  }

  /* ── image pipeline: decode via browser, encode via squoosh codecs ── */

  function decodeToImageData(file) {
    return createImageBitmap(file).then(function(bmp) {
      var canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
  }

  function targetFormatFor(file, format) {
    if (format !== 'original') return format;
    var type = (file.type || '').toLowerCase();
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    return 'jpeg'; // jpg/gif/bmp default to mozjpeg
  }

  function compressImage(file, quality, format) {
    var fmt = targetFormatFor(file, format);
    var q = Math.max(1, Math.min(100, Math.round(quality * 100)));
    return decodeToImageData(file)
      .then(function(imageData) {
        return getCodec(fmt).then(function(mod) {
          var enc = mod.encode || mod.default;
          return Promise.resolve(enc(imageData, { quality: q })).then(function(bytes) {
            return new Blob([bytes], { type: 'image/' + fmt });
          });
        });
      })
      .catch(function() {
        // engine failed to load — graceful fallback to native canvas encoder
        return canvasEncode(file, fmt === 'jpeg' ? 'image/jpeg' : 'image/' + fmt, quality);
      });
  }

  function canvasEncode(file, mimeType, quality) {
    return decodeToImageData(file).then(function(imageData) {
      var canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext('2d').putImageData(imageData, 0, 0);
      return new Promise(function(resolve, reject) {
        canvas.toBlob(function(blob) {
          blob ? resolve(blob) : reject(new Error('encode failed'));
        }, mimeType, quality);
      });
    });
  }

  /* ── pdf pipeline: metadata strip + object-stream rewrite (pdf-lib) ── */

  function compressPdf(file) {
    return getPdfLib().then(function(PDFLib) {
      return file.arrayBuffer().then(function(buf) {
        return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false }).then(function(doc) {
          doc.setTitle('');
          doc.setAuthor('');
          doc.setSubject('');
          doc.setKeywords([]);
          doc.setProducer('');
          doc.setCreator('');
          return doc.save({ useObjectStreams: true, addDefaultPage: false });
        }).then(function(bytes) {
          return new Blob([bytes], { type: 'application/pdf' });
        });
      });
    });
  }

  /* ── ui wiring (unchanged behaviour, same look) ── */

  qualitySlider.addEventListener('input', function() {
    qualityVal.textContent = qualitySlider.value + '%';
  });

  input.addEventListener('change', function(e) {
    addFiles(e.target.files);
    input.value = '';
  });

  function addFiles(newFiles) {
    for (var i = 0; i < newFiles.length; i++) {
      files.push(newFiles[i]);
    }
    renderFiles();
    updateFormatVisibility();
    updateTotalSize();
  }

  function updateTotalSize() {
    totalOriginalSize = 0;
    for (var i = 0; i < files.length; i++) {
      totalOriginalSize += files[i].size;
    }
  }

  function renderFiles() {
    filesList.innerHTML = '';
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var div = document.createElement('div');
      div.className = 'compress-file-row';
      var ext = f.name.split('.').pop().toLowerCase();
      var icon = ['jpg','jpeg','png','webp','gif','bmp','svg'].indexOf(ext) !== -1 ? '🖼' : '📄';
      div.innerHTML = '<span class="compress-file-icon">' + icon + '</span>'
        + '<span class="compress-file-name">' + escapeHtml(f.name) + '</span>'
        + '<span class="compress-file-size">' + formatSize(f.size) + '</span>'
        + '<button class="compress-file-remove" data-i="' + i + '">✕</button>';
      filesList.appendChild(div);
    }
    filesList.querySelectorAll('.compress-file-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        files.splice(parseInt(this.getAttribute('data-i')), 1);
        renderFiles();
        updateFormatVisibility();
        updateTotalSize();
      });
    });
  }

  function updateFormatVisibility() {
    var hasPdf = false;
    var hasImage = false;
    for (var i = 0; i < files.length; i++) {
      var ext = files[i].name.split('.').pop().toLowerCase();
      if (ext === 'pdf') hasPdf = true;
      else if (['jpg','jpeg','png','webp','gif','bmp'].indexOf(ext) !== -1) hasImage = true;
    }
    formatRow.style.display = (hasPdf && !hasImage) ? 'none' : '';
    compressBtn.disabled = files.length === 0;
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  compressBtn.addEventListener('click', function() {
    if (files.length === 0) return;
    compressBtn.disabled = true;
    compressBtn.textContent = 'compressing…';
    results.innerHTML = '';
    processNext(0, []);
  });

  function processNext(idx, compressedResults) {
    if (idx >= files.length) {
      compressBtn.disabled = false;
      compressBtn.textContent = 'compress';
      renderDownloadAll(compressedResults);
      return;
    }
    var file = files[idx];
    var ext = file.name.split('.').pop().toLowerCase();
    var isPdf = ext === 'pdf';
    var quality = parseInt(qualitySlider.value) / 100;

    var block = document.createElement('div');
    block.className = 'compress-result-block';
    block.innerHTML = '<div class="compress-result-info">'
      + '<span class="compress-result-name">' + escapeHtml(file.name) + '</span>'
      + '<span class="compress-result-before">' + formatSize(file.size) + '</span>'
      + '<span class="compress-result-arrow">→</span>'
      + '<span class="compress-result-after">…</span>'
      + '</div>';
    results.appendChild(block);

    var job = isPdf
      ? compressPdf(file)
      : compressImage(file, quality, formatSelect.value);

    job.then(function(blob) {
      var outName = isPdf ? file.name : changeExt(file.name, targetFormatFor(file, formatSelect.value));
      finishResult(block, outName, file.size, blob, compressedResults);
      processNext(idx + 1, compressedResults);
    }).catch(function(err) {
      console.error('compress failed:', err);
      block.querySelector('.compress-result-after').textContent = 'error';
      block.className += ' compress-result-error';
      processNext(idx + 1, compressedResults);
    });
  }

  function finishResult(block, name, originalSize, blob, compressedResults) {
    var ratio = ((blob.size / originalSize) * 100).toFixed(1);
    block.querySelector('.compress-result-after').textContent = formatSize(blob.size) + ' (' + ratio + '%)';
    compressedResults.push({
      name: name,
      blob: blob,
      url: URL.createObjectURL(blob)
    });
  }

  function renderDownloadAll(compressedResults) {
    var ok = compressedResults.filter(Boolean);
    if (ok.length === 0) return;

    var wrap = document.createElement('div');
    wrap.className = 'compress-download-area';

    for (var i = 0; i < ok.length; i++) {
      var btn = document.createElement('a');
      btn.href = ok[i].url;
      btn.download = ok[i].name;
      btn.className = 'compress-dl-btn';
      btn.textContent = 'download ' + ok[i].name;
      wrap.appendChild(btn);
    }

    if (ok.length > 1) {
      var dlAll = document.createElement('button');
      dlAll.className = 'compress-dl-all';
      dlAll.id = 'compress-dl-zip';
      dlAll.textContent = 'download all (.zip)';
      dlAll.addEventListener('click', function() {
        dlAll.disabled = true;
        dlAll.textContent = 'zipping…';
        zipAll(ok)
          .then(function(blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'compressed-' + new Date().toISOString().slice(0, 10) + '.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          })
          .finally(function() {
            dlAll.disabled = false;
            dlAll.textContent = 'download all (.zip)';
          });
      });
      wrap.appendChild(dlAll);
    }

    results.appendChild(wrap);
  }

  /* real .zip bundle via fflate */
  function zipAll(items) {
    return getFflate().then(function(fflate) {
      var entries = {};
      var pending = items.map(function(r, i) {
        // avoid name collisions inside the archive
        var key = r.name;
        if (entries[key] !== undefined) {
          var parts = r.name.split('.');
          var ext = parts.pop();
          key = parts.join('.') + '-' + (i + 1) + (ext ? '.' + ext : '');
        }
        return r.blob.arrayBuffer().then(function(buf) {
          entries[key] = new Uint8Array(buf);
        });
      });
      return Promise.all(pending).then(function() {
        return new Blob([fflate.zipSync(entries, { level: 6 })], { type: 'application/zip' });
      });
    });
  }

  function changeExt(name, newExt) {
    var parts = name.split('.');
    parts.pop();
    return parts.join('.') + '.' + newExt;
  }

  var dropZone = document.getElementById('compress-drop');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('compress-drop-active');
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('compress-drop-active');
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('compress-drop-active');
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    });
  }
})();
