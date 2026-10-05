// Atualiza o ano do rodapé em todas as páginas públicas.
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

// Ajusta a distância do WhatsApp à altura real da barra, inclusive com texto ampliado.
(() => {
  const bar = document.querySelector('.mobile-quote-bar');
  if (!bar || !('ResizeObserver' in window)) return;
  const observer = new ResizeObserver(() => {
    const height = bar.getBoundingClientRect().height;
    if (height > 0) {
      document.documentElement.style.setProperty('--mobile-quote-bar-height', `${height}px`);
    }
  });
  observer.observe(bar);
})();
