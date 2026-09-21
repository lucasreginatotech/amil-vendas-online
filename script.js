document.addEventListener('DOMContentLoaded', function () {

  // 1. Menu Hambúrguer (Mobile Toggle)
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.classList.toggle('active', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // 2. Navegação entre Abas / "Páginas"
  const navButtons = document.querySelectorAll('[data-target]');
  const pages = document.querySelectorAll('.page');
  const allNavLinks = document.querySelectorAll('.nav-link');

  function goToPage(targetId) {
    pages.forEach(function (page) {
      page.classList.toggle('active', page.id === targetId);
    });
    
    allNavLinks.forEach(function (link) {
      const isCurrent = link.dataset.target === targetId;
      link.classList.toggle('active', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (mainNav && mainNav.classList.contains('open')) {
      mainNav.classList.remove('open');
      if (menuToggle) {
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.dataset.target;
      if (targetId) {
        goToPage(targetId);
      }
    });
  });

  // 3. Sistema de Modal de Captação de Leads
  const leadModal = document.getElementById('leadModal');
  const openModalBtns = document.querySelectorAll('.open-modal-btn');
  const closeModalBtn = document.getElementById('modalClose');
  const modalOverlay = document.getElementById('modalOverlay');
  const leadForm = document.getElementById('leadForm');

  function openModal() {
    if (leadModal) {
      leadModal.classList.add('open');
      leadModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal() {
    if (leadModal) {
      leadModal.classList.remove('open');
      leadModal.setAttribute('aria-hidden', 'true');
    }
  }

  openModalBtns.forEach(function (btn) {
    btn.addEventListener('click', openModal);
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

  if (leadForm) {
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('leadName').value.trim();
      const phone = document.getElementById('leadPhone').value.trim();
      const interest = document.getElementById('leadInterest').value;

      const whatsappNumber = "55SEUNUMEROAQUI"; // Substitua pelo seu número com DDI e DDD
      const text = `Olá! Meu nome é *${name}*, meu telefone é ${phone}. Tenho interesse em saber mais sobre o plano *${interest}*. Poderia me passar a cotação?`;
      const encodedText = encodeURIComponent(text);

      window.open(`https://wa.me/${whatsappNumber}?text=${encodedText}`, '_blank');
      closeModal();
    });
  }

  // 4. Simulador Interativo de Planos
  const simulatorForm = document.getElementById('simulatorForm');
  if (simulatorForm) {
    simulatorForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const tipo = document.getElementById('tipoPlano').value;
      const faixa = document.getElementById('faixaEtaria').value;
      const regiao = document.getElementById('regiaoAtendimento').value;

      const whatsappNumber = "55SEUNUMEROAQUI"; // Substitua pelo seu número
      const text = `Olá! Fiz uma simulação profissional no site:\n- Modalidade: *${tipo}*\n- Faixa Etária: *${faixa}*\n- Abrangência: *${regiao}*\n\nGostaria de receber a tabela oficial de preços.`;
      const encodedText = encodeURIComponent(text);

      window.open(`https://wa.me/${whatsappNumber}?text=${encodedText}`, '_blank');
    });
  }

  // 5. FAQ (Acordeão Interativo)
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', function () {
      const isActive = item.classList.contains('active');
      
      faqItems.forEach(function (other) {
        other.classList.remove('active');
        const otherBtn = other.querySelector('.faq-question');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

});