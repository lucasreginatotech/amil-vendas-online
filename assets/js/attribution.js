// Origem comercial e consentimento opcional, separados da autorização de atendimento.
(() => {
  const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  const PREFIX = 'amil_tracking_v1';
  const DAY = 86400000;
  const IDLE = 30 * 60000;
  const read = (key) => {
    try { return JSON.parse(window.localStorage.getItem(key) || 'null'); } catch { return null; }
  };
  const write = (key, data) => {
    try { window.localStorage.setItem(key, JSON.stringify(data)); } catch { /* Navegação sem storage. */ }
  };
  const remove = (key) => { try { window.localStorage.removeItem(key); } catch {} };
  let choice = read(`${PREFIX}_consent`);
  if (!choice || !['granted', 'denied'].includes(choice.state) || !(Date.now() - choice.at < 180 * DAY) || choice.at > Date.now()) choice = null;
  const params = new URLSearchParams(window.location.search);
  const incoming = {};
  for (const field of FIELDS) {
    const value = (params.get(field) || '').trim();
    if (value && value.length <= (field.startsWith('utm_') ? 200 : 250)
      && !/[\x00-\x1f\x7f]/.test(value)
      && (field.startsWith('utm_') || /^[A-Za-z0-9_-]+$/.test(value))) incoming[field] = value;
  }
  let attribution = null;
  let configured = false;
  let panel;
  function hasConsent() {
    return choice?.state === 'granted' && choice.at <= Date.now() && Date.now() - choice.at < 180 * DAY;
  }
  function capture() {
    if (!hasConsent()) { attribution = null; remove(`${PREFIX}_attribution`); return; }
    const now = Date.now();
    const previous = read(`${PREFIX}_attribution`);
    if (Object.keys(incoming).length) {
      attribution = { ...incoming, attribution_captured_at: new Date(now).toISOString(), last_seen: now };
    } else if (previous && now - previous.last_seen < IDLE && previous.last_seen <= now
      && now - Date.parse(previous.attribution_captured_at) < 30 * DAY) {
      attribution = { ...previous, last_seen: now };
    } else {
      attribution = { utm_source: '(direto)', attribution_captured_at: new Date(now).toISOString(), last_seen: now };
    }
    write(`${PREFIX}_attribution`, attribution);
  }
  function updateGoogleConsent() {
    try {
      if (typeof window.gtag !== 'function') return;
      const allowed = hasConsent() ? 'granted' : 'denied';
      window.gtag('consent', 'update', { ad_storage: allowed, ad_user_data: allowed,
        analytics_storage: allowed, ad_personalization: 'denied' });
      // Modo básico: config somente após autorização, sem pings de conversão recusados.
      if (hasConsent() && !configured) {
        configured = true;
        window.gtag('config', 'AW-17545602600', { allow_ad_personalization_signals: false });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17545602600';
        document.head.append(script);
      }
    } catch { /* Consentimento e CRM funcionam mesmo com Google Ads bloqueado. */ }
  }
  function choose(state) {
    if (!['granted', 'denied'].includes(state)) return;
    choice = { state, at: Date.now() };
    write(`${PREFIX}_consent`, choice);
    capture();
    updateGoogleConsent();
    if (panel) panel.hidden = true;
  }
  function getPayload() {
    if (!hasConsent()) {
      attribution = null;
      remove(`${PREFIX}_attribution`);
      return { tracking_consent: false, attribution: {} };
    }
    const now = Date.now();
    if (!attribution || now - attribution.last_seen >= IDLE || now - Date.parse(attribution.attribution_captured_at) >= 30 * DAY) {
      attribution = { utm_source: '(direto)', attribution_captured_at: new Date(now).toISOString(), last_seen: now };
    }
    attribution.last_seen = now;
    write(`${PREFIX}_attribution`, attribution);
    const data = {};
    for (const field of [...FIELDS, 'attribution_captured_at']) if (attribution[field]) data[field] = attribution[field];
    return { attribution: data, tracking_consent: true, tracking_consent_at: new Date(choice.at).toISOString() };
  }
  window.SITE_ATTRIBUTION = { hasConsent, getPayload, choose, showPreferences: () => { if (panel) panel.hidden = false; } };
  capture();
  updateGoogleConsent();
  panel = document.createElement('section');
  panel.className = 'tracking-consent';
  panel.setAttribute('aria-label', 'Preferências de medição');
  panel.hidden = Boolean(choice);
  const explanation = document.createElement('p');
  explanation.textContent = 'Podemos guardar a origem dos anúncios e identificadores de clique para medir contatos e futuras vendas no Google Ads? É opcional e não impede seu atendimento. Sem autorização, esses dados não são armazenados e as conversões não são enviadas.';
  const policy = document.createElement('a');
  policy.href = 'sobre.html#privacidade';
  policy.textContent = 'Como usamos esses dados';
  panel.append(explanation, policy);
  const actions = document.createElement('div');
  for (const [label, state] of [['Recusar', 'denied'], ['Autorizar medição', 'granted']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => choose(state));
    actions.append(button);
  }
  panel.append(actions);
  document.body.append(panel);
  const preferences = document.createElement('button');
  preferences.type = 'button'; preferences.className = 'tracking-preferences';
  preferences.textContent = 'Preferências de medição';
  preferences.addEventListener('click', window.SITE_ATTRIBUTION.showPreferences);
  (document.querySelector('footer .container') || document.body).append(preferences);
  window.addEventListener('storage', (event) => {
    if (event.key !== `${PREFIX}_consent`) return;
    choice = read(`${PREFIX}_consent`);
    capture(); updateGoogleConsent();
  });
})();
