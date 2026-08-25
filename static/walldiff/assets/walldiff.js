// walldiff — wallpaper recolor via gowall's exact engine.
//
// Faithful browser port of gowall v0.2.4 (github.com/Achno/gowall, MIT):
// default pipeline = Hald CLUT (level 8) with Gaussian RBF interpolation
// (sigma 50) over the theme palette. Instead of materialising the 512x512
// CLUT image we precompute the same mapping for all 64^3 quantised colours
// into a flat lookup table, which is bit-identical to what gowall produces:
//
//   identity colour for index i:   uint8(i * 255 / 63)   (Go truncates)
//   pixel -> clut index:           floor(v * 63 / 255)   per channel
//   mapping:                       rbfInterpolation(target, palette, 50)
//
// Theme palettes are transcribed verbatim from internal/image/themes.go
// (v0.2.4), keyed by the same names `gowall list` prints.

var GOWALL_THEMES = {
  "arcdark": ["#212121", "#ff5555", "#8abf50", "#ffba4d", "#3f7fff", "#888888", "#3f7fff", "#ff5555", "#464646", "#888888", "#ffba4d", "#8abf50", "#3f7fff", "#888888", "#212121"],
  "atomdark": ["#1a202c", "#cc6666", "#66cc66", "#cccc66", "#66cccc", "#cccccc", "#cc6666", "#cccc66", "#66cc66", "#66cccc", "#cccccc", "#cc6666", "#66cc66", "#cccc66", "#66cccc", "#1a202c"],
  "catppuccin": ["#f5e0dc", "#f2cdcd", "#f5c2e7", "#cba6f7", "#f38ba8", "#eba0ac", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5", "#89dceb", "#74c7ec", "#89b4fa", "#b4befe", "#cdd6f4", "#bac2de", "#a6adc8", "#9399b2", "#7f849c", "#6c7086", "#585b70", "#45475a", "#313244", "#1e1e2e", "#181825", "#11111b"],
  "cyberpunk": ["#000000", "#ff00ff", "#ffff00", "#00ffff", "#00ff00", "#ff0000", "#0000ff", "#ffa500", "#4b0082", "#ee82ee", "#87ceeb", "#ff69b4", "#8b00ff", "#ff1493", "#008080", "#ff00ff", "#00008b", "#ff4500", "#40e0d0", "#ba55d3", "#ffb6c1"],
  "dracula": ["#282a36", "#44475a", "#f8f8f2", "#6272a4", "#8be9fd", "#50fa7b", "#ffb86c", "#ff79c6", "#bd93f9", "#ff5555", "#f1fa8c"],
  "everforest": ["#232a2e", "#2d353b", "#343f44", "#3d484d", "#475258", "#4f585e", "#56635f", "#543a48", "#514045", "#425047", "#3a515d", "#4d4c43", "#d3c6aa", "#e67e80", "#e69875", "#dbbc7f", "#a7c080", "#83c092", "#7fbbb3", "#d699b6", "#7a8478", "#859289", "#9da9a0"],
  "kanagawa-kasumi": ["#ebe4cc", "#d9d1ba", "#f2bea0", "#8cbeba", "#9fba8c", "#d9a78b", "#8ab2c9", "#d195a8", "#8ba37a", "#77a3a0", "#e67e7e", "#7794a6", "#b87a8e", "#d96c6c", "#313c47", "#20272e", "#1a2026"],
  "gruvbox": ["#282828", "#1d2021", "#32302f", "#3c3836", "#504945", "#665c54", "#7c6f64", "#ebdbb2", "#fbf1c7", "#d5c4a1", "#bdae93", "#a89984", "#928374", "#cc241d", "#fb4934", "#d65d0e", "#fe8019", "#d79921", "#fabd2f", "#98971a", "#b8bb26", "#689d6a", "#8ec07c", "#458588", "#83a598", "#b16286", "#d3869b"],
  "material": ["#263238", "#ff5370", "#9c27b0", "#673ab7", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548"],
  "mizuki-akiyama": ["#ffffff", "#eee7f0", "#efd08d", "#a7dec9", "#9adde4", "#9dcee7", "#e6b6d5", "#8fd0b8", "#c8b9ca", "#7cced9", "#d9b874", "#e6a6c8", "#ff9caf", "#d8a2cb", "#7fb6d6", "#f08a9b", "#4d465c", "#1d1a2a", "#10111b"],
  "murata": ["#e5dfd9", "#e6ccb1", "#cdc5bd", "#b0cc9d", "#acc9bc", "#acc6c9", "#d1b1cc", "#d1b394", "#8fb8a7", "#8faeb1", "#91ad83", "#e58e8e", "#a69d96", "#b892b1", "#db6d6d", "#3e4042", "#252627", "#1a1b1c"],
  "monokai": ["#272822", "#f8f8f2", "#ff5555", "#ff79c6", "#bd93f9", "#50fa7b", "#ffb86c", "#f1fa8c", "#272822", "#f8f8f2", "#ff5555", "#ff79c6", "#bd93f9", "#50fa7b", "#ffb86c", "#f1fa8c"],
  "nord": ["#2e3440", "#3b4252", "#434c5e", "#4c566a", "#d8dee9", "#e5e9f0", "#eceff4", "#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac", "#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#b48ead"],
  "oceanic-next": ["#1c2228", "#e86661", "#76c373", "#f8b94f", "#668fdc", "#91979e", "#668fdc", "#e86661", "#7a8895", "#91979e", "#f8b94f", "#76c373", "#668fdc", "#91979e", "#1c2228"],
  "onedark": ["#181a1f", "#282c34", "#31353f", "#393f4a", "#3b3f4c", "#21252b", "#73b8f1", "#ebd09c", "#abb2bf", "#c678dd", "#98c379", "#d19a66", "#61afef", "#e5c07b", "#56b6c2", "#e86671", "#5c6370", "#848b98", "#2b6f77", "#993939", "#93691d", "#8a3fa0", "#31392b", "#382b2c", "#1c3448", "#2c5372"],
  "rose-pine": ["#191724", "#1f1d2e", "#26233a", "#6e6a86", "#908caa", "#e0def4", "#eb6f92", "#f6c177", "#ebbcba", "#31748f", "#9ccfd8", "#c4a7e7", "#21202e", "#403d52", "#524f67"],
  "shades-of-purple": ["#19141e", "#d1678b", "#a2c3fc", "#d177ff", "#80baf9", "#99869f", "#80baf9", "#d1678b", "#786a78", "#99869f", "#d177ff", "#a2c3fc", "#80baf9", "#99869f", "#19141e"],
  "solarized": ["#002b36", "#073642", "#586e75", "#657b83", "#839496", "#93a1a1", "#eee8d5", "#fdf6e3", "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900"],
  "srcery": ["#1c1b19", "#ef2f27", "#519f50", "#fbb829", "#2c78bf", "#e02c6d", "#0aaeb3", "#baa67f", "#918175", "#f75341", "#98bc37", "#fed06e", "#68a8e4", "#ff5c8f", "#2be4d0", "#fce8c3"],
  "sunset-aurant": ["#000000", "#ffffff", "#c990fc", "#d6e9bb", "#c8a0ef", "#c697f2", "#2fb0d7", "#d39758", "#c990fc", "#f7c4d7", "#fba5c8", "#e0931e", "#383e30", "#565f4a", "#7b866a", "#a5b490", "#f38813"],
  "sunset-saffron": ["#1d2021", "#fbf1c7", "#fe8019", "#8ec07c", "#d3869b", "#fabd2f", "#83a598", "#fe8019", "#1d2021", "#282828", "#3c3836", "#928374", "#504945", "#665c54", "#7c6f64", "#a89984", "#000000", "#fbf1c7"],
  "sunset-tangerine": ["#ff5733", "#ffda33", "#33ff57", "#338aff", "#ff33f5", "#33e6ff", "#ff5733", "#ff8533", "#ffcf33", "#33ff6b", "#33a6ff", "#ff33b5", "#33f7ff", "#ff5733", "#ffa833", "#ffd933", "#000000", "#ffffff"],
  "synthwave-84": ["#18191f", "#2a2b32", "#343640", "#484953", "#6c6c83", "#8b8bac", "#a1a1bf", "#c4c4d6", "#ff536c", "#ff8189", "#c080ff", "#7f9fff", "#ffc346", "#ffff99", "#ffa367", "#bfbfde"],
  "tokyo-dark": ["#1a1b26", "#16161e", "#292e42", "#c0caf5", "#a9b1d6", "#3b4261", "#7aa2f7", "#3d59a1", "#2ac3de", "#0db9d7", "#89ddff", "#b4f9f8", "#394b70", "#565f89", "#7dcfff", "#545c7e", "#737aa2", "#9ece6a", "#73daca", "#41a6b5", "#bb9af7", "#ff007c", "#ff9e64", "#9d7cd8", "#f7768e", "#db4b4b", "#1abc9c", "#414868", "#e0af68"],
  "tokyo-moon": ["#222436", "#1b1d2b", "#82aaff", "#444a73", "#82aaff", "#86e1fc", "#c3e88d", "#fca7ea", "#ff757f", "#c8d3f5", "#ffc777", "#c8d3f5", "#86e1fc", "#c8d3f5", "#c3e88d", "#c099ff", "#ff757f", "#2d3f76", "#828bb8", "#ffc777"],
  "tokyo-storm": ["#24283b", "#1f2335", "#292e42", "#c0caf5", "#a9b1d6", "#3b4261", "#7aa2f7", "#3d59a1", "#2ac3de", "#0db9d7", "#89ddff", "#b4f9f8", "#394b70", "#565f89", "#7dcfff", "#545c7e", "#737aa2", "#9ece6a", "#73daca", "#41a6b5", "#bb9af7", "#ff007c", "#ff9e64", "#9d7cd8", "#f7768e", "#db4b4b", "#1abc9c", "#414868", "#e0af68"],
};

var imageLoader = document.getElementById("drop-zone");
imageLoader.addEventListener("change", (e) => {
  handleImage(e.target.files[0]);
});

window.addEventListener("paste", (e) => {
  handleImage(e.clipboardData.files[0]);
});

["dragenter", "dragover", "dragleave", "drop"].forEach((e) => {
  document.body.addEventListener(e, preventDefaults, false);
});

document.body.addEventListener("drop", (e) => {
  handleImage(e.dataTransfer.files[0]);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

var canvas = document.getElementById("image-canvas");
var ctx = canvas.getContext("2d");

const downloadButton = document.getElementById("download-button");
const resetButton = document.getElementById("reset-button");
const convertButton = document.getElementById("convert");
const menu = document.getElementById("theme-select");

canvas.style.visibility = "hidden";

var ogimage;
var themeName = null;
var converting = false;

// render state: canvas = original -> (invert?) -> (theme?)
var inverted = false;
var converted = false;
var baseData = null; // untouched copy of the loaded image

var invertToggle = document.getElementById("invert-toggle");

// same order as `gowall list`
var themeKeys = Object.keys(GOWALL_THEMES).sort();
themeKeys.forEach(function (k) {
  var opt = document.createElement("option");
  opt.value = k;
  opt.textContent = k;
  menu.appendChild(opt);
});
menu.value = themeKeys[0];
themeName = menu.value;

function scrollTheme(scrollDirection = 0) {
  const idx = themeKeys.indexOf(menu.value);
  var nv = scrollDirection > 0 ? idx + 1 : idx - 1;
  if (scrollDirection === 0) nv = idx;

  if (nv < 0) nv = themeKeys.length - 1;
  else if (nv >= themeKeys.length) nv = 0;

  menu.value = themeKeys[nv];
  themeName = menu.value;
}

menu.addEventListener("wheel", (event) => {
  event.preventDefault();
  scrollTheme(event.deltaY);
});

menu.onchange = function () {
  scrollTheme();
};

function handleImage(source) {
  ogimage = source;
  var reader = new FileReader();

  reader.onload = function (event) {
    var img = new Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      inverted = invertToggle.checked;
      converted = false;
      if (inverted) rebuild();
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(source);
  downloadButton.style.visibility = "hidden";
  resetButton.style.visibility = "hidden";
  canvas.style.visibility = "visible";
}

// live toggle: re-render immediately, no convert press needed
invertToggle.addEventListener("change", function () {
  if (converting || !baseData) {
    invertToggle.checked = inverted; // snap back while busy / no image
    return;
  }
  inverted = invertToggle.checked;
  rebuild();
});

function rebuild() {
  var imageData = new ImageData(
    new Uint8ClampedArray(baseData.data),
    canvas.width,
    canvas.height
  );

  if (inverted) {
    // gowall's `invert` filter (internal/image/invert.go → imaging.Invert):
    // per-channel 255 - v, alpha untouched. Applied before the CLUT so the
    // colour scheme maps over the inverted colours.
    var px = imageData.data;
    for (var i = 0; i < px.length; i += 4) {
      px[i] = 255 - px[i];
      px[i + 1] = 255 - px[i + 1];
      px[i + 2] = 255 - px[i + 2];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (converted) {
    applyLut();
  } else if (!converting) {
    downloadButton.style.visibility = "hidden";
    resetButton.style.visibility = "hidden";
  }
}

function reset() {
  handleImage(ogimage);
}

function initialize() {
  if (converting || !ogimage) return;
  converting = true;
  convertButton.disabled = true;
  downloadButton.style.visibility = "hidden";
  resetButton.style.visibility = "hidden";

  setTimeout(function () {
    try {
      converted = true;
      rebuild();
    } catch (err) {
      console.error(err);
      finishConvert();
    }
  }, 0);
}

function finishConvert() {
  converting = false;
  convertButton.disabled = false;
  downloadButton.style.visibility = "visible";
  resetButton.style.visibility = "visible";
}

function hexToRgb(hex) {
  var h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

// ── gowall v0.2.4 engine (hald CLUT level 8 + gaussian RBF, sigma 50) ──

var LUT_LEVEL = 8;
var LUT_CUBE = LUT_LEVEL * LUT_LEVEL; // 64
var LUT_SIZE = LUT_CUBE * LUT_CUBE * LUT_CUBE; // 262144

var lutCache = {};

function buildLut(name) {
  var palette = GOWALL_THEMES[name].map(hexToRgb);
  var n = palette.length;
  var twoSigmaSq = 2 * 50 * 50;

  var lut = new Uint8Array(LUT_SIZE * 3);
  var pos = 0;

  for (var b = 0; b < LUT_CUBE; b++) {
    var bv = Math.floor((b * 255) / (LUT_CUBE - 1)); // uint8(b * 255 / 63)
    for (var g = 0; g < LUT_CUBE; g++) {
      var gv = Math.floor((g * 255) / (LUT_CUBE - 1));
      for (var r = 0; r < LUT_CUBE; r++) {
        var rv = Math.floor((r * 255) / (LUT_CUBE - 1));

        var numR = 0, numG = 0, numB = 0, den = 0;
        for (var i = 0; i < n; i++) {
          var p = palette[i];
          var dr = rv - p[0], dg = gv - p[1], db = bv - p[2];
          var d2 = dr * dr + dg * dg + db * db;
          var w = Math.exp(-d2 / twoSigmaSq);
          numR += p[0] * w;
          numG += p[1] * w;
          numB += p[2] * w;
          den += w;
        }

        lut[pos++] = Math.floor(numR / den);
        lut[pos++] = Math.floor(numG / den);
        lut[pos++] = Math.floor(numB / den);
      }
    }
  }
  return lut;
}

function getLut(name) {
  if (!lutCache[name]) lutCache[name] = buildLut(name);
  return lutCache[name];
}

function applyLut() {
  var w = canvas.width;
  var h = canvas.height;
  var imageData = ctx.getImageData(0, 0, w, h);
  var pixels = imageData.data;
  var lut = getLut(themeName);

  var y = 0;
  var batchSizeRows = window.innerWidth > 800
    ? Math.max(1, Math.floor(h / 16))
    : Math.max(1, Math.floor(h / 10));

  function processBatch() {
    var maxY = Math.min(y + batchSizeRows, h);
    for (; y < maxY; y++) {
      var rowOff = y * w * 4;
      for (var x = 0; x < w; x++) {
        var idx = rowOff + x * 4;
        // floor(v * 63 / 255) — identical to gowall's correctPixel();
        // index layout matches the identity CLUT: blue-major, red-minor
        var rq = (pixels[idx] * 63 / 255) | 0;
        var gq = (pixels[idx + 1] * 63 / 255) | 0;
        var bq = (pixels[idx + 2] * 63 / 255) | 0;
        var lo = ((bq << 12) | (gq << 6) | rq) * 3;
        pixels[idx] = lut[lo];
        pixels[idx + 1] = lut[lo + 1];
        pixels[idx + 2] = lut[lo + 2];
      }
    }
    ctx.putImageData(imageData, 0, 0);

    if (y < h) {
      setTimeout(processBatch, 0);
    } else {
      finishConvert();
    }
  }

  processBatch();
}

// ── download ──

function downloadImage() {
  var base = "image";
  if (ogimage && ogimage.name) {
    base = ogimage.name.replace(/\.[^.]+$/, "");
  }
  var ext = "png";
  if (ogimage && ogimage.name && ogimage.name.indexOf(".") > -1) {
    ext = ogimage.name.split(".").pop().toLowerCase();
  }
  image = canvas.toDataURL("image/" + (ext === "jpg" ? "jpeg" : ext));
  var link = document.createElement("a");
  link.download = base + "-" + themeName + "." + ext;
  link.href = image;
  link.click();
}
