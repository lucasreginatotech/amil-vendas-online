// Configura links de contato e envia pedidos de cotação para o CRM.
(() => {
  const whatsappNumber = window.SITE_CONFIG?.whatsappNumber || '';
  const configured = /^\d{12,15}$/.test(whatsappNumber);

  // Preenche os links de WhatsApp espalhados pelo site.
  document.querySelectorAll('.js-whatsapp').forEach((link) => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 32 32');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('wa-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M16 .4A15.6 15.6 0 0 0 2.55 23.9L.4 31.6l7.9-2.07A15.6 15.6 0 1 0 16 .4m0 28.5c-2.42 0-4.8-.65-6.88-1.88l-.5-.3-4.7 1.24 1.25-4.58-.33-.52A12.82 12.82 0 1 1 16 28.9m7.03-9.6c-.38-.19-2.24-1.1-2.59-1.23-.35-.13-.6-.19-.86.19-.25.38-.98 1.23-1.2 1.49-.22.25-.45.28-.83.09-.38-.19-1.6-.59-3.04-1.88-1.12-1-1.88-2.24-2.1-2.62-.22-.38-.02-.58.17-.77.17-.17.38-.45.57-.67.19-.22.25-.38.38-.64.13-.25.06-.48-.03-.67-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66-.22-.01-.48-.01-.73-.01-.25 0-.67.09-1.02.48-.35.38-1.33 1.3-1.33 3.17s1.36 3.68 1.55 3.94c.19.25 2.68 4.1 6.49 5.75.91.39 1.62.62 2.17.79.91.29 1.74.25 2.39.15.73-.11 2.24-.92 2.56-1.81.32-.89.32-1.65.22-1.81-.1-.16-.35-.25-.73-.44');
    icon.append(path);
    link.prepend(icon);

    if (configured) {
      const message = 'Olá! Acessei o site Amil Vendas Online e gostaria de receber informações sobre planos Amil.';
      link.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Grava o clique como oportunidade anônima, sem atrasar a abertura do WhatsApp.
      link.addEventListener('click', () => {
        const label = (link.getAttribute('aria-label') || link.textContent || 'Botão de WhatsApp').trim().replace(/\s+/g, ' ');
        const sourceDetail = `${window.location.pathname} · ${label}`.slice(0, 160);
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'whatsapp', source_detail: sourceDetail }),
          keepalive: true,
        }).catch(() => {
          // O clique no WhatsApp continua mesmo se o CRM estiver indisponível.
        });
      });
    } else {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.alert('O WhatsApp ainda não foi configurado. Atualize o número em assets/js/config.js para ativar este contato.');
      });
    }
  });

  const form = document.querySelector('#quoteForm');
  if (!form) return;

  const submitButton = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-submit-status]');
  const existingIcon = document.querySelector('.js-whatsapp .wa-icon');
  if (existingIcon && submitButton) submitButton.prepend(existingIcon.cloneNode(true));

  // Exibe sempre um link de recuperação caso o navegador bloqueie a nova aba.
  function showStatus(message, whatsappUrl = '') {
    if (!status) return;
    status.replaceChildren(document.createTextNode(message));
    if (!whatsappUrl) return;
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = ' Abrir WhatsApp';
    status.append(link);
  }

  // Abre o WhatsApp diretamente durante o clique do usuário para evitar bloqueio
  // de pop-up enquanto a chamada de rede aguarda o banco de dados.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!configured) {
      window.alert('O WhatsApp ainda não foi configurado.');
      return;
    }

    const fields = new FormData(form);
    const message = [
      'Olá! Quero receber uma cotação de plano Amil pelo site Amil Vendas Online.',
      '',
      `Nome: ${fields.get('name')}`,
      `E-mail: ${fields.get('email')}`,
      `WhatsApp: ${fields.get('phone')}`,
      `Tipo de plano: ${fields.get('plan')}`,
      `Quantidade de vidas: ${fields.get('lives')}`,
      `Região: ${fields.get('city')} - ${fields.get('state')}`
    ].join('\n');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Abre primeiro, sem esperar a gravação assíncrona.
    let whatsappOpened = false;
    try {
      const whatsappWindow = window.open(whatsappUrl, '_blank');
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappOpened = true;
      }
    } catch {
      // O link alternativo abaixo continua disponível se a abertura for bloqueada.
    }

    const originalButtonContents = [...submitButton.childNodes].map((node) => node.cloneNode(true));
    submitButton.disabled = true;
    submitButton.textContent = 'Registrando cotação...';
    showStatus(
      whatsappOpened ? 'WhatsApp aberto. Salvando seu pedido no CRM...' : 'Seu pedido está sendo salvo. Se o WhatsApp não abrir, use o link:',
      whatsappUrl,
    );

    // O tempo limite evita deixar o formulário carregando sem retorno.
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.get('name'),
          email: fields.get('email'),
          phone: fields.get('phone'),
          plan: fields.get('plan'),
          lives: fields.get('lives'),
          city: fields.get('city'),
          state: fields.get('state'),
          consent: fields.get('consent') === 'on',
        }),
        signal: controller.signal,
        keepalive: true,
      });
      if (!response.ok) throw new Error('Lead registration failed');
      showStatus('Pedido registrado no CRM. Continue a conversa no WhatsApp.', whatsappUrl);
    } catch {
      showStatus('O WhatsApp foi aberto, mas não consegui confirmar o registro no CRM. Tente novamente pelo formulário.', whatsappUrl);
      window.alert('O WhatsApp foi aberto, mas não foi possível confirmar o registro da cotação. Verifique sua conexão e tente novamente pelo formulário.');
    } finally {
      window.clearTimeout(timeout);
      submitButton.disabled = false;
      submitButton.replaceChildren(...originalButtonContents.map((node) => node.cloneNode(true)));
    }
  });
})();
