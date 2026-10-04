const crypto = require('node:crypto');
const { sendJson, readJson } = require('../lib/http');
const { setSessionCookie, clearSessionCookie } = require('../lib/session');

function sameSecret(a, b) {
  const left = Buffer.from(a || '');
  const right = Buffer.from(b || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = async (req, res) => {
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const { CRM_ADMIN_PASSWORD } = process.env;
  if (!CRM_ADMIN_PASSWORD) return sendJson(res, 503, { error: 'CRM login is not configured yet.' });

  let input;
  try { input = readJson(req); } catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }
  if (!sameSecret(input.password, CRM_ADMIN_PASSWORD)) return sendJson(res, 401, { error: 'Senha incorreta.' });

  setSessionCookie(res, CRM_ADMIN_PASSWORD);
  return sendJson(res, 200, { ok: true });
};
