// API privada do CRM: lista os leads e atualiza status/anotações da equipe.
const { sendJson, readJson } = require('../lib/http');
const { hasValidSession } = require('../lib/session');

module.exports = async (req, res) => {
  const secret = process.env.CRM_ADMIN_PASSWORD;
  if (!secret || !hasValidSession(req, secret)) return sendJson(res, 401, { error: 'Faça login para continuar.' });

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return sendJson(res, 503, { error: 'Lead storage is not configured yet.' });

  try {
    if (req.method === 'GET') {
      const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads?select=id,created_at,name,email,phone,plan,lives,city,state,status,notes&order=created_at.desc&limit=1000`;
      const response = await fetch(url, { headers: { apikey: SUPABASE_SECRET_KEY } });
      if (!response.ok) return sendJson(res, 502, { error: 'Could not load leads.' });
      return sendJson(res, 200, { leads: await response.json() });
    }

    if (req.method === 'PATCH') {
      let input;
      try { input = readJson(req); } catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }
      const id = typeof input.id === 'string' ? input.id : '';
      const status = typeof input.status === 'string' ? input.status : '';
      const notes = typeof input.notes === 'string' ? input.notes.slice(0, 5000) : '';
      const statuses = ['Novo', 'Em contato', 'Cotação enviada', 'Fechado', 'Perdido'];
      if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.includes(status)) return sendJson(res, 400, { error: 'Dados inválidos.' });
      const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) return sendJson(res, 502, { error: 'Could not update this lead.' });
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    return sendJson(res, 502, { error: 'Could not reach the lead database.' });
  }
};
