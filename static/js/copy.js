document.addEventListener('DOMContentLoaded', function() {

  /* copy-btn */
  document.querySelectorAll('.copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var code = this.parentElement.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent).then(function() {
          btn.textContent = 'copied';
          btn.classList.add('copied');
          setTimeout(function() {
            btn.textContent = 'copy';
            btn.classList.remove('copied');
          }, 1500);
        });
      }
    });
  });

  /* mobile nav toggle */
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function() {
      links.classList.toggle('open');
      toggle.textContent = links.classList.contains('open') ? '✕' : '≡';
    });
  }

});
