// Só UUIDs, hashes e recibos técnicos são persistidos; nunca os campos de contato.
(() => {
  const KEY = 'amil_submission_v1';
  const TTL = 24 * 60 * 60 * 1000;
  let previous;
  const tracked = new Set();
  const read = (key) => { try { return JSON.parse(window.sessionStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const uuid = () => window.crypto.randomUUID();
  async function prepare(payload) {
    const snapshot = JSON.stringify(payload);
    let digest;
    try {
      const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
      digest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
    } catch { digest = null; }
    const saved = digest ? read(KEY) : null;
    if (previous?.snapshot === snapshot && Date.now() - previous.at < TTL) return previous.id;
    const validSaved = saved && saved.digest === digest && Date.now() - saved.at < TTL
      && /^[0-9a-f-]{36}$/i.test(saved.id);
    const id = validSaved ? saved.id : uuid();
    previous = { snapshot, id, at: Date.now() };
    if (digest) write(KEY, { digest, id, at: previous.at });
    return id;
  }
  function hasTracked(id) {
    const receipt = read(`${KEY}_conversion_${id}`);
    return tracked.has(id) || Boolean(receipt && Date.now() - receipt.at < TTL);
  }
  function markTracked(id) { tracked.add(id); write(`${KEY}_conversion_${id}`, { at: Date.now() }); }
  window.SITE_SUBMISSION = { prepare, uuid, hasTracked, markTracked };
})();
