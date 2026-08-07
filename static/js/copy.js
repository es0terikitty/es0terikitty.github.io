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

});
