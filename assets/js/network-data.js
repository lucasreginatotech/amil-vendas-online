export const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function filterProviders(
  providers,
  { city = '', region = '', query = '', type = '', includeUnknown = false } = {},
) {
  const place = normalize(city);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return providers
    .filter((provider) => {
      const cityMatches = provider.city
        ? !place || normalize(provider.city).includes(place)
        : !place || includeUnknown;
      const text = normalize(`${provider.name} ${provider.region} ${provider.city || ''}`);
      return (
        cityMatches &&
        (!region || provider.region === region) &&
        (!type || provider.type === type) &&
        words.every((word) => text.includes(word))
      );
    })
    .sort((a, b) => Number(!a.city) - Number(!b.city) || a.name.localeCompare(b.name, 'pt-BR'));
}

export function validateNetwork(data) {
  return (
    data?.schemaVersion === 2 &&
    data.status === 'ready' &&
    data.source?.kind === 'supplied_recording' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.source.recordedAt || '') &&
    typeof data.source.label === 'string' &&
    typeof data.source.note === 'string' &&
    Array.isArray(data.providers) &&
    data.providers.length > 0 &&
    data.providers.every((p) => p && typeof p === 'object') &&
    new Set(data.providers.map((p) => p.id)).size === data.providers.length &&
    data.providers.every(
      (p) =>
        /^sp-\d{3}$/.test(p.id) &&
        typeof p.name === 'string' &&
        p.name.trim() &&
        (p.city === null || (typeof p.city === 'string' && p.city.trim())) &&
        p.state === 'SP' &&
        typeof p.region === 'string' &&
        ['Laboratório', 'Hospital ou unidade de atendimento'].includes(p.type) &&
        p.evidence?.image === `assets/data/network-source/${p.id}.png` &&
        [
          'assets/data/network-source/header-1.png',
          'assets/data/network-source/header-29.png',
        ].includes(p.evidence.header) &&
        Number.isFinite(p.evidence.timeSeconds) &&
        p.evidence.timeSeconds >= 0,
    )
  );
}
