import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Blob } from 'node:buffer';
const root = new URL('../', import.meta.url);
const require = createRequire(new URL('../api/crm-leads.js', import.meta.url));
const source = await fs.readFile(new URL('../assets/js/crm.js', import.meta.url), 'utf8');
class Element {
  constructor() { this.listeners = {}; this.value = ''; this.dataset = {}; this.classList = { toggle() {}, contains() { return false; } }; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  getAttribute() { return ''; }
  setAttribute() {}
  removeAttribute() {}
  click() { for (const fn of this.listeners.click || []) fn({ target: this }); }
}
const elements = new Map();
const element = (id) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
const leads = [
  { id: '00000000-0000-4000-8000-000000000001', created_at: new Date().toISOString(), name: 'Novo teste', source: 'formulario', status: 'Fechado', notes: '=HYPERLINK("teste")', utm_source: '<script>google</script>', utm_campaign: 'Campanha Amil', utm_medium: 'cpc', gclid: 'click_test', tracking_consent: true, sale_value: 250 },
  { id: '00000000-0000-4000-8000-000000000002', created_at: new Date().toISOString(), name: 'Contato antigo', status: 'Novo', source: 'formulario' },
  { id: '00000000-0000-4000-8000-000000000003', created_at: new Date().toISOString(), name: 'Clique', status: 'Fechado', source: 'whatsapp' },
];
let exported;
const context = vm.createContext({
  document: { querySelector: element, querySelectorAll: () => [], createElement: () => new Element() },
  window: { scrollTo() {}, confirm() { return false; } },
  fetch: async () => ({ ok: true, json: async () => ({ leads }) }), Blob,
  URL: { createObjectURL(blob) { exported = blob; return 'blob:test'; }, revokeObjectURL() {} },
});
vm.runInContext(source, context);
await new Promise((resolve) => setTimeout(resolve, 20));
const cards = element('#leadList').innerHTML;
assert.ok(cards, element('#loginMessage').textContent || 'Painel não renderizado');
assert.match(cards, /Origem: &lt;script&gt;google&lt;\/script&gt;/);
assert.match(cards, /Campanha: Campanha Amil/);
assert.match(cards, /Contato antigo/);
assert.match(cards, /Não registrada/);
assert.equal(element('#wonLeads').textContent, '1', 'Clique não é contado como venda');
element('#exportCsv').click();
if (!exported) element('#mobileExport').click();
assert.ok(exported);
const csv = await exported.text();
assert.match(csv, /UTM campanha/); assert.match(csv, /Campanha Amil/); assert.match(csv, /click_test/); assert.match(csv, /Contato antigo/);
assert.match(csv, /'=HYPERLINK/);
const headers = csv.split('\r\n')[0].split(';');
assert.equal(headers.length, csv.split('\r\n')[1].split(';').length);

const apiSource = await fs.readFile(new URL('../api/crm-leads.js', import.meta.url), 'utf8');
const requests = [];
const apiContext = vm.createContext({ module: { exports: {} },
  require(path) { return path === '../lib/session' ? { hasValidSession: (req) => req.authorized } : require(path); },
  process: { env: { CRM_ADMIN_PASSWORD: 'test-password', SUPABASE_URL: 'https://database.test', SUPABASE_SECRET_KEY: 'server-only' } },
  fetch: async (url, options = {}) => { requests.push({ url, options }); return { ok: true, json: async () => leads }; },
});
vm.runInContext(apiSource, apiContext);
async function call(method, body, authorized = true) {
  let result;
  const res = { setHeader() {}, end(raw) { result = JSON.parse(raw); } };
  await apiContext.module.exports({ method, body, authorized }, res);
  return { status: res.statusCode, result };
}
assert.equal((await call('GET', {}, false)).status, 401);
assert.equal(requests.length, 0);
const fetched = await call('GET', {});
assert.equal(fetched.status, 200); assert.match(requests[0].url, /utm_campaign/); assert.match(requests[0].url, /gclid/);
assert.equal((await call('PATCH', { id: leads[0].id, status: 'Fechado', notes: '', sale_value: 320 })).status, 200);
assert.equal(JSON.parse(requests.at(-1).options.body).sale_value, 320);
assert.equal((await call('PATCH', { id: leads[0].id, status: 'Fechado', notes: '', sale_value: -1 })).status, 400);
console.log('PASS: CRM exibe origem/campanha sem XSS, mantém contato antigo, exclui clique das vendas, exporta colunas alinhadas e neutraliza fórmulas; API exige sessão e valida valor de venda.');
