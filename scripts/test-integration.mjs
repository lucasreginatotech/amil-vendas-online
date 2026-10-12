import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
const root = new URL('../', import.meta.url);
const require = createRequire(new URL('../api/leads.js', import.meta.url));
const files = {};
for (const path of ['api/leads.js', 'assets/js/config.js', 'assets/js/attribution.js', 'assets/js/submission.js', 'assets/js/whatsapp.js']) files[path] = await fs.readFile(new URL(path, root), 'utf8');
const results = [];
class Element {
  constructor(text = '') { this.textContent = text; this.childNodes = []; this.dataset = {}; this.listeners = {}; this.attributes = {}; this.classList = { add() {} }; }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  append(...nodes) { this.childNodes.push(...nodes); }
  prepend(node) { this.childNodes.unshift(node); }
  replaceChildren(...nodes) { this.childNodes = nodes; }
  cloneNode() { return new Element(this.textContent); }
  closest() { return this.inForm ? this.form : null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  async fire(type) {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    for (const fn of this.listeners[type] || []) await fn(event);
    return event;
  }
}
function storage() {
  const map = new Map();
  return { map, getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
}
function database() {
  const rows = new Map(), db = { rows, fail: false, gate: null };
  db.fetch = async (url, options = {}) => {
    if (db.gate) await db.gate;
    if (db.fail) return { ok: false, json: async () => ({}) };
    const parsed = new URL(url);
    if (options.method === 'POST') {
      assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=representation');
      const input = JSON.parse(options.body);
      if (rows.has(input.submission_id)) return { ok: true, json: async () => [] };
      const row = { ...input, id: webcrypto.randomUUID() };
      rows.set(input.submission_id, row);
      return { ok: true, json: async () => [row] };
    }
    const id = parsed.searchParams.get('submission_id')?.replace('eq.', '');
    return { ok: true, json: async () => rows.has(id) ? [rows.get(id)] : [] };
  };
  return db;
}
function apiFor(db) {
  const context = vm.createContext({ module: { exports: {} }, require,
    process: { env: { SUPABASE_URL: 'https://database.test', SUPABASE_SECRET_KEY: 'test-server-only' } }, fetch: db.fetch });
  vm.runInContext(files['api/leads.js'], context);
  return async (body) => {
    let data;
    const response = { setHeader() {}, end(raw) { data = JSON.parse(raw); } };
    await context.module.exports({ method: 'POST', body }, response);
    return { ok: response.statusCode === 200, status: response.statusCode, json: async () => data };
  };
}
const flush = async () => { for (let i = 0; i < 15; i++) await new Promise((resolve) => setTimeout(resolve, 1)); };
function browser({ db = database(), local = storage(), session = storage(), query = '', consent = true, tracking = 'working', brokenStorage = false } = {}) {
  const direct = new Element('Contato'), floating = new Element('Flutuante'), excluded = new Element('Formulário');
  const form = new Element(), submit = new Element(), status = new Element();
  submit.append(new Element('Enviar')); excluded.inForm = true; excluded.form = form;
  form.elements = { phone: { setCustomValidity() {}, reportValidity() {}, addEventListener() {} } };
  form.querySelector = (s) => s === '[type="submit"]' ? submit : status;
  const fields = { name: 'Teste integração', email: 'teste@example.test', phone: '11999999999', consent: 'on', plan: '' };
  const document = { head: new Element(), body: new Element(),
    createElementNS: () => new Element(), createElement: () => new Element(), createTextNode: (text) => new Element(text),
    querySelectorAll: () => [direct, floating, excluded],
    querySelector(s) { return s === '#quoteForm' ? form : s === '.js-whatsapp .wa-icon' ? direct.childNodes[0] : null; },
  };
  const conversions = [], requests = [], opened = [];
  const badStorage = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } };
  const window = { location: { pathname: '/index.html', search: query }, dataLayer: [],
    localStorage: brokenStorage ? badStorage : local, sessionStorage: brokenStorage ? badStorage : session,
    crypto: webcrypto, addEventListener() {}, open(url) { opened.push(url); return {}; }, setTimeout() { return 1; }, clearTimeout() {}, alert() {},
  };
  if (tracking !== 'missing') window.gtag = (...args) => {
    if (tracking === 'throws') throw new Error('Tracking blocked');
    if (args[0] === 'event' && args[1] === 'conversion') conversions.push(args[2]);
  };
  const invoke = apiFor(db), state = { loseResponse: false };
  const context = vm.createContext({ window, document, AbortController, URLSearchParams, TextEncoder,
    FormData: class { get(key) { return fields[key] ?? ''; } },
    fetch: async (url, options) => {
      const payload = JSON.parse(options.body); requests.push(payload);
      const response = await invoke(payload);
      if (state.loseResponse) { state.loseResponse = false; throw new Error('Response lost'); }
      return response;
    },
  });
  for (const p of ['assets/js/config.js', 'assets/js/attribution.js', 'assets/js/submission.js', 'assets/js/whatsapp.js']) vm.runInContext(files[p], context);
  if (consent) window.SITE_ATTRIBUTION.choose('granted');
  return { db, local, session, window, document, form, submit, status, direct, floating, excluded, conversions, requests, opened, fields, state, invoke };
}
const primary = 'AW-17545602600/GndqCJ6o5ZodEKjMsq5B', secondary = 'AW-17545602600/I3jvCLO34JodEKjMsq5B';
const tagged = '?utm_source=google&utm_medium=cpc&utm_campaign=amil_pme&utm_term=plano&utm_content=anuncio1&gclid=GCLID_test&gbraid=GBRAID_test&wbraid=WBRAID_test';
const first = browser({ query: tagged });
assert.equal(first.conversions.length, 0); assert.equal(first.db.rows.size, 0);
assert.equal(first.document.head.childNodes.length, 1);
first.window.SITE_ATTRIBUTION.choose('granted'); assert.equal(first.document.head.childNodes.length, 1);
const navigation = browser({ local: first.local, session: first.session });
assert.equal(navigation.window.SITE_ATTRIBUTION.getPayload().attribution.utm_campaign, 'amil_pme');
const replaced = browser({ local: first.local, query: '?utm_source=bing&utm_campaign=nova' });
assert.equal(replaced.window.SITE_ATTRIBUTION.getPayload().attribution.utm_source, 'bing');
assert.equal(replaced.window.SITE_ATTRIBUTION.getPayload().attribution.gclid, undefined);
const stored = JSON.parse(first.local.getItem('amil_tracking_v1_attribution')); stored.last_seen -= 31 * 60000;
first.local.setItem('amil_tracking_v1_attribution', JSON.stringify(stored));
assert.equal(browser({ local: first.local }).window.SITE_ATTRIBUTION.getPayload().attribution.utm_source, '(direto)');
assert.equal(browser().window.SITE_ATTRIBUTION.getPayload().attribution.utm_source, '(direto)');
const expiredLocal = storage(); expiredLocal.setItem('amil_tracking_v1_consent', JSON.stringify({ state: 'granted', at: Date.now() - 181 * 86400000 }));
assert.equal(browser({ local: expiredLocal, consent: false }).window.SITE_ATTRIBUTION.hasConsent(), false);
const expiredAttribution = storage();
expiredAttribution.setItem('amil_tracking_v1_consent', JSON.stringify({ state: 'granted', at: Date.now() }));
expiredAttribution.setItem('amil_tracking_v1_attribution', JSON.stringify({ utm_source: 'google', last_seen: Date.now(), attribution_captured_at: new Date(Date.now() - 31 * 86400000).toISOString() }));
assert.equal(browser({ local: expiredAttribution }).window.SITE_ATTRIBUTION.getPayload().attribution.utm_source, '(direto)');
results.push('PASS: UTMs e três IDs; navegação preserva origem; nova campanha substitui; visita direta após 30 min; consentimento expira.');
for (const target of ['direct', 'floating']) {
  const b = browser({ query: tagged }); assert.equal((await b[target].fire('click')).prevented, false); await flush();
  assert.equal(b.db.rows.size, 1); assert.equal(b.conversions.length, 1);
  assert.equal(b.conversions[0].send_to, secondary); assert.deepEqual(Object.keys(b.conversions[0]), ['send_to']);
  assert.equal(b.requests[0].source, 'whatsapp'); assert.equal(b.requests[0].attribution.utm_campaign, 'amil_pme');
  assert.equal([...b.db.rows.values()][0].gclid, 'GCLID_test');
  assert.match(b[target].href, /^https:\/\/wa.me\//); assert.equal(b[target].target, '_blank');
  await b[target].fire('click'); await flush(); assert.equal(b.conversions.length, 2); assert.equal(b.db.rows.size, 2);
}
results.push('PASS: clique direto/flutuante salva atribuição e só secundária, uma por clique, sem PII no evento.');
const success = browser({ query: tagged }); let release;
success.db.gate = new Promise((resolve) => { release = resolve; });
const pending = success.form.fire('submit'); await success.form.fire('submit'); await flush();
assert.equal(success.requests.length, 1); assert.equal(success.opened.length, 1); assert.equal(success.conversions.length, 0);
release(); await pending;
assert.equal(success.db.rows.size, 1); assert.equal(success.conversions.length, 1);
assert.equal(success.conversions[0].send_to, primary);
assert.equal(success.conversions[0].transaction_id, [...success.db.rows.values()][0].id);
assert.deepEqual(Object.keys(success.conversions[0]).sort(), ['currency', 'send_to', 'transaction_id', 'value']);
await success.form.fire('submit'); assert.equal(success.db.rows.size, 1); assert.equal(success.conversions.length, 1);
await success.submit.fire('click'); await success.excluded.fire('click'); await success.status.childNodes.at(-1).fire('click');
assert.equal(success.conversions.length, 1);
const reload = browser({ db: success.db, local: success.local, session: success.session }); await reload.form.fire('submit');
assert.equal(success.db.rows.size, 1); assert.equal(reload.conversions.length, 0);
assert.doesNotMatch([...success.session.map.values()].join(' '), /teste@example|119999|Teste integração/);
results.push('PASS: confirmação → só principal com transaction_id do CRM; concorrência, repetição e recarga sem duplicação; recuperação excluída.');
const failed = browser(); failed.db.fail = true; await failed.form.fire('submit');
assert.equal(failed.conversions.length, 0); assert.equal(failed.db.rows.size, 0);
assert.equal(failed.opened.length, 1); assert.equal(failed.submit.disabled, false); assert.match(failed.status.childNodes[0].textContent, /Não foi possível/);
failed.db.fail = false; await failed.form.fire('submit');
assert.equal(failed.requests[0].submission_id, failed.requests[1].submission_id); assert.equal(failed.conversions.length, 1);
const lost = browser(); lost.state.loseResponse = true; await lost.form.fire('submit');
assert.equal(lost.db.rows.size, 1); assert.equal(lost.conversions.length, 0); await lost.form.fire('submit');
assert.equal(lost.db.rows.size, 1); assert.equal(lost.conversions.length, 1);
assert.equal((await lost.invoke({ ...lost.requests[0], name: 'Outra pessoa' })).status, 409);
const concurrentDb = database(), concurrentApi = apiFor(concurrentDb);
const concurrentPayload = { ...lost.requests[0], submission_id: webcrypto.randomUUID() };
const concurrent = await Promise.all([concurrentApi(concurrentPayload), concurrentApi(concurrentPayload)]);
assert.equal(concurrentDb.rows.size, 1);
assert.equal((await concurrent[0].json()).id, (await concurrent[1].json()).id);
const modified = browser(); await modified.form.fire('submit');
modified.fields.plan = 'Outro plano'; await modified.form.fire('submit');
assert.equal(modified.db.rows.size, 2, 'Conteúdo novo pode iniciar nova solicitação');
const deniedPayload = { ...lost.requests[0], submission_id: webcrypto.randomUUID(), tracking_consent: false }; await lost.invoke(deniedPayload);
assert.equal(lost.db.rows.get(deniedPayload.submission_id).gclid, null);
results.push('PASS: falha no banco sem conversão; resposta perdida e reenvio preservam ID; conflito de conteúdo → 409; servidor descarta IDs sem consentimento.');
for (const tracking of ['missing', 'throws']) {
  const b = browser({ tracking }); assert.equal((await b.direct.fire('click')).prevented, false); await flush(); await b.form.fire('submit');
  assert.equal(b.db.rows.size, 2); assert.equal(b.opened.length, 1); assert.equal(b.conversions.length, 0); assert.match(b.status.childNodes[0].textContent, /Pedido recebido/);
}
const denied = browser({ query: tagged, consent: false });
assert.equal(denied.local.getItem('amil_tracking_v1_attribution'), null); assert.equal(denied.document.head.childNodes.length, 0);
await denied.direct.fire('click'); await flush(); await denied.form.fire('submit');
assert.equal(denied.db.rows.size, 2); assert.equal(denied.conversions.length, 0); assert.equal([...denied.db.rows.values()][0].gclid, null);
const revoked = browser({ query: tagged }); revoked.window.SITE_ATTRIBUTION.choose('denied');
assert.equal(revoked.local.getItem('amil_tracking_v1_attribution'), null); assert.equal(revoked.window.SITE_ATTRIBUTION.getPayload().tracking_consent, false);
const noStorage = browser({ brokenStorage: true }); await noStorage.form.fire('submit'); await noStorage.form.fire('submit');
assert.equal(noStorage.db.rows.size, 1); assert.equal(noStorage.conversions.length, 1);
results.push('PASS: Ads bloqueado/ausente e storage indisponível preservam contato; recusa/revogação impedem atribuição e conversões.');
const { prepareSaleConversion } = require('../lib/google-ads-sales');
const sale = { id: webcrypto.randomUUID(), source: 'formulario', status: 'Fechado', created_at: '2026-10-12T12:00:00Z', closed_at: '2026-10-12T13:00:00Z', tracking_consent: true, tracking_consent_at: '2026-10-12T12:00:00Z', gclid: 'Test_click', sale_value: 300 };
const settings = { enabled: true, enabledSince: '2026-10-12T11:00:00Z', conversionAction: 'customers/123/conversionActions/456' };
assert.equal(prepareSaleConversion(sale).eligible, false);
assert.equal(prepareSaleConversion({ ...sale, source: 'whatsapp' }, settings).eligible, false);
assert.equal(prepareSaleConversion({ ...sale, created_at: '2026-01-01' }, settings).eligible, false);
assert.equal(prepareSaleConversion({ ...sale, tracking_consent: false }, settings).eligible, false);
assert.equal(prepareSaleConversion(sale, settings).payload.order_id, `sale:${sale.id}`);
for (const page of ['index.html', 'planos.html', 'sobre.html', 'rede-credenciada.html']) {
  const html = await fs.readFile(new URL(page, root), 'utf8');
  for (const script of ['attribution.js', 'submission.js', 'whatsapp.js']) assert.equal(html.split(`assets/js/${script}`).length - 1, 1);
  assert.match(html, /gtag\('consent', 'default'/); assert.doesNotMatch(html, /<script async src="https:\/\/www.googletagmanager/);
  assert.match(html, /floating-contact js-whatsapp/);
}
results.push('PASS: vendas desativadas; cliques e vendas retroativas inelegíveis; scripts únicos nas quatro páginas.');
console.log(results.join('\n'));
