import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { filterProviders, validateNetwork } from '../assets/js/network-data.js';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('assets/data/network.json', root), 'utf8'));
assert.equal(validateNetwork(data), true, 'O catálogo precisa cumprir o contrato de dados.');
assert.equal(data.providers.length, 446);
assert.equal(new Set(data.providers.map((p) => p.city).filter(Boolean)).size, 120);
for (const provider of data.providers) {
  await access(new URL(provider.evidence.image, root));
  await access(new URL(provider.evidence.header, root));
}

const campinas = filterProviders(data.providers, { city: 'Campinas' });
assert.ok(campinas.length > 0);
assert.ok(
  campinas.every((p) => p.city === 'Campinas'),
  'Não atribuir laboratórios sem unidade a uma cidade.',
);
assert.deepEqual(
  filterProviders(data.providers, { city: 'sao bernardo do campo' }),
  filterProviders(data.providers, { city: 'São Bernardo do Campo' }),
);
assert.equal(filterProviders(data.providers, { city: 'Cidade não cadastrada' }).length, 0);
assert.equal(
  filterProviders(data.providers, { city: 'Campinas', query: 'Fleury', type: 'Laboratório' })
    .length,
  0,
);
assert.equal(filterProviders(data.providers, { query: 'Fleury', type: 'Laboratório' }).length, 2);
assert.equal(
  filterProviders(data.providers, { query: 'Fleury', type: 'Laboratório', includeUnknown: true })
    .length,
  2,
);
const unknown = filterProviders(data.providers, { city: 'Campinas', includeUnknown: true }).filter(
  (p) => !p.city,
);
assert.equal(unknown.length, 128);
assert.ok(
  filterProviders(data.providers, { city: 'Santos', type: 'Laboratório' }).every(
    (p) => p.type === 'Laboratório' && p.city === 'Santos',
  ),
);
assert.equal(
  validateNetwork({ ...data, providers: [data.providers[0], data.providers[0]] }),
  false,
);
assert.equal(
  validateNetwork({
    ...data,
    providers: [
      {
        ...data.providers[0],
        evidence: { ...data.providers[0].evidence, image: 'https://example.com/image.png' },
      },
    ],
  }),
  false,
);
assert.equal(validateNetwork({ ...data, providers: [{ ...data.providers[0], city: '' }] }), false);
assert.equal(validateNetwork({ ...data, providers: [null] }), false);
for (const region of [
  'Zona Sul - SP',
  'Zona Leste - SP',
  'Zona Oeste - SP',
  'Zona Norte - SP',
  'ABCD - SP',
]) {
  const expected = data.providers.filter((p) => p.region === region);
  const actual = filterProviders(data.providers, { region, includeUnknown: true });
  assert.ok(actual.length > 0, `A região ${region} precisa ter resultados.`);
  assert.deepEqual(
    new Set(actual.map((p) => p.id)),
    new Set(expected.map((p) => p.id)),
    'Preservar exatamente o agrupamento da fonte, sem misturar as zonas da capital com a Grande SP.',
  );
}
assert.equal(
  filterProviders(data.providers, { region: 'Zona Sul - SP', city: 'Campinas' }).length,
  0,
);
assert.ok(
  filterProviders(data.providers, { region: 'ABCD - SP', city: 'São Bernardo do Campo' }).length >
    0,
);
assert.equal(filterProviders(data.providers, { region: 'Zona desconhecida' }).length, 0);
console.log('Catálogo, imagens, filtros, acentos e isolamento das cidades: OK (446 registros).');
