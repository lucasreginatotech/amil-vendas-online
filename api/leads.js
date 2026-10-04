// Recebe cotações públicas, valida os campos e grava leads no Supabase.
const { sendJson } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return sendJson(res, 503, { error: 'Lead storage is not configured yet.' });
  }

  let input;
  try {
    input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return sendJson(res, 400, { error: 'Invalid request body.' });
  }

  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const source = input.source === 'whatsapp' ? 'whatsapp' : 'formulario';
  const sourceDetail = clean(input.source_detail, 160);

  // Registra cliques nos links diretos sem inventar nome, telefone ou e-mail.
  if (source === 'whatsapp') {
    try {
      const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          name: 'Interesse pelo WhatsApp',
          email: null,
          phone: null,
          plan: 'Contato iniciado pelo WhatsApp',
          lives: null,
          city: null,
          state: null,
          consent: false,
          source,
          source_detail: sourceDetail,
        }),
      });
      if (!response.ok) return sendJson(res, 502, { error: 'Could not save this WhatsApp lead.' });
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 502, { error: 'Could not reach the lead database.' });
    }
  }

  const email = clean(input.email, 254).toLowerCase();
  const name = clean(input.name, 160);
  const phone = clean(input.phone, 40);
  const plan = clean(input.plan, 100);
  const lives = Number(input.lives);
  const city = clean(input.city, 100);
  const state = clean(input.state, 2).toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !phone || !plan || !Number.isInteger(lives) || lives < 1 || lives > 999 || !city || !/^[A-Z]{2}$/.test(state) || input.consent !== true) {
    return sendJson(res, 400, { error: 'Please check the required fields and consent.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name, email, phone, plan, lives, city, state, consent: true, source: 'formulario', source_detail: sourceDetail || 'Formulário de cotação' }),
    });

    if (!response.ok) return sendJson(res, 502, { error: 'Could not save this lead.' });
    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 502, { error: 'Could not reach the lead database.' });
  }
};
