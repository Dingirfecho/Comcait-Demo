// Nodo Code «Preparar registro individual» (una vez para todos los ítems).
// Entrada: ítems como los que deja «Pasar a códigos DT» de CARGA CONTRATOS (fila, datos, estado, nombre, trabajador, alertas)
// más los campos de «Configuración» (urlSitio, repLegalRut, emailEmpleador, telefonoEmpleador, caeSitio).
const ROBOT = __ROBOT__;
const OMITIR = "export default async () => ({ data: { ok: false, paso: 'omitido' }, type: 'application/json' });";
const out = [];
for (const it of $input.all()) {
  const j = it.json;
  const f = j.fila || null;
  const d = j.datos || {};
  const motivo = !f ? 'el ítem no trae la fila de códigos DT' : (j.estado && j.estado !== 'en CSV' ? 'el contrato quedó "' + j.estado + '"' : null);
  let registro = null;
  if (!motivo) {
    registro = Object.assign({}, f);
    for (const k of Object.keys(registro)) if (registro[k] === '') delete registro[k];
    registro.TIPO_DOC = f.RUT_TRABAJADOR ? 'rut' : 'otra';
    registro.REP_RUT = j.repLegalRut;
    registro.EMP_EMAIL = j.emailEmpleador;
    registro.EMP_TELEFONO = j.telefonoEmpleador;
    registro.EMP_CAE = j.caeSitio;
    registro.CARGO = d.cargo || 'Sin cargo informado';
    registro.EXCEPTUADO_DOMINGO = f.DOMINGO_HORA_INICIO ? '1' : '0';
    if (f.DECLARACION_DISCAPACIDAD === '1' || f.DECLARACION_INVALIDEZ === '1') registro.FECHA_ACREDITACION = f.FECHA_SUSCRPCION;
    // Cláusulas literales del contrato (si el prompt de GPT las pide); si no, se arman con los datos leídos.
    const dias = ((d.jornada || {}).dias || []).map((x) => x.dia + ' de ' + x.inicio + ' a ' + x.termino).join(', ');
    registro.CLAUSULA_REM = d.clausula_remuneraciones || ('Sueldo base mensual $' + (f.SUELDO_BASE || '') + (f.REM_OTROS_PACTOS ? '. ' + f.REM_OTROS_PACTOS : '') + '. Gratificación y demás haberes según detalle del registro.');
    registro.DISTRIB_JORNADA = d.clausula_jornada || ('Jornada ' + (f.DURACION_JORNADA || '') + ' horas semanales' + (dias ? ': ' + dias : '') + (f.TIEMPO_COLACION ? '. Colación de ' + f.TIEMPO_COLACION + ' minutos.' : '.'));
    if (d.otras_estipulaciones_texto) registro.OTRAS_ESTIPULACIONES = d.otras_estipulaciones_texto;
  }
  out.push({ json: { ...j, registro, motivoOmitido: motivo, cuerpo: { code: motivo ? OMITIR : ROBOT, context: { url: j.urlSitio, datos: registro || {} } } } });
}
return out;
