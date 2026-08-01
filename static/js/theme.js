(function() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'blue';
  var select = document.getElementById('theme-select');
  if (select) {
    select.value = current;
    select.addEventListener('change', function() {
      var t = select.value;
      html.setAttribute('data-theme', t);
      try { localStorage.setItem('theme', t); } catch(e) {}
    });
  }
})();
