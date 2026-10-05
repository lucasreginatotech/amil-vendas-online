// Mantém o perfil escolhido entre a página de planos e o pedido de cotação.
(() => {
  const form = document.querySelector('#quoteForm');
  const profiles = {
    familia: { plan: 'Individual ou familiar', title: 'Cotação para você e sua família', description: 'Vamos conferir as modalidades disponíveis na sua cidade e os critérios de contratação para seu perfil.' },
    empresa: { plan: 'Empresarial / PME', title: 'Cotação para sua empresa', description: 'Informe a quantidade de pessoas. Durante o atendimento, a equipe confirma o CNPJ, os vínculos e as condições do produto.' },
    mei: { plan: 'Empresarial / PME', title: 'Cotação para MEI', description: 'A equipe verificará a elegibilidade do seu MEI, os documentos e as regras aplicáveis ao produto desejado.' },
    dental: { plan: 'Plano odontológico', title: 'Cotação odontológica', description: 'Vamos conferir os produtos odontológicos disponíveis, os procedimentos previstos e a rede na sua região.' },
  };
  const notice = document.querySelector('#quoteProfile');
  function choose(profile, announce = true) {
    if (!form || !profiles[profile]) return;
    const selected = profiles[profile];
    form.elements.plan.value = selected.plan;
    form.dataset.profile = profile;
    if (notice) {
      notice.hidden = false;
      notice.querySelector('b').textContent = selected.title;
      notice.querySelector('p').textContent = selected.description;
    }
    document.querySelectorAll('[data-quote-profile]').forEach((link) => {
      link.classList.toggle('profile-selected', link.dataset.quoteProfile === profile);
    });
    if (announce) form.elements.plan.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.querySelectorAll('[data-quote-profile]').forEach((link) => {
    link.addEventListener('click', () => {
      choose(link.dataset.quoteProfile);
      // A navegação da âncora continua funcionando com ou sem JavaScript.
      if (form) window.setTimeout(() => {
        form.elements.name.focus({ preventScroll: true });
      }, 0);
    });
  });
  if (form) {
    choose(new URLSearchParams(window.location.search).get('perfil'), false);
    form.elements.plan.addEventListener('change', () => {
      if (profiles[form.dataset.profile]?.plan !== form.elements.plan.value) {
        delete form.dataset.profile;
        if (notice) notice.hidden = true;
        document.querySelectorAll('.profile-selected').forEach((link) => link.classList.remove('profile-selected'));
      }
    });
    const bar = document.querySelector('.mobile-quote-bar');
    if (bar && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => { bar.classList.toggle('is-hidden', entry.isIntersecting); }, { threshold: 0 });
      observer.observe(form);
    }
  }
})();
