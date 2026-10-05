// Search names and cities; preserve product coverage in the original source row.
import { filterProviders, normalize, validateNetwork } from './network-data.js';

const form = document.querySelector('#networkForm');
if (form) {
  const results = document.querySelector('#networkResults');
  const status = document.querySelector('#networkStatus');
  const badge = document.querySelector('#networkSourceBadge');
  const more = document.querySelector('#networkMore');
  const help = document.querySelector('#networkHelp');
  const suggestions = document.querySelector('#networkSuggestions');
  const dialog = document.querySelector('#networkDetail');
  let data,
    matches = [],
    visible = 12,
    searchTimer,
    lastDetailTrigger;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function quoteLink(provider) {
    const number = window.SITE_CONFIG?.whatsappNumber;
    if (!/^\d{12,15}$/.test(number || '')) return 'index.html#contato';
    const message = [
      'Olá! Quero uma cotação de plano Amil.',
      `Cidade: ${provider?.city || form.elements.city.value || 'A definir'}`,
      form.elements.region.value
        ? `Região: ${form.elements.region.selectedOptions[0].textContent}`
        : '',
      provider ? `Prestador de interesse: ${provider.name}` : '',
      'Ainda não escolhi o plano. Quero confirmar o produto e a unidade que atendem minha necessidade.',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function openDetails(provider, trigger) {
    lastDetailTrigger = trigger;
    document.querySelector('#networkDetailTitle').textContent = provider.name;
    document.querySelector('#networkDetailLocation').textContent = [
      provider.city || 'Cidade da unidade não informada na fonte',
      provider.region,
    ].join(' · ');
    const image = document.querySelector('#networkDetailImage');
    const header = document.querySelector('#networkDetailHeader');
    document.querySelector('#networkImageError').hidden = true;
    image.onerror = header.onerror = () => {
      document.querySelector('#networkImageError').hidden = false;
    };
    image.src = provider.evidence.image;
    header.src = provider.evidence.header;
    image.alt = `Linha original de ${provider.name}, com os produtos e os códigos de atendimento da gravação.`;
    document.querySelector('#networkDetailTime').textContent =
      `Trecho da gravação: aproximadamente ${provider.evidence.timeSeconds.toLocaleString('pt-BR')} segundos. Os títulos e a linha foram reunidos sem alterar as células de atendimento.`;
    document.querySelector('#networkDetailQuote').href = quoteLink(provider);
    document.querySelector('#networkMatrixScroll').scrollLeft = 0;
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  function card(provider) {
    const node = element('article', '', 'provider-card');
    node.append(element('span', provider.type, 'provider-type'), element('h3', provider.name));
    node.append(
      element(
        'p',
        provider.city ? `${provider.city} · SP` : 'Cidade da unidade não informada',
        'provider-location',
      ),
    );
    node.append(
      element(
        'p',
        provider.region === 'Laboratórios'
          ? 'Laboratório listado no material de São Paulo.'
          : `Região na fonte: ${provider.region}`,
        'provider-region',
      ),
    );
    node.append(
      element('p', 'A disponibilidade depende do produto e da unidade.', 'provider-note'),
    );
    const actions = element('div', '', 'provider-actions');
    const quote = element(
      'a',
      'Quero um plano com este prestador ↗',
      'button button-primary button-small',
    );
    quote.href = quoteLink(provider);
    quote.target = '_blank';
    quote.rel = 'noopener noreferrer';
    const detail = element('button', 'Consultar detalhes da fonte', 'text-link provider-detail');
    detail.type = 'button';
    detail.setAttribute('aria-haspopup', 'dialog');
    detail.addEventListener('click', () => openDetails(provider, detail));
    actions.append(quote, detail);
    node.append(actions);
    return node;
  }

  function render() {
    results.replaceChildren();
    if (!matches.length) {
      results.className = '';
      const box = element('div', '', 'network-empty');
      box.append(
        element('h3', 'Nenhum prestador encontrado com esses filtros'),
        element(
          'p',
          'Tente outra cidade ou nome. A ausência nesta gravação não confirma que um prestador esteja fora da rede. Nossa equipe pode conferir para você.',
        ),
      );
      results.append(box);
    } else {
      results.className = 'network-cards';
      matches.slice(0, visible).forEach((provider) => results.append(card(provider)));
    }
    more.hidden = matches.length <= visible;
    more.textContent = `Ver todos os resultados (${matches.length} prestadores)`;
  }

  function cityButton(city) {
    const button = element('button', city, 'network-city-chip');
    button.type = 'button';
    button.addEventListener('click', () => {
      form.elements.city.value = city;
      search();
    });
    return button;
  }

  function relatedCities(filters) {
    suggestions.replaceChildren();
    const exact = data.providers.filter(
      (p) =>
        p.city &&
        (!filters.region || p.region === filters.region) &&
        normalize(p.city) === normalize(filters.city),
    );
    const regions = new Set(exact.filter((p) => p.region !== 'Laboratórios').map((p) => p.region));
    const cities = [
      ...new Set(
        data.providers
          .filter(
            (p) => p.city && regions.has(p.region) && normalize(p.city) !== normalize(filters.city),
          )
          .map((p) => p.city),
      ),
    ]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .slice(0, 6);
    if (!cities.length) return;
    suggestions.append(element('p', 'Explore outras cidades do mesmo agrupamento da fonte:'));
    const buttons = element('div', '', 'network-city-chips');
    cities.forEach((city) => buttons.append(cityButton(city)));
    suggestions.append(buttons);
  }

  function search() {
    help.href = quoteLink();
    if (!data) return;
    const filters = {
      city: form.elements.city.value,
      region: form.elements.region.value,
      query: form.elements.query.value,
      type: form.elements.type.value,
      includeUnknown: form.elements.includeUnknown.checked,
    };
    matches = filterProviders(data.providers, filters);
    visible = 12;
    const unknown = matches.filter((p) => !p.city).length;
    status.textContent = `${matches.length} ${matches.length === 1 ? 'prestador encontrado' : 'prestadores encontrados'}${unknown ? ` · ${unknown} sem cidade informada` : ''}`;
    render();
    relatedCities(filters);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(searchTimer);
    search();
  });
  form.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 200);
  });
  form.addEventListener('change', () => {
    clearTimeout(searchTimer);
    search();
  });
  form.addEventListener('reset', () => {
    clearTimeout(searchTimer);
    setTimeout(search, 0);
  });
  more.addEventListener('click', () => {
    const start = visible;
    visible = matches.length;
    render();
    status.textContent = `Todos os ${matches.length} prestadores da busca estão exibidos${matches.some((p) => !p.city) ? ' · Há prestadores sem cidade informada na fonte' : ''}`;
    const firstNew = results.children[start];
    firstNew?.querySelector('.provider-detail')?.focus({ preventScroll: true });
    firstNew?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'nearest',
    });
  });
  document.querySelector('#networkDetailClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => lastDetailTrigger?.focus({ preventScroll: true }));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  async function load() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('assets/data/network.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Fonte indisponível');
      const payload = await response.json();
      if (!validateNetwork(payload)) throw new Error('Base inválida');
      data = payload;
      const cities = [...new Set(data.providers.map((p) => p.city).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      );
      const list = document.querySelector('#networkCities');
      cities.forEach((city) => list.append(new Option(city, city)));
      const regions = [...new Set(data.providers.map((p) => p.region))];
      const preferred = [
        'Zona Sul - SP',
        'Zona Leste - SP',
        'Zona Oeste - SP',
        'Zona Norte - SP',
        'ABCD - SP',
      ];
      regions.sort((a, b) => {
        const rank = (region) =>
          preferred.includes(region) ? preferred.indexOf(region) : preferred.length;
        return rank(a) - rank(b) || a.localeCompare(b, 'pt-BR');
      });
      regions.forEach((region) =>
        form.elements.region.add(
          new Option(
            region === 'ABCD - SP' ? 'ABC Paulista' : region.replace(/ - SP$/, ''),
            region,
          ),
        ),
      );
      document.querySelector('#networkStats').textContent =
        `${data.providers.length} registros · ${cities.length} cidades identificadas · São Paulo`;
      badge.textContent = `Material de ${data.source.recordedAt.split('-').reverse().join('/')}`;
      document.querySelector('#networkProvenance').textContent =
        `${data.source.label}. ${data.source.note} Os detalhes mantêm as células da tabela original. Não há consulta em tempo real à operadora.`;
      form.querySelectorAll('[data-requires-source]').forEach((node) => {
        node.disabled = false;
      });
      document.querySelectorAll('[data-network-city]').forEach((button) => {
        button.addEventListener('click', () => {
          form.elements.city.value = button.dataset.networkCity;
          search();
        });
      });
      search();
    } catch {
      badge.textContent = 'Não foi possível carregar o material';
      status.textContent = 'Consulta indisponível no momento';
      results.replaceChildren(element('p', 'Recarregue a página ou peça uma cotação à equipe.'));
    } finally {
      clearTimeout(timeout);
      help.href = quoteLink();
    }
  }
  load();
}
