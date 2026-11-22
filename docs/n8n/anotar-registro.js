// Nodo Code «Anotar registro» (una vez por ítem): junta lo que devolvió el robot con los datos del contrato.
const j = $json;
const prev = $('Preparar registro individual').item.json;
const msgDe = (e) => typeof e === 'string' ? e : (e && (e.message || e.description)) || JSON.stringify(e);
const r = j && j.data && typeof j.data === 'object' && ('ok' in j.data || 'paso' in j.data) ? j.data : j;
let res;
if (j.error) res = { ok: false, paso: 'browserless', error: 'No se pudo usar Browserless: ' + msgDe(j.error) };
else if (typeof r.ok !== 'boolean') res = { ok: false, paso: 'browserless', error: 'Browserless respondió algo inesperado: ' + JSON.stringify(r).slice(0, 300) };
else res = r;
const { captura, ...resto } = res;
const omitido = resto.paso === 'omitido';
const out = { json: {
  nombre: prev.nombre || null, trabajador: prev.trabajador || null, estado: prev.estado || null, alertas: prev.alertas || [],
  intentado: !omitido, registrado: resto.ok === true, folio: resto.folio || null, paso: resto.paso || null,
  error: omitido ? 'No se registró: ' + prev.motivoOmitido : (resto.error || null), errores: resto.errores || [], pasos: resto.pasos || []
} };
if (captura) out.binary = { data: { data: captura, mimeType: 'image/png', fileName: 'registro ' + (resto.folio || prev.nombre || 'contrato') + '.png', fileExtension: 'png' } };
return out;
