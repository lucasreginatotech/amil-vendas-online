// Mantém o perfil escolhido entre a página de planos e o pedido de cotação.
(() => {
  const form = document.querySelector('#quoteForm');
  const profiles = {
    familia: {
      plan: 'Individual ou familiar',
      title: 'Cotação para você e sua família',
      description:
        'Deixe seu contato. As opções para sua família serão confirmadas no atendimento.',
    },
    empresa: {
      plan: 'Empresarial / PME',
      title: 'Cotação para sua empresa',
      description:
        'Deixe seu contato para comparar opções de plano Amil empresarial e PME.',
    },
    mei: {
      plan: 'Empresarial / PME',
      title: 'Cotação para MEI',
      description:
        'Deixe seu contato. Nossa equipe verifica a elegibilidade do seu MEI na conversa.',
    },
    dental: {
      plan: 'Plano odontológico',
      title: 'Cotação odontológica',
      description:
        'Deixe seu contato para consultar opções de plano odontológico Amil.',
    },
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
      if (form)
        window.setTimeout(() => {
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
        document
          .querySelectorAll('.profile-selected')
          .forEach((link) => link.classList.remove('profile-selected'));
      }
    });
    const bar = document.querySelector('.mobile-quote-bar');
    if (bar && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          bar.classList.toggle('is-hidden', entry.isIntersecting);
        },
        { threshold: 0 },
      );
      observer.observe(form);
    }
  }
})();
