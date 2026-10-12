// Preparação pura; não faz uploads nem lê chaves do navegador.
function prepareSaleConversion(lead, settings = {}) {
  if (settings.enabled !== true) return { eligible: false, reason: 'integration_disabled' };
  const enabledAt = Date.parse(settings.enabledSince);
  if (!Number.isFinite(enabledAt) || !settings.conversionAction)
    return { eligible: false, reason: 'missing_configuration' };
  if (lead.source !== 'formulario' || lead.status !== 'Fechado')
    return { eligible: false, reason: 'not_a_form_sale' };
  if (!(Date.parse(lead.created_at) >= enabledAt && Date.parse(lead.closed_at) >= enabledAt))
    return { eligible: false, reason: 'before_activation' };
  if (!lead.tracking_consent || !lead.tracking_consent_at)
    return { eligible: false, reason: 'missing_consent' };
  const clickField = ['gclid', 'gbraid', 'wbraid'].find((field) => /^[A-Za-z0-9_-]{1,250}$/.test(lead[field] || ''));
  if (!clickField) return { eligible: false, reason: 'missing_click_id' };
  if (lead.sale_value == null || !Number.isFinite(Number(lead.sale_value)) || Number(lead.sale_value) <= 0)
    return { eligible: false, reason: 'missing_sale_value' };
  return { eligible: true, payload: {
    conversion_action: settings.conversionAction, [clickField]: lead[clickField],
    conversion_date_time: new Date(lead.closed_at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00:00'),
    conversion_value: Number(lead.sale_value), currency_code: 'BRL',
    order_id: `sale:${lead.id}`, consent: { ad_user_data: 'GRANTED' },
  } };
}
module.exports = { prepareSaleConversion };
