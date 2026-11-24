// Nodo Code «Preparar registro masivo» (una vez para todos los ítems).
// Entrada: ítems como los que deja «Pasar a códigos DT» (fila, datos, estado, nombre, trabajador, alertas)
// más los campos de «Configuración» (urlSitio, repLegalRut, emailEmpleador, telefonoEmpleador, caeSitio, rutEmpleador).
// El registro masivo es POR CARGO y por CAE: se arma un archivo CSV por cada cargo distinto.
const ROBOT = __ROBOT__;
const COLUMNAS = __COLS__;
const OMITIR = "export default async () => ({ data: { ok: false, paso: 'omitido' }, type: 'application/json' });";
const celda = (v) => { v = v == null ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const toCSV = (filas) => '﻿' + [COLUMNAS].concat(filas.map((f) => COLUMNAS.map((c) => f[c] == null ? '' : f[c]))).map((r) => r.map(celda).join(';')).join('\r\n') + '\r\n';

const items = $input.all().map((it) => it.json);
const cfg = items[0] || {};
const mes = $now.setZone('America/Santiago').toFormat('yyyyLL');
const out = [];
const grupos = {};
for (const j of items) {
  const motivo = !j.fila ? 'el ítem no trae la fila de códigos DT' : (j.estado && j.estado !== 'en CSV' ? 'el contrato quedó "' + j.estado + '"' : null);
  if (motivo) { out.push({ json: { tipo: 'omitido', nombre: j.nombre, trabajador: j.trabajador, estado: j.estado, alertas: j.alertas || [], motivoOmitido: motivo, cuerpo: { code: OMITIR, context: {} } } }); continue; }
  const cargo = ((j.datos || {}).cargo || 'Sin cargo informado').trim();
  (grupos[cargo] = grupos[cargo] || []).push(j);
}
const cargos = Object.keys(grupos);
cargos.forEach((cargo, i) => {
  const lista = grupos[cargo];
  // Si hay más de un cargo, los archivos del mismo mes se distinguen en el nombre interno (el sitio solo exige rutempleador_aaaamm).
  const archivo = (cfg.rutEmpleador || '76123456-0') + '_' + mes + '.csv';
  out.push({ json: {
    tipo: 'archivo', archivo, cargo, total: lista.length,
    contratos: lista.map((x) => ({ nombre: x.nombre, trabajador: x.trabajador, alertas: x.alertas || [] })),
    cuerpo: { code: ROBOT, context: { url: cfg.urlSitio, rep: cfg.repLegalRut, email: cfg.emailEmpleador, tel: cfg.telefonoEmpleador, cae: cfg.caeSitio, cargo, archivo, csv: toCSV(lista.map((x) => x.fila)) } }
  } });
});
return out;
