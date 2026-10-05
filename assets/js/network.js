// A consulta só mostra prestadores quando há uma base oficial identificada e recente.
(() => {
  const form = document.querySelector('#networkForm');
  if (!form) return;
  const results = document.querySelector('#networkResults');
  const status = document.querySelector('#networkStatus');
  const badge = document.querySelector('#networkSourceBadge');
  const help = document.querySelector('#networkHelp');
  const provenance = document.querySelector('#networkProvenance');
  const more = document.querySelector('#networkMore');
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const types = ['Hospital', 'Clínica', 'Laboratório', 'Profissional'];
  let providers = [], matches = [], visible = 12, available = false;
  function updateHelp() {
    const fields = new FormData(form);
    const message = ['Olá! Quero confirmar a rede de um plano Amil.', `Cidade: ${fields.get('city') || 'A definir'}`, `Estado: ${fields.get('state') || 'A definir'}`, `Plano: ${fields.get('plan') || 'Preciso de orientação'}`, `Prestador ou especialidade: ${fields.get('query') || 'Preciso de orientação'}`].join('\n');
    const number = window.SITE_CONFIG?.whatsappNumber;
    help.hidden = !/^\d{12,15}$/.test(number || '');
    if (!help.hidden) help.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  function empty(title, message) {
    results.replaceChildren();
    const box = document.createElement('div');
    box.className = 'network-empty';
    const heading = document.createElement('h3');
    const text = document.createElement('p');
    heading.textContent = title;
    text.textContent = message;
    box.append(heading, text);
    results.append(box);
    results.className = '';
    more.hidden = true;
  }
  function populate(select, values, label) {
    select.replaceChildren(new Option(label, ''));
    [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((value) => select.add(new Option(value, value)));
  }
  function render() {
    results.replaceChildren();
    results.className = 'network-cards';
    matches.slice(0, visible).forEach((provider) => {
      const card = document.createElement('article');
      card.className = 'provider-card';
      const type = document.createElement('span');
      type.className = 'provider-type';
      type.textContent = provider.type;
      const name = document.createElement('h3');
      name.textContent = provider.name;
      const location = document.createElement('p');
      location.textContent = [provider.address, provider.city, provider.state].filter(Boolean).join(' · ');
      const plans = document.createElement('p');
      plans.textContent = `Produtos no material consultado: ${provider.plans.join(', ')}`;
      const services = document.createElement('p');
      services.textContent = provider.specialties.join(' · ');
      card.append(type, name, location, plans, services);
      if (provider.phone) {
        const phone = document.createElement('a');
        phone.className = 'text-link';
        phone.href = `tel:${provider.phone.replace(/[^\d+]/g, '')}`;
        phone.textContent = provider.phone;
        card.append(phone);
      }
      results.append(card);
    });
    more.hidden = matches.length <= visible;
    more.textContent = `Mostrar mais prestadores (${Math.max(0, matches.length - visible)})`;
  }
  function search() {
    updateHelp();
    if (!available) return;
    const fields = new FormData(form);
    const query = normalize(fields.get('query'));
    matches = providers.filter((item) =>
      (!fields.get('state') || item.state === fields.get('state')) &&
      (!fields.get('city') || normalize(item.city).includes(normalize(fields.get('city')))) &&
      (!fields.get('plan') || item.plans.includes(fields.get('plan'))) &&
      (!fields.get('type') || item.type === fields.get('type')) &&
      (!query || normalize([item.name, ...item.specialties].join(' ')).includes(query))
    );
    visible = 12;
    status.textContent = `${matches.length} ${matches.length === 1 ? 'prestador encontrado' : 'prestadores encontrados'} na base disponível`;
    if (!matches.length) empty('Nenhum resultado na base disponível', 'Tente outro nome ou ajuste os filtros. A ausência na busca não confirma que um prestador esteja fora da rede. Peça uma verificação à equipe.');
    else render();
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); search(); });
  form.addEventListener('input', updateHelp);
  form.addEventListener('reset', () => window.setTimeout(search, 0));
  more.addEventListener('click', () => { visible += 12; render(); });
  async function load() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('assets/data/network.json', { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error('Fonte indisponível');
      const data = await response.json();
      if (data.status !== 'ready') throw new Error('Fonte ainda não cadastrada');
      const source = new URL(data.source?.url);
      const age = Date.now() - Date.parse(data.updatedAt);
      if (source.protocol !== 'https:' || !(source.hostname === 'amil.com.br' || source.hostname.endsWith('.amil.com.br')) || !data.source?.label || !Number.isFinite(age) || age < -86400000 || age > 30 * 86400000) throw new Error('Fonte não validada ou desatualizada');
      if (!Array.isArray(data.providers) || !data.providers.length || !data.providers.every((p) =>
        typeof p.name === 'string' && p.name.trim() && typeof p.city === 'string' && p.city.trim() &&
        /^[A-Z]{2}$/.test(p.state) && types.includes(p.type) && Array.isArray(p.plans) && p.plans.length && p.plans.every((v) => typeof v === 'string' && v.trim()) &&
        Array.isArray(p.specialties) && p.specialties.every((v) => typeof v === 'string') &&
        (!p.address || typeof p.address === 'string') && (!p.phone || /^[+\d\s().-]{8,24}$/.test(p.phone))
      )) throw new Error('Base inválida');
      providers = data.providers;
      available = true;
      populate(form.elements.state, providers.map((p) => p.state), 'Todos os estados da base');
      populate(form.elements.plan, providers.flatMap((p) => p.plans), 'Todos os produtos da base');
      populate(form.elements.type, providers.map((p) => p.type), 'Todos os tipos');
      form.querySelectorAll('[data-requires-source]').forEach((element) => { element.disabled = false; });
      badge.textContent = `Base consultada em ${new Date(data.updatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
      const link = document.createElement('a');
      link.href = source.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = data.source.label;
      provenance.replaceChildren(document.createTextNode('Origem dos dados: '), link);
      form.querySelector('[type="submit"]').textContent = 'Buscar na rede';
      form.querySelector('[type="submit"]').hidden = false;
      search();
    } catch {
      badge.textContent = 'Base oficial indisponível';
      status.textContent = 'Consulta automática ainda indisponível';
      empty('Vamos conferir a rede para você?', 'A base oficial atualizada ainda não está disponível nesta consulta. Informe sua cidade e o prestador que procura para pedir uma confirmação à equipe, sem sair para o portal da Amil.');
      form.querySelector('[type="submit"]').hidden = true;
    } finally {
      clearTimeout(timeout);
      updateHelp();
    }
  }
  updateHelp();
  load();
})();
