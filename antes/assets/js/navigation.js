// Controla a abertura e o fechamento do menu em telas pequenas.
(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('open', open);
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Abrir menu');
    }
  });
})();
