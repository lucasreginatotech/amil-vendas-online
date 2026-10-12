// Recebe contatos públicos; a chave privada permanece somente no servidor.
const { sendJson, readJson } = require('../lib/http');
const { normalizeAttribution } = require('../lib/lead-attribution');
const { createHash, randomUUID } = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed' }); }
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return sendJson(res, 503, { error: 'Lead storage is not configured yet.' });
  let input;
  try { input = readJson(req); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(); }
  catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }
  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (input.submission_id != null && !UUID.test(input.submission_id)) return sendJson(res, 400, { error: 'Invalid submission identifier.' });
  const source = input.source === 'whatsapp' ? 'whatsapp' : 'formulario';
  const lead = {
    name: source === 'whatsapp' ? 'Interesse pelo WhatsApp' : clean(input.name, 160),
    email: source === 'whatsapp' ? null : clean(input.email, 254).toLowerCase(),
    phone: source === 'whatsapp' ? null : clean(input.phone, 40),
    plan: source === 'whatsapp' ? 'Contato iniciado pelo WhatsApp' : clean(input.plan, 100) || 'Ainda quero orientação',
    lives: source === 'whatsapp' || input.lives == null || input.lives === '' ? null : Number(input.lives),
    city: source === 'whatsapp' ? null : clean(input.city, 100) || null,
    state: source === 'whatsapp' ? null : clean(input.state, 100).toUpperCase() || null,
    consent: source === 'formulario' && input.consent === true,
    source, source_detail: clean(input.source_detail, 160) || (source === 'formulario' ? 'Formulário de cotação' : ''),
  };
  if (source === 'formulario' && (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)
    || !/^\d{10,11}$/.test(lead.phone.replace(/\D/g, ''))
    || (lead.lives !== null && (!Number.isInteger(lead.lives) || lead.lives < 1 || lead.lives > 999))
    || (lead.state !== null && !/^[A-Z]{2}$/.test(lead.state)) || !lead.consent))
    return sendJson(res, 400, { error: 'Please check the required fields and consent.' });
  const fingerprint = createHash('sha256').update(JSON.stringify(lead)).digest('hex');
  const submissionId = input.submission_id || randomUUID();
  const row = { ...lead, ...normalizeAttribution(input), submission_id: submissionId, submission_fingerprint: fingerprint };
  const root = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/leads';
  const headers = { apikey: SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' };
  try {
    // UNIQUE arbitra requisições concorrentes sem sobrescrever o primeiro contato.
    const response = await fetch(root + '?on_conflict=submission_id&select=id,submission_fingerprint', {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(row),
    });
    if (!response.ok) return sendJson(res, 502, { error: 'Could not save this lead.' });
    const inserted = await response.json();
    let saved = inserted[0];
    const duplicate = !saved;
    if (duplicate) {
      const existing = await fetch(root + '?submission_id=eq.' + submissionId + '&select=id,submission_fingerprint&limit=1', { headers });
      if (!existing.ok) throw new Error('Read failed');
      saved = (await existing.json())[0];
    }
    if (!saved || !UUID.test(saved.id)) throw new Error('Missing persisted contact');
    if (saved.submission_fingerprint !== fingerprint) return sendJson(res, 409, { error: 'Submission identifier already used for different data.' });
    return sendJson(res, 200, { ok: true, id: saved.id, duplicate });
  } catch { return sendJson(res, 502, { error: 'Could not reach the lead database.' }); }
};
