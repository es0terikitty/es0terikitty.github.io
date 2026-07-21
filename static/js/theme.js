document.getElementById('theme-toggle').addEventListener('click', function() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch(e) {}
});
