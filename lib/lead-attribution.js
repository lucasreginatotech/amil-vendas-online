const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const CLICK_FIELDS = ['gclid', 'gbraid', 'wbraid'];
function normalizeAttribution(input) {
  const consent = input.tracking_consent === true;
  const data = input.attribution && typeof input.attribution === 'object' ? input.attribution : {};
  const result = { tracking_consent: consent, tracking_consent_at: null };
  for (const field of [...UTM_FIELDS, ...CLICK_FIELDS]) {
    const value = typeof data[field] === 'string' ? data[field].trim() : '';
    result[field] = consent && value && value.length <= (CLICK_FIELDS.includes(field) ? 250 : 200)
      && !/[\x00-\x1f\x7f]/.test(value)
      && (!CLICK_FIELDS.includes(field) || /^[A-Za-z0-9_-]+$/.test(value)) ? value : null;
  }
  const now = Date.now();
  const consentAt = Date.parse(input.tracking_consent_at);
  if (consent && Number.isFinite(consentAt) && consentAt <= now && consentAt > now - 180 * 86400000) {
    result.tracking_consent_at = new Date(consentAt).toISOString();
  } else {
    result.tracking_consent = false;
    for (const field of [...UTM_FIELDS, ...CLICK_FIELDS]) result[field] = null;
  }
  const capturedAt = Date.parse(data.attribution_captured_at);
  result.attribution_captured_at = result.tracking_consent && Number.isFinite(capturedAt)
    && capturedAt <= now && capturedAt > now - 30 * 86400000 ? new Date(capturedAt).toISOString() : null;
  if (!result.attribution_captured_at) for (const field of [...UTM_FIELDS, ...CLICK_FIELDS]) result[field] = null;
  return result;
}
module.exports = { normalizeAttribution, UTM_FIELDS, CLICK_FIELDS };
