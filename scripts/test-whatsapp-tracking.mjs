import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const config = await fs.readFile(new URL('../assets/js/config.js', import.meta.url), 'utf8');
const source = await fs.readFile(new URL('../assets/js/whatsapp.js', import.meta.url), 'utf8');

// Executa os handlers reais com DOM, API e Google Ads simulados, sem criar leads reais.
class Element {
  constructor(text = '') {
    this.textContent = text;
    this.childNodes = [];
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this.classList = { add() {} };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  append(node) { this.childNodes.push(node); }
  prepend(node) { this.childNodes.unshift(node); }
  replaceChildren(...nodes) { this.childNodes = nodes; }
  cloneNode() { return new Element(this.textContent); }
  closest() { return this.inForm ? this.form : null; }
  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }
  async fire(type) {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    for (const handler of this.listeners[type] || []) await handler(event);
    return event;
  }
}

function setup({ ok = true, tracking = 'working', apiRejects = false } = {}) {
  const direct = new Element('Contato');
  const floating = new Element('Contato flutuante');
  const excluded = new Element('Contato no formulário');
  const submit = new Element('Enviar cotação');
  submit.append(new Element('Enviar cotação'));
  const status = new Element();
  const form = new Element();
  excluded.inForm = true;
  excluded.form = form;
  form.elements = { phone: { setCustomValidity() {}, reportValidity() {}, addEventListener() {} } };
  form.querySelector = (selector) => selector === '[type="submit"]' ? submit : status;
  const conversions = [], requests = [], opened = [];
  let resolveApi;
  const pendingApi = new Promise((resolve) => { resolveApi = resolve; });
  const window = {
    location: { pathname: '/index.html' }, dataLayer: [],
    open(url) { opened.push(url); return {}; },
    setTimeout() { return 1; }, clearTimeout() {}, alert() {},
  };
  if (tracking !== 'missing') window.gtag = (...args) => {
    if (tracking === 'throws') throw new Error('Tracking blocked');
    conversions.push(args);
  };
  const document = {
    querySelectorAll() { return [direct, floating, excluded]; },
    querySelector(selector) {
      return selector === '#quoteForm' ? form : direct.childNodes[0];
    },
    createElementNS() { return new Element(); },
    createElement() { return new Element(); },
    createTextNode(text) { return new Element(text); },
  };
  const context = vm.createContext({
    window, document, AbortController,
    FormData: class {
      get(key) { return { name: 'Teste', email: 'teste@example.com', phone: '11999999999', consent: 'on' }[key] || ''; }
    },
    fetch(url, options) {
      const payload = JSON.parse(options.body);
      requests.push({ url, payload, options });
      if (apiRejects) return Promise.reject(new Error('CRM offline'));
      return payload.source === 'whatsapp' ? Promise.resolve({ ok }) : pendingApi;
    },
  });
  vm.runInContext(config, context);
  vm.runInContext(source, context);
  return { direct, floating, excluded, submit, status, form, conversions, requests, opened, window,
    resolveApi: () => resolveApi({ ok }) };
}

const secondary = 'AW-17545602600/I3jvCLO34JodEKjMsq5B';
assert.equal(setup().window.SITE_CONFIG.googleAdsWhatsAppConversionSendTo, secondary);
const primary = 'AW-17545602600/GndqCJ6o5ZodEKjMsq5B';
for (const name of ['direct', 'floating']) {
  const test = setup();
  assert.equal(test.conversions.length, 0, 'Sem conversão ao carregar');
  const event = await test[name].fire('click');
  assert.equal(event.prevented, false, 'Navegação normal preservada');
  assert.equal(test[name].target, '_blank');
  assert.match(test[name].href, /^https:\/\/wa.me\//);
  assert.equal(test.conversions.length, 1);
  assert.equal(test.conversions[0][2].send_to, secondary);
  assert.deepEqual(Object.keys(test.conversions[0][2]), ['send_to']);
  assert.equal(test.requests.length, 1);
  assert.equal(test.requests[0].payload.source, 'whatsapp');
  assert.equal(test.requests[0].options.keepalive, true);
  await test[name].fire('click');
  assert.equal(test.conversions.length, 2, 'Uma conversão por clique');
}
for (const ok of [true, false]) {
  const test = setup({ ok });
  await test.submit.fire('click');
  await test.excluded.fire('click');
  assert.equal(test.conversions.length, 0);
  const pendingSubmit = test.form.fire('submit');
  assert.equal(test.opened.length, 1);
  assert.equal(test.requests.length, 1);
  assert.equal(test.conversions.length, 0, 'Aguardar confirmação do CRM');
  test.resolveApi();
  await pendingSubmit;
  assert.equal(test.conversions.length, ok ? 1 : 0);
  assert.equal(test.window.dataLayer.length, ok ? 1 : 0);
  if (ok) {
    assert.equal(test.conversions[0][2].send_to, primary);
    assert.equal(test.conversions[0][2].value, 1);
    assert.equal(test.conversions[0][2].currency, 'BRL');
    assert.match(test.status.childNodes[0].textContent, /Pedido recebido/);
  } else assert.match(test.status.childNodes[0].textContent, /Não foi possível/);
  const recovery = test.status.childNodes.at(-1);
  await recovery.fire('click');
  assert.equal(test.conversions.length, ok ? 1 : 0, 'Recuperação sem conversão');
  assert.equal(test.submit.disabled, false);
}
for (const tracking of ['missing', 'throws']) {
  const test = setup({ tracking });
  const event = await test.direct.fire('click');
  assert.equal(event.prevented, false);
  assert.equal(test.requests[0].payload.source, 'whatsapp');
  const pendingSubmit = test.form.fire('submit');
  test.resolveApi();
  await pendingSubmit;
  assert.equal(test.opened.length, 1);
  assert.match(test.status.childNodes[0].textContent, /Pedido recebido/);
  assert.equal(test.conversions.length, 0);
}
const offline = setup({ apiRejects: true });
assert.equal((await offline.direct.fire('click')).prevented, false);
assert.equal(offline.conversions.length, 1);
for (const page of ['index.html', 'planos.html', 'sobre.html', 'rede-credenciada.html']) {
  const html = await fs.readFile(new URL(`../${page}`, import.meta.url), 'utf8');
  assert.equal((html.match(/googletagmanager.com\/gtag\/js\?id=AW-17545602600/g) || []).length, 1);
  assert.match(html, /floating-contact js-whatsapp/);
  assert.doesNotMatch(html, /googleAdsWhatsAppConversionSendTo/);
}
console.log('PASS: carga sem evento; clique direto e flutuante somente secundária (1 por clique); formulário confirmado somente principal; erro sem conversão; submit e recuperação excluídos; rastreamento bloqueado e CRM indisponível preservam contato; tag base única nas 4 páginas.');
