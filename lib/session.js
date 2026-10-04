const crypto = require('node:crypto');

const COOKIE_NAME = 'amil_crm_session';

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function setSessionCookie(res, secret) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const value = `${payload}.${sign(payload, secret)}`;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

function hasValidSession(req, secret) {
  const cookies = (req.headers.cookie || '').split(';').map((part) => part.trim());
  const entry = cookies.find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return false;
  const value = entry.slice(COOKIE_NAME.length + 1);
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp > Date.now();
  } catch {
    return false;
  }
}

module.exports = { setSessionCookie, clearSessionCookie, hasValidSession };
