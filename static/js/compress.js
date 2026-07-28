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

  qualitySlider.addEventListener('input', updateSliderEstimate);

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
    updateSliderEstimate();
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
        + '<span class="compress-file-name">' + f.name + '</span>'
        + '<span class="compress-file-size">' + formatSize(f.size) + '</span>'
        + '<button class="compress-file-remove" data-i="' + i + '">✕</button>';
      filesList.appendChild(div);
    }
    document.querySelectorAll('.compress-file-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-i'));
        files.splice(idx, 1);
        renderFiles();
        updateFormatVisibility();
        updateTotalSize();
        updateSliderEstimate();
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
    if (hasPdf && !hasImage) {
      formatRow.style.display = 'none';
    } else {
      formatRow.style.display = '';
    }
    compressBtn.disabled = files.length === 0;
  }

  function estimateSize(quality) {
    if (totalOriginalSize === 0) return 0;
    var q = quality / 100;
    var ratio = 0.04 + 0.96 * Math.pow(q, 2.8);
    return Math.round(totalOriginalSize * ratio);
  }

  function updateSliderEstimate() {
    qualityVal.textContent = qualitySlider.value + '%';
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      + '<span class="compress-result-name">' + file.name + '</span>'
      + '<span class="compress-result-before">' + formatSize(file.size) + '</span>'
      + '<span class="compress-result-arrow">→</span>'
      + '<span class="compress-result-after">…</span>'
      + '</div>';
    results.appendChild(block);

    if (isPdf) {
      compressPdf(file, quality).then(function(result) {
        finishResult(block, file.name, file.size, result, compressedResults);
        processNext(idx + 1, compressedResults);
      }).catch(function(err) {
        block.querySelector('.compress-result-after').textContent = 'error';
        block.className += ' compress-result-error';
        processNext(idx + 1, compressedResults);
      });
    } else {
      var fmt = formatSelect.value;
      compressImage(file, quality, fmt).then(function(result) {
        finishResult(block, changeExt(file.name, fmt === 'original' ? ext : fmt), file.size, result, compressedResults);
        processNext(idx + 1, compressedResults);
      }).catch(function(err) {
        block.querySelector('.compress-result-after').textContent = 'error';
        block.className += ' compress-result-error';
        processNext(idx + 1, compressedResults);
      });
    }
  }

  function finishResult(block, name, originalSize, result, compressedResults) {
    var ratio = ((result.size / originalSize) * 100).toFixed(1);
    block.querySelector('.compress-result-after').textContent = formatSize(result.size) + ' (' + ratio + '%)';
    result.displayName = name;
    compressedResults.push(result);
  }

  function renderDownloadAll(compressedResults) {
    if (compressedResults.length === 0) return;

    var wrap = document.createElement('div');
    wrap.className = 'compress-download-area';

    for (var i = 0; i < compressedResults.length; i++) {
      var r = compressedResults[i];
      var btn = document.createElement('a');
      btn.href = r.url;
      btn.download = r.displayName;
      btn.className = 'compress-dl-btn';
      btn.textContent = 'download ' + r.displayName;
      wrap.appendChild(btn);
    }

    if (compressedResults.length > 1) {
      var dlAll = document.createElement('button');
      dlAll.className = 'compress-dl-all';
      dlAll.textContent = 'download all (' + compressedResults.length + ' files)';
      dlAll.addEventListener('click', function() {
        for (var i = 0; i < compressedResults.length; i++) {
          var a = document.createElement('a');
          a.href = compressedResults[i].url;
          a.download = compressedResults[i].displayName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
      wrap.appendChild(dlAll);
    }

    results.appendChild(wrap);
  }

  function changeExt(name, newExt) {
    var parts = name.split('.');
    parts.pop();
    return parts.join('.') + '.' + newExt;
  }

  function compressImage(file, quality, format) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var mimeType = 'image/jpeg';
          if (format === 'png') mimeType = 'image/png';
          else if (format === 'webp') mimeType = 'image/webp';
          else if (format === 'original') {
            if (file.type === 'image/png') mimeType = 'image/png';
            else if (file.type === 'image/webp') mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
          }
          canvas.toBlob(function(blob) {
            if (!blob) { reject(new Error('compression failed')); return; }
            resolve({
              size: blob.size,
              url: URL.createObjectURL(blob)
            });
          }, mimeType, quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressPdf(file, quality) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var url = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        loadScript(url).then(function() {
          var PDFLib = window.PDFLib;
          var arrayBuffer = e.target.result;
          PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true }).then(function(pdfDoc) {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('');
            pdfDoc.setCreator('');
            var promises = [];
            var pages = pdfDoc.getPages();
            for (var i = 0; i < pages.length; i++) {
              promises.push(pages[i].node.normalize());
            }
            Promise.all(promises).then(function() {
              pdfDoc.save({ useObjectStreams: true }).then(function(compressedBytes) {
                var blob = new Blob([compressedBytes], { type: 'application/pdf' });
                resolve({
                  size: blob.size,
                  url: URL.createObjectURL(blob)
                });
              });
            });
          }).catch(reject);
        }).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
