// Atualiza o ano do rodapé em todas as páginas públicas.
document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
