# Ambient — Minimal New Tab

A from-scratch Manifest V3 browser extension that clones the look of the
"Mist" new tab page: date top-left, time + greeting centered, a search bar,
grouped shortcut pills, a `+` to add shortcuts, and glass hover effects.
No weather, no extra settings pages — just what you asked for.

## Load it (Brave / Chrome)

1. Unzip this folder somewhere permanent (don't delete it after — the
   browser loads the extension straight from these files).
2. Go to `brave://extensions` (or `chrome://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `mist-newtab` folder.
5. Open a new tab. If another new-tab extension is installed, disable it
   first — only one can own the new tab page at a time.

## How it works

- **Shortcuts** are stored in `chrome.storage.local` (per-profile, synced
  across your own devices only if you enable Chrome sync — nothing leaves
  your machine otherwise).
- **Automatic favicons** use Chrome's built-in `_favicon` resource (no
  network calls to a third-party favicon service).
- **Search** uses `chrome.search.query`, so it respects whatever your
  default search engine is set to. Typing a bare domain (e.g. `github.com`)
  navigates directly instead of searching.
- **Edit mode**: click the pencil icon top-right to reveal delete (×)
  badges on each shortcut; click a shortcut while in edit mode to edit it
  instead of navigating.
- Star / feedback / gear icons top-right and the corner icon bottom-right
  are there for visual parity with the original — they're intentionally
  inert since you didn't want extra settings.

## Customizing

- Colors, radius, blur amount, and the font stack are all CSS variables at
  the top of `css/styles.css` under `:root`.
- The ambient corner glow is a pair of CSS `radial-gradient`s (no wallpaper
  image bundled). If you want your own wallpaper behind it, add an image to
  the folder and set it as `background-image` on `body` in `styles.css`.
