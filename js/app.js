// Comcait Demo — simulador del Registro Electrónico Laboral (contratos de trabajo).
// Todos los campos del formulario llevan data-field="<COLUMNA_CSV>" para que n8n / RPA pueda localizarlos.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = $('#app');
  const fmtDT = iso => new Date(iso).toLocaleString('es-CL');
  const monthTag = () => { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0'); };
  const today = () => { const d = new Date(); return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/'); };

  // ───────── Estado del formulario individual ─────────
  let DRAFT = null;          // {id, data, etapa}
  let ERRORS = [];           // errores de la etapa actual
  let MASIVO = null;         // estado de carga masiva en pantalla

  const STAGES = ['Identificación de las partes', 'Funciones y lugar de prestación de servicios', 'Remuneraciones', 'Jornada de trabajo y otras estipulaciones'];
  const idx = c => CSV_COLUMNS.indexOf(c);
  const STAGE_COLS = [
    CSV_COLUMNS.slice(0, idx('FUNCIONES')),
    CSV_COLUMNS.slice(idx('FUNCIONES'), idx('SUELDO_BASE')),
    CSV_COLUMNS.slice(idx('SUELDO_BASE'), idx('TIPO_JORNADA')),
    CSV_COLUMNS.slice(idx('TIPO_JORNADA'))
  ];

  function newDraft(data) {
    return { id: Store.uid(), etapa: 1, data: Object.assign({
      CATEGORIA_CONTRATO: '1', FECHA_SUSCRPCION: today(), TIPO_DOC: 'rut', DECLARACION_DISCAPACIDAD: '0', DECLARACION_INVALIDEZ: '0',
      SUBCONTRATACION: '0', EST: '0', REM_ANTICIPO: '1', GRAT_FORMA_PAGO: '1', OTROS_INDEMNIZACIONES: '0', OTROS_FERIADOS: '0',
      OTROS_NEGOCIACIONES: '0', OTROS_PROPINTELECTUAL: '0', OTROS_LICMEDICA: '0', OTROS_SALACUNA: '0', OTROS_PERMISOS: '0',
      OTROS_CONESPECIALES: '0', OTROS_SEGUROS: '0', OTROS_STOCK: '0', OTROS_INSTCOLECTIVO: '0', CAMBIO_DOMICILIO: '0',
      EMP_DOMICILIO: EMPLEADOR.domicilios[0].id
    }, data || {}) };
  }

  // Extras del formulario individual por etapa (no existen en el CSV masivo)
  function extraErrors(stage, d) {
    const e = [], need = (c, m) => { if (!String(d[c] ?? '').trim()) e.push({ col: c, msg: m }); };
    if (stage === 1) {
      need('REP_RUT', 'Seleccione el representante legal'); need('EMP_EMAIL', 'Correo del empleador es obligatorio');
      if (d.EMP_EMAIL && !V.isEmail(d.EMP_EMAIL)) e.push({ col: 'EMP_EMAIL', msg: 'Correo del empleador con formato inválido' });
      need('EMP_TELEFONO', 'Teléfono del empleador es obligatorio'); need('EMP_CAE', 'Seleccione el Código de Actividad Económica');
      if (d.CAMBIO_DOMICILIO === '1') need('COMUNA_PROCEDENCIA', 'Indique la comuna de procedencia');
      if (d.TIPO_DOC === 'otra') { if (d.RUT_TRABAJADOR) e.push({ col: 'RUT_TRABAJADOR', msg: 'Con "Otra identificación" no debe informar RUT' }); }
      if (d.DECLARACION_DISCAPACIDAD === '1' || d.DECLARACION_INVALIDEZ === '1') {
        if (!V.isDate(d.FECHA_ACREDITACION)) e.push({ col: 'FECHA_ACREDITACION', msg: 'Indique la fecha de acreditación (DD/MM/AAAA)' });
      }
    }
    if (stage === 2) need('CARGO', 'Indique el nombre del cargo');
    if (stage === 3) need('CLAUSULA_REM', 'Copie la cláusula de remuneraciones y asignaciones del contrato');
    if (stage === 4) {
      need('DISTRIB_JORNADA', 'Copie la distribución de jornada del contrato (incluya colación)');
      if (d.DOMINGO_HORA_INICIO && d.EXCEPTUADO_DOMINGO !== '1') e.push({ col: 'DOMINGO_HORA_INICIO', msg: 'Para registrar domingo active "Exceptuado de descanso en domingos y festivos" (Art. 38 inc. 1)' });
    }
    return e;
  }
  function stageErrors(stage, d) {
    const rec = recordFrom(d);
    const cols = STAGE_COLS[stage - 1];
    return V.validateRecord(rec).filter(x => cols.includes(x.col)).concat(extraErrors(stage, d));
  }
  // El formulario usa los mismos nombres que el CSV; completa lo derivado
  function recordFrom(d) {
    const r = Object.assign({}, d);
    if ([1, 2, 5, 8, 9].includes(Number(r.TIPO_JORNADA)) && !r.NRO_DIAS_DIST_JOR) {
      r.NRO_DIAS_DIST_JOR = String(DIAS.filter(x => r[x + '_HORA_INICIO'] || r[x + '_HORA_TERMINO']).length);
    }
    if (r.TIPO_DOC === 'otra') r.RUT_TRABAJADOR = '';
    return r;
  }

  // ───────── Helpers de UI ─────────
  const opts = (cat, sel, withBlank = true) =>
    (withBlank ? '<option value="">Seleccione…</option>' : '') +
    Object.entries(CAT[cat]).map(([k, v]) => `<option value="${k}" ${String(sel) === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const err = (col) => { const x = ERRORS.find(e => e.col === col); return x ? `<div class="fld-err">${esc(x.msg)}</div>` : ''; };
  const cls = col => ERRORS.some(e => e.col === col) ? ' invalid' : '';
  const D = () => (DRAFT ? DRAFT.data : {});
  const input = (col, label, o = {}) => `<div class="fg ${o.span ? 'span' + o.span : ''}"><label for="f-${col}">${label}${o.req === false ? '' : ' <b class="req">*</b>'}</label>
    <input id="f-${col}" data-field="${col}" type="${o.type || 'text'}" value="${esc(D()[col] ?? '')}" placeholder="${esc(o.ph || '')}" ${o.max ? `maxlength="${o.max}"` : ''} class="${cls(col)}">${o.hint ? `<small>${o.hint}</small>` : ''}${err(col)}</div>`;
  const select = (col, label, cat, o = {}) => `<div class="fg ${o.span ? 'span' + o.span : ''}"><label for="f-${col}">${label}${o.req === false ? '' : ' <b class="req">*</b>'}</label>
    <select id="f-${col}" data-field="${col}" ${o.rerender ? 'data-rerender="1"' : ''} class="${cls(col)}">${opts(cat, D()[col], o.blank !== false)}</select>${err(col)}</div>`;
  const toggle = (col, label, o = {}) => `<label class="switch" for="f-${col}"><input id="f-${col}" type="checkbox" data-field="${col}" data-bool="1" ${o.rerender ? 'data-rerender="1"' : ''} ${D()[col] === '1' ? 'checked' : ''}><span class="slider"></span><span>${label}</span></label>${err(col)}`;
  const textarea = (col, label, o = {}) => `<div class="fg span${o.span || 12}"><label for="f-${col}">${label}${o.req === false ? '' : ' <b class="req">*</b>'}</label>
    <textarea id="f-${col}" data-field="${col}" rows="${o.rows || 4}" ${o.max ? `maxlength="${o.max}"` : ''} class="${cls(col)}">${esc(D()[col] ?? '')}</textarea>${o.max ? `<small>${(D()[col] || '').length}/${o.max} caracteres</small>` : ''}${err(col)}</div>`;
  const comunaSel = (col, label, o = {}) => `<div class="fg ${o.span ? 'span' + o.span : ''}"><label for="f-${col}">${label}${o.req === false ? '' : ' <b class="req">*</b>'}</label>
    <select id="f-${col}" data-field="${col}" class="${cls(col)}"><option value="">Seleccione…</option>${Object.entries(CAT.COMUNAS).map(([k, v]) => `<option value="${k}" ${String(D()[col]) === k ? 'selected' : ''}>${esc(v)} (${k})</option>`).join('')}</select>${err(col)}</div>`;

  function layout(inner, crumbs) {
    const logged = Store.get('session');
    const mails = Store.get('mails').filter(m => !m.leido).length;
    return `<header class="top"><div class="wrap topin">
      <a class="brand" href="#/rel"><span class="logo">C</span><span><b>Comcait Demo</b><small>Simulador de Registro Electrónico Laboral</small></span></a>
      <nav>${logged ? `<a href="#/rel">Menú REL</a><a href="#/historial">Historial</a><a href="#/correos">Correos${mails ? ` <i class="badge">${mails}</i>` : ''}</a><a href="#/prefill">Integración n8n</a><a href="#/login" id="logout">Salir</a>` : ''}</nav></div></header>
      <div class="sim-banner">⚠ Entorno de demostración: no es el sitio oficial de ninguna institución y no envía datos a ningún organismo. Los datos viven solo en este navegador.</div>
      <main class="wrap">${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}${inner}</main>
      <footer class="wrap foot">Basado en la «Guía rápida Registro de Contrato de Trabajo» (v. 10.01.2024) e «Instructivo de Registro Masivo» (v. 21.04.22) · Comcait Demo</footer>`;
  }

  // ───────── Vistas ─────────
  const views = {};

  views.login = () => {
    Store.set('session', false);
    return `<div class="login"><div class="card"><h1>Ingreso empleador</h1><p>Acceso simulado. En el sitio real el empleador persona jurídica actúa a través de su representante laboral electrónico.</p>
    <div class="fg"><label>Empleador</label><input value="${esc(EMPLEADOR.razonSocial)} · ${EMPLEADOR.rut}" disabled></div>
    <div class="fg"><label for="rep">Ingresar como representante laboral</label><select id="rep">${EMPLEADOR.representantes.map(r => `<option>${esc(r.nombre)} · ${r.rut}</option>`).join('')}</select></div>
    <button class="btn primary" id="btn-login" data-testid="btn-login">Ingresar</button></div></div>`;
  };

  views.rel = () => layout(`<h1>Registro Electrónico Laboral</h1><p class="lead">Empleador: <b>${esc(EMPLEADOR.razonSocial)}</b> · RUT ${EMPLEADOR.rut}</p>
    <div class="cards">
      <a class="tile" href="#/contrato" data-testid="card-registro-contrato"><h3>Registro de Contrato de Trabajo</h3><p>Registre uno o más contratos suscritos con sus trabajadores.</p><span class="btn small">Ingresar</span></a>
      <div class="tile off"><h3>Registro de Anexo de Contrato</h3><p>No incluido en esta demo.</p></div>
      <div class="tile off"><h3>Registro de Término de Relación Laboral</h3><p>No incluido en esta demo.</p></div>
      <a class="tile" href="#/historial" data-testid="card-historial"><h3>Historial de Registro Electrónico Laboral</h3><p>Contratos registrados, versión, estado y comprobantes.</p><span class="btn small">Ingresar</span></a>
    </div>`, 'Menú REL');

  views.contrato = () => layout(`<h1>Registro de Contrato de Trabajo</h1>
    <div class="cards">
      <a class="tile" href="#/ind/1" id="card-individual" data-testid="card-individual" data-new="1"><h3>Registro de Contrato de Trabajo Individual</h3><p>Formulario en 4 etapas.</p><span class="btn small">Ingresar</span></a>
      <a class="tile" href="#/masivo" data-testid="card-masivo"><h3>Registro Masivo de Contrato de Trabajo</h3><p>Carga de archivo CSV (hasta 1.000 filas) por cargo y por CAE.</p><span class="btn small">Ingresar</span></a>
      <a class="tile" href="#/borradores" data-testid="card-borradores"><h3>Borradores Registro de Contrato de Trabajo</h3><p>Retome un registro inconcluso (${Store.get('drafts').length}).</p><span class="btn small">Ingresar</span></a>
    </div>`, '<a href="#/rel">Menú REL</a> › Registro de Contrato de Trabajo');

  views.borradores = () => {
    const l = Store.get('drafts');
    return layout(`<h1>Borradores</h1>${l.length ? `<table class="tbl"><thead><tr><th>Trabajador</th><th>Etapa</th><th>Última modificación</th><th></th></tr></thead><tbody>${l.map(d => `
      <tr><td>${esc(Store.workerName(d.data) || Store.workerId(d.data) || '(sin identificar)')}</td><td>${d.etapa} de 4</td><td>${fmtDT(d.updated)}</td>
      <td class="act"><button class="btn small" data-act="resume" data-id="${d.id}">Continuar</button> <button class="btn small danger" data-act="del-draft" data-id="${d.id}">Eliminar</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No hay borradores. Al avanzar a la etapa 2 el sistema guarda automáticamente lo ingresado.</p>'}`,
      '<a href="#/rel">Menú REL</a> › <a href="#/contrato">Registro de Contrato</a> › Borradores');
  };

  // ───── Individual ─────
  function stepper(n) {
    return `<ol class="stepper">${STAGES.map((s, i) => `<li class="${i + 1 === n ? 'cur' : i + 1 < n ? 'done' : ''}"><span>${i + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
  }
  function errSummary() {
    return ERRORS.length ? `<div class="errbox" role="alert"><b>Revise los siguientes campos:</b><ul>${ERRORS.map(e => `<li>${esc(e.msg)}</li>`).join('')}</ul></div>` : '';
  }

  function stage1() {
    const d = D(), emp = EMPLEADOR, dom = emp.domicilios.find(x => x.id === d.EMP_DOMICILIO) || emp.domicilios[0];
    const rep = emp.representantes.find(r => r.rut === d.REP_RUT);
    const isRut = d.TIPO_DOC !== 'otra';
    return `<section><h2>Lugar y fecha de contrato</h2><div class="grid">
      ${comunaSel('COMUNA_CELEBRACION', 'Lugar de celebración (comuna)', { span: 6 })}${input('FECHA_SUSCRPCION', 'Fecha de suscripción', { span: 6, ph: 'DD/MM/AAAA' })}</div></section>
    <section><h2>Antecedentes del empleador/a</h2><p class="muted">Datos obtenidos desde el SII y el Registro Civil (simulado).</p><div class="grid">
      <div class="fg span6"><label>Nombre o razón social</label><input value="${esc(emp.razonSocial)}" disabled></div><div class="fg span6"><label>RUT empleador</label><input value="${emp.rut}" disabled></div>
      <div class="fg span6"><label for="f-REP_RUT">RUT representante legal <b class="req">*</b></label><select id="f-REP_RUT" data-field="REP_RUT" data-rerender="1" class="${cls('REP_RUT')}"><option value="">Seleccione…</option>${emp.representantes.map(r => `<option value="${r.rut}" ${d.REP_RUT === r.rut ? 'selected' : ''}>${r.rut}</option>`).join('')}</select>${err('REP_RUT')}</div>
      <div class="fg span6"><label>Nombre y apellido representante</label><input value="${esc(rep ? rep.nombre : '')}" disabled></div>
      ${input('EMP_EMAIL', 'Correo electrónico', { span: 6, type: 'email', ph: 'xx@yy.zz' })}${input('EMP_TELEFONO', 'Teléfono', { span: 6 })}
      <div class="fg span6"><label for="f-EMP_DOMICILIO">Domicilio</label><select id="f-EMP_DOMICILIO" data-field="EMP_DOMICILIO" data-rerender="1">${emp.domicilios.map(x => `<option value="${x.id}" ${x.id === dom.id ? 'selected' : ''}>${esc(x.calle)} ${x.numero}, ${esc(CAT.COMUNAS[x.comunaCod])}</option>`).join('')}</select></div>
      <div class="fg span6"><label>Región · Comuna · Calle · N° · Depto.</label><input disabled value="${esc(dom.region)} · ${esc(CAT.COMUNAS[dom.comunaCod])} · ${esc(dom.calle)} · ${dom.numero} · ${esc(dom.dpto)}"></div>
      <div class="fg span6"><label for="f-EMP_CAE">Código de Actividad Económica (CAE) <b class="req">*</b></label><select id="f-EMP_CAE" data-field="EMP_CAE" class="${cls('EMP_CAE')}"><option value="">Seleccione…</option>${emp.caes.map(c => `<option value="${c.cod}" ${d.EMP_CAE === c.cod ? 'selected' : ''}>${c.cod === 'otro' ? 'Otro' : c.cod + ' — ' + esc(c.glosa)}</option>`).join('')}</select>${err('EMP_CAE')}</div></div></section>
    <section><h2>Antecedentes del trabajador/a</h2><div class="grid">
      <div class="fg span6"><label for="f-TIPO_DOC">Tipo de documento de identificación</label><select id="f-TIPO_DOC" data-field="TIPO_DOC" data-rerender="1"><option value="rut" ${isRut ? 'selected' : ''}>Cédula de identidad (RUT)</option><option value="otra" ${!isRut ? 'selected' : ''}>Otra identificación (DNI / pasaporte)</option></select></div>
      ${isRut ? input('RUT_TRABAJADOR', 'RUT del trabajador', { span: 6, ph: '12345678-5', hint: 'Sin puntos, con guion.' }) : input('DNI_TRABAJADOR', 'DNI o pasaporte', { span: 6 })}
      ${isRut ? `<div class="fg span12"><small class="muted">Nombres, apellidos, nacionalidad, fecha de nacimiento y sexo se obtienen del Registro Civil (simulado: ${esc(Store.SRCEI[d.RUT_TRABAJADOR] || 'no hay datos de demostración para este RUT')}).</small></div>`
        : `${input('NOMBRES', 'Nombres', { span: 6 })}${input('APELLIDOS', 'Apellidos', { span: 6 })}${select('NACIONALIDAD', 'Nacionalidad', 'NACIONALIDAD', { span: 4 })}${input('FECHA_NACIMIENTO', 'Fecha de nacimiento', { span: 4, ph: 'DD/MM/AAAA' })}${select('SEXO', 'Sexo', 'SEXO', { span: 4 })}`}
      ${input('EMAIL', 'Correo electrónico', { span: 6, req: false, type: 'email' })}${input('TELEFONO', 'Teléfono (sin código de país)', { span: 6, req: false, ph: '912345678' })}
      ${comunaSel('COMUNA', 'Comuna de residencia', { span: 4 })}${input('CALLE', 'Calle', { span: 4 })}${input('NUMERO', 'Número', { span: 2 })}${input('DPTO', 'Depto./casa', { span: 2, req: false })}
      <div class="fg span12">${toggle('CAMBIO_DOMICILIO', 'La contratación implicó cambio de domicilio del trabajador', { rerender: true })}</div>
      ${d.CAMBIO_DOMICILIO === '1' ? comunaSel('COMUNA_PROCEDENCIA', 'Comuna de procedencia', { span: 6 }) : ''}</div></section>
    <section><h2>Inclusión laboral de personas con discapacidad (Ley 21.015)</h2><div class="grid">
      <div class="fg span6">${toggle('DECLARACION_DISCAPACIDAD', 'Trabajador en situación de discapacidad', { rerender: true })}</div>
      <div class="fg span6">${toggle('DECLARACION_INVALIDEZ', 'Asignatario de pensión de invalidez', { rerender: true })}</div>
      ${(d.DECLARACION_DISCAPACIDAD === '1' || d.DECLARACION_INVALIDEZ === '1') ? input('FECHA_ACREDITACION', 'Fecha de acreditación ante la empresa', { span: 6, ph: 'DD/MM/AAAA' }) : ''}</div></section>`;
  }

  function stage2() {
    const d = D();
    return `<section><h2>Naturaleza de los servicios</h2><div class="grid">${input('CARGO', 'Nombre del cargo', { span: 12 })}${textarea('FUNCIONES', 'Funciones', { max: 300 })}</div></section>
    <section><h2>Lugar de prestación de los servicios</h2><p class="muted">Hasta 5 comunas de desempeño (más de 5 obliga a registro individual con detalle).</p><div class="grid">
      ${[1, 2, 3, 4, 5].map(i => comunaSel('ZONA_GEOGRAFICA_' + i, `Comuna de desempeño ${i}`, { span: 4, req: i === 1 && d.EST !== '1' })).join('')}</div></section>
    <section><h2>Régimen especial</h2><div class="grid">
      <div class="fg span6">${toggle('SUBCONTRATACION', 'Presta servicios para una empresa principal (subcontratación)', { rerender: true })}</div>
      ${d.SUBCONTRATACION === '1' ? input('RUT_EMPRESA_PRINCIPAL', 'RUT empresa principal', { span: 6, ph: '70345678-2' }) : '<div class="span6"></div>'}
      <div class="fg span6">${toggle('EST', 'Contratado para una empresa de servicios transitorios (EST)', { rerender: true })}</div>
      ${d.EST === '1' ? `${input('RUT_EMPRESA_USUARIA', 'RUT empresa usuaria', { span: 6 })}${comunaSel('FAENA_COMUNA', 'Comuna de la faena', { span: 4 })}${input('FAENA_CALLE', 'Calle', { span: 4 })}${input('FAENA_NUMERO', 'Número', { span: 2 })}${input('FAENA_DPTO', 'Depto.', { span: 2, req: false })}` : ''}</div></section>`;
  }

  function stage3() {
    const d = D();
    let n = 1; for (let i = 1; i <= 5; i++) if (d['HABER_' + i] || d['MONTO_' + i]) n = Math.max(n, i);
    n = Math.max(n, Number(d._haberes || 1)); d._haberes = n;
    const gf = String(d.GRAT_FORMA_PAGO || '');
    return `<section><h2>Remuneraciones</h2><div class="grid">${input('SUELDO_BASE', 'Sueldo base (CLP, sin puntos)', { span: 6, type: 'text', ph: '850000' })}${input('MONTO_IMPONIBLE', 'Monto imponible (CLP, sin puntos)', { span: 6, ph: '1000000' })}</div></section>
    <section><h2>Otros haberes pactados</h2><p class="muted">Hasta 5 estipendios. Si el haber se calcula con fórmula, ingrese monto 0.</p>
      ${Array.from({ length: n }, (_, k) => k + 1).map(i => `<div class="grid haber"><div class="fg span6"><label>Tipo de estipendio ${i}</label><select data-field="HABER_${i}" id="f-HABER_${i}" class="${cls('HABER_' + i)}">${opts('HABER', d['HABER_' + i])}</select>${err('HABER_' + i)}</div>
        ${input('MONTO_' + i, 'Monto', { span: 3, req: false })}<div class="fg span3"><label>Periodo de devengo</label><select data-field="PER_DEVENGAMIENTO_${i}" id="f-PER_DEVENGAMIENTO_${i}" class="${cls('PER_DEVENGAMIENTO_' + i)}">${opts('PER_DEVENGAMIENTO', d['PER_DEVENGAMIENTO_' + i])}</select>${err('PER_DEVENGAMIENTO_' + i)}</div></div>`).join('')}
      ${n < 5 ? '<button class="btn small" data-act="add-haber" data-testid="btn-add-haber">+ Agregar haber</button>' : ''} ${n > 1 ? '<button class="btn small" data-act="del-haber">Quitar último</button>' : ''}</section>
    <section><h2>Gratificación</h2><div class="grid">${select('GRAT_FORMA_PAGO', 'Tipo de gratificación pactada', 'GRAT_FORMA_PAGO', { span: 6, rerender: true })}
      ${['2', '3', '4'].includes(gf) ? select('GRAT_PERIODO_PAGO', 'Periodo de pago de la gratificación', 'PERIODO_PAGO', { span: 6 }) : '<div class="span6"></div>'}
      ${gf === '3' ? textarea('GRAT_MODALIDAD', 'Modalidad convencional superior al mínimo legal', { max: 2000, rows: 3 }) : ''}</div></section>
    <section><h2>Periodo y forma de pago</h2><div class="grid">${select('REM_PERIODO_PAGO', 'Periodo de pago', 'PERIODO_PAGO', { span: 4 })}${input('REM_FECHA_PAGO', 'Día de pago (1 a 30)', { span: 4 })}${select('REM_FORMA_PAGO', 'Forma de pago', 'REM_FORMA_PAGO', { span: 4 })}
      ${select('REM_ANTICIPO', 'Anticipo', 'REM_ANTICIPO', { span: 4 })}${select('REM_AFP', 'Régimen previsional (AFP)', 'REM_AFP', { span: 4 })}${select('REM_SALUD', 'Sistema de salud', 'REM_SALUD', { span: 4 })}
      ${textarea('REM_OTROS_PACTOS', 'Otros pactos de remuneraciones y beneficios', { req: false, max: 2000, rows: 3 })}
      ${textarea('CLAUSULA_REM', 'Remuneraciones y asignaciones (copie la cláusula del contrato, incluidas gratificaciones)', { rows: 5 })}</div></section>`;
  }

  function stage4() {
    const d = D(), tj = Number(d.TIPO_JORNADA || 0);
    const horario = [1, 2, 5, 8, 9].includes(tj);
    return `<section><h2>Jornada de trabajo</h2><div class="grid">${select('TIPO_JORNADA', 'Sistema de distribución de jornada', 'TIPO_JORNADA', { span: 6, rerender: true })}
      ${![6, 7].includes(tj) && tj ? input('DURACION_JORNADA', 'Duración de la jornada (horas, 1 a 180)', { span: 3 }) + select('TURNOS', 'Horarios y turnos', 'TURNOS', { span: 3 }) : '<div class="span6"></div>'}
      ${tj === 6 ? `${input('NRO_RESOLUCION', 'N° de resolución que autoriza la jornada excepcional', { span: 6, max: 12 })}${input('FECHA_RESOLUCION', 'Fecha de la resolución', { span: 6, ph: 'DD/MM/AAAA' })}` : ''}
      ${horario ? `${input('TIEMPO_COLACION', 'Tiempo de colación (min; 0 si no hay)', { span: 4 })}${input('T_COLACION_IMP', 'Colación imputable (min)', { span: 4 })}${input('T_COLACION_NO_IMP', 'Colación no imputable (min)', { span: 4 })}` : ''}
      ${[1, 2, 8, 9].includes(tj) ? select('ROTACION', 'Turno rotativo', 'ROTACION', { span: 6 }) : ''}
      ${[3, 4].includes(tj) ? input('NRO_DIAS_DIST_JOR', tj === 3 ? 'Número de días (7 a 12)' : 'Número de días (20 a 26)', { span: 6 }) : ''}
      <div class="fg span12">${toggle('EXCEPTUADO_DOMINGO', 'Trabajador exceptuado de descanso en domingos y festivos (Art. 38 inc. 1 Código del Trabajo)', { rerender: true })}</div></div></section>
    ${horario ? `<section><h2>Días de distribución de jornada</h2><p class="muted">Seleccione los días y su horario (HH:MM). La cantidad de días debe coincidir con el número de días.</p>
      <table class="tbl days"><thead><tr><th>Día</th><th>Hora inicio</th><th>Hora término</th></tr></thead><tbody>${DIAS.map(x => {
        const off = x === 'DOMINGO' && d.EXCEPTUADO_DOMINGO !== '1';
        return `<tr class="${off ? 'off' : ''}"><td>${DIAS_LABEL[x]}</td><td><input type="time" data-field="${x}_HORA_INICIO" id="f-${x}_HORA_INICIO" value="${esc(d[x + '_HORA_INICIO'] || '')}" ${off ? 'disabled' : ''}></td><td><input type="time" data-field="${x}_HORA_TERMINO" id="f-${x}_HORA_TERMINO" value="${esc(d[x + '_HORA_TERMINO'] || '')}" ${off ? 'disabled' : ''}></td></tr>`;
      }).join('')}</tbody></table>${err('LUNES_HORA_INICIO')}${err('DOMINGO_HORA_INICIO')}${err('NRO_DIAS_DIST_JOR')}</section>` : ''}
    <section><h2>Distribución de jornada (cláusula del contrato)</h2><div class="grid">${textarea('DISTRIB_JORNADA', 'Copie las estipulaciones del contrato sobre jornada, incluido el tiempo de colación y la distribución en días y horarios', { rows: 4 })}</div></section>
    <section><h2>Otras estipulaciones</h2><div class="chk">${[['INDEMNIZACIONES', 'Indemnización contractual'], ['FERIADOS', 'Feriado adicional'], ['NEGOCIACIONES', 'Prohibición de negociaciones'], ['PROPINTELECTUAL', 'Propiedad intelectual / autoría'], ['LICMEDICA', 'Beneficios sobre licencias médicas'], ['SALACUNA', 'Sala cuna y alimentación'], ['PERMISOS', 'Permisos adicionales'], ['CONESPECIALES', 'Condiciones especiales (Tít. VI, Libro IV)'], ['SEGUROS', 'Pólizas de seguro'], ['STOCK', 'Derecho preferente de compra de acciones'], ['INSTCOLECTIVO', 'Instrumento colectivo vigente']].map(([k, l]) => toggle('OTROS_' + k, l, { rerender: k === 'INSTCOLECTIVO' })).join('')}</div>
      ${d.OTROS_INSTCOLECTIVO === '1' ? `<div class="grid">${select('AFECTO_A', 'Afecto a', 'AFECTO_A', { span: 4 })}${input('FECHA_INI_INSTCOLECTIVO', 'Inicio de vigencia', { span: 4, ph: 'DD/MM/AAAA' })}${input('FECHA_FIN_INSTCOLECTIVO', 'Fin de vigencia', { span: 4, ph: 'DD/MM/AAAA' })}</div>` : ''}
      <div class="grid">${textarea('OTRAS_ESTIPULACIONES', 'Otras estipulaciones (cópielas del contrato si no están en este registro)', { req: false, rows: 3 })}</div></section>
    <section><h2>Fecha y plazo del contrato</h2><div class="grid">${select('TIPO_CONTRATO', 'Tipo de contrato', 'TIPO_CONTRATO', { span: 4, rerender: true })}${input('FECHA_INI_RELABORAL', 'Fecha de inicio de la relación laboral', { span: 4, ph: 'DD/MM/AAAA' })}
      ${String(d.TIPO_CONTRATO) === '2' ? input('FECHA_FIN_RELABORAL', 'Fecha de término', { span: 4, ph: 'DD/MM/AAAA' }) : ''}</div></section>
    <section class="dj"><h2>Declaración jurada</h2>${toggle('DECLARACION_JURADA', 'Declaro bajo juramento que la información es veraz (Art. 210 Código Penal)')}${err('DECLARACION_JURADA')}</section>`;
  }

  views.ind = (n) => {
    if (!DRAFT) DRAFT = newDraft();
    const body = [stage1, stage2, stage3, stage4][n - 1]();
    return layout(`<h1>Registro de Contrato de Trabajo Individual</h1>${stepper(n)}${errSummary()}<form id="frm" onsubmit="return false" novalidate>${body}</form>
      <div class="actions">${n > 1 ? '<button class="btn" data-act="prev" data-testid="btn-prev">Anterior</button>' : '<a class="btn" href="#/contrato">Cancelar</a>'}
      ${n < 4 ? '<button class="btn primary" data-act="next" data-testid="btn-next">Siguiente</button>' : '<button class="btn primary" data-act="finish" data-testid="btn-finalizar">Finalizar registro</button>'}</div>`,
      '<a href="#/rel">Menú REL</a> › <a href="#/contrato">Registro de Contrato</a> › Individual');
  };

  views.indok = () => {
    const c = window.__lastContract;
    return layout(`<div class="ok-box" data-testid="registro-exitoso"><div class="tick">✓</div><h1>Registro de Contrato de Trabajo exitoso</h1>
      ${c ? `<p>Folio <b data-testid="folio">${c.folio}</b> · Trabajador <b>${esc(c.nombre)}</b> (${esc(c.workerId)}) · Versión ${c.version}</p>` : ''}
      <div class="actions center"><button class="btn" data-act="comprobante" data-id="${c ? c.id : ''}">Descargar comprobante</button><a class="btn" href="#/historial">Ver historial</a><a class="btn primary" href="#/ind/1" data-new="1">Registrar otro contrato</a></div></div>`);
  };

  // ───── Historial ─────
  views.historial = () => {
    const l = Store.get('contracts');
    return layout(`<h1>Historial de Registro de Contrato de Trabajo</h1>${l.length ? `<table class="tbl" data-testid="tabla-historial"><thead><tr><th>RUT o DNI</th><th>Nombre del trabajador/a</th><th>Estado</th><th>Versión</th><th>Origen</th><th>Folio</th><th>Acción</th></tr></thead><tbody>${l.map(c => `
      <tr><td>${esc(c.workerId)}</td><td>${esc(c.nombre)}</td><td><span class="pill ${c.estado === 'Vigente' ? 'ok' : ''}">${c.estado}</span></td><td>${c.version}</td><td>${c.origen}</td><td>${c.folio}</td>
      <td class="act"><button class="btn small" data-act="comprobante" data-id="${c.id}">Comprobante</button> <button class="btn small danger" data-act="del-contract" data-id="${c.id}">Eliminar</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Aún no hay contratos registrados.</p>'}`,
      '<a href="#/rel">Menú REL</a> › Historial');
  };

  // ───── Masivo ─────
  function m() { return Object.assign({ rep: '', email: '', tel: '', dom: EMPLEADOR.domicilios[0].id, cae: '', cargo: '' }, Store.get('masivo')); }
  views.masivo = () => {
    const a = m(), M = MASIVO;
    const dom = EMPLEADOR.domicilios.find(x => x.id === a.dom);
    return layout(`<h1>Registro Masivo de Contrato de Trabajo</h1>
    <p class="lead">La carga se ejecuta <b>por cargo</b> y todos los trabajadores del archivo deben estar contratados con el <b>mismo CAE</b>.</p>
    <section><h2>1. Antecedentes del contrato de trabajo</h2><div class="grid">
      <div class="fg span6"><label>Nombre o razón social</label><input disabled value="${esc(EMPLEADOR.razonSocial)}"></div><div class="fg span6"><label>RUT empleador</label><input disabled value="${EMPLEADOR.rut}"></div>
      <div class="fg span6"><label for="m-rep">RUT representante legal *</label><select id="m-rep" data-m="rep"><option value="">Seleccione…</option>${EMPLEADOR.representantes.map(r => `<option value="${r.rut}" ${a.rep === r.rut ? 'selected' : ''}>${r.rut} — ${esc(r.nombre)}</option>`).join('')}</select></div>
      <div class="fg span6"><label for="m-email">Correo electrónico *</label><input id="m-email" data-m="email" value="${esc(a.email)}" placeholder="xx@yy.zz"></div>
      <div class="fg span6"><label for="m-tel">Teléfono *</label><input id="m-tel" data-m="tel" value="${esc(a.tel)}"></div>
      <div class="fg span6"><label for="m-dom">Domicilio</label><select id="m-dom" data-m="dom">${EMPLEADOR.domicilios.map(x => `<option value="${x.id}" ${x.id === a.dom ? 'selected' : ''}>${esc(x.calle)} ${x.numero}, ${esc(CAT.COMUNAS[x.comunaCod])}</option>`).join('')}</select></div>
      <div class="fg span6"><label for="m-cae">Código de Actividad Económica *</label><select id="m-cae" data-m="cae"><option value="">Seleccione…</option>${EMPLEADOR.caes.map(c => `<option value="${c.cod}" ${a.cae === c.cod ? 'selected' : ''}>${c.cod === 'otro' ? 'Otro' : c.cod + ' — ' + esc(c.glosa)}</option>`).join('')}</select></div>
      <div class="fg span6"><label for="m-cargo">Cargo del trabajador/a *</label><input id="m-cargo" data-m="cargo" value="${esc(a.cargo)}" placeholder="Ej. Analista de datos"></div></div></section>
    <section><h2>2. Carga masiva</h2>
      <p>Descargue la <a href="#" data-act="tpl">plantilla CSV</a> (delimitador «;», fechas DD/MM/AAAA) y el <a href="#" data-act="tpl-ej">archivo de ejemplo válido</a>. Nombre del archivo: <code>rutempleador_aaaamm</code> (ej. <code>${EMPLEADOR.rut}_${monthTag()}.csv</code>). Máx. 5 MB y 1.000 filas.</p>
      <label class="drop" id="drop"><input type="file" id="csv-file" data-testid="csv-file" accept=".csv,text/csv"><b>Seleccione o arrastre el archivo CSV</b><span>${M ? esc(M.name) : 'Ningún archivo seleccionado'}</span></label>
      ${M && M.fileErrors.length ? `<div class="errbox"><b>El archivo no cumple los requisitos:</b><ul>${M.fileErrors.map(x => `<li>${esc(x)}</li>`).join('')}</ul><button class="btn small" data-act="reset-upload">Subir otro archivo</button></div>` : ''}
      ${M && !M.fileErrors.length && M.rowErrors.length ? `<div class="errbox"><b>Se detectaron ${M.rowErrors.length} errores de formato en ${new Set(M.rowErrors.map(e => e.fila)).size} fila(s).</b>
        <table class="tbl small"><thead><tr><th>Fila</th><th>Columna</th><th>Detalle</th></tr></thead><tbody>${M.rowErrors.slice(0, 40).map(e => `<tr><td>${e.fila}</td><td>${e.col}</td><td>${esc(e.msg)}</td></tr>`).join('')}</tbody></table>${M.rowErrors.length > 40 ? `<small>Mostrando 40 de ${M.rowErrors.length}.</small>` : ''}
        <div class="actions"><button class="btn small" data-act="dl-errors">Descargar detalle</button><button class="btn small" data-act="reset-upload">Subir otro archivo</button></div></div>` : ''}
      ${M && M.ok ? `<div class="okbar">✓ Archivo válido: ${M.rows.length} contrato(s) listos para cargar.</div>
        <label class="switch" for="f-MASIVO_DJ"><input id="f-MASIVO_DJ" type="checkbox" data-field="MASIVO_DJ" ${M.dj ? 'checked' : ''}><span class="slider"></span><span>Declaro bajo juramento que la información es veraz (Art. 210 Código Penal)</span></label>
        <div class="actions"><button class="btn primary" data-act="upload" data-testid="btn-cargar" ${M.dj ? '' : 'disabled'}>Cargar archivo</button></div>` : ''}
      ${M && M.done ? `<div class="ok-box"><div class="tick">✓</div><h2>Archivo recibido correctamente</h2><p>El procesamiento puede tardar hasta 7 días. Revise la <a href="#/correos">bandeja de correos</a> y use «Simular procesamiento» para ver el resultado.</p></div>` : ''}
    </section>`, '<a href="#/rel">Menú REL</a> › <a href="#/contrato">Registro de Contrato</a> › Masivo');
  };

  function exampleRecord(i = 0) {
    const ruts = ['18765432-7', '11222333-9', '9876543-3'];
    return {
      CATEGORIA_CONTRATO: '1', COMUNA_CELEBRACION: '280', FECHA_SUSCRPCION: today(), RUT_TRABAJADOR: ruts[i % 3], COMUNA: '298', CALLE: 'Av. Providencia', NUMERO: String(1200 + i * 10),
      EMAIL: `trabajador${i + 1}@correo.cl`, TELEFONO: '91234567' + i, DECLARACION_DISCAPACIDAD: '0', DECLARACION_INVALIDEZ: '0',
      FUNCIONES: 'Análisis de datos, construcción de tableros e informes de gestión para áreas de negocio.', SUBCONTRATACION: '0', EST: '0', ZONA_GEOGRAFICA_1: '280', ZONA_GEOGRAFICA_2: '298',
      SUELDO_BASE: '1000000', MONTO_IMPONIBLE: '1200000', HABER_1: '31', MONTO_1: '50000', PER_DEVENGAMIENTO_1: '5', HABER_2: '30', MONTO_2: '60000', PER_DEVENGAMIENTO_2: '5',
      GRAT_FORMA_PAGO: '4', GRAT_PERIODO_PAGO: '1', REM_PERIODO_PAGO: '1', REM_FECHA_PAGO: '30', REM_FORMA_PAGO: '5', REM_ANTICIPO: '1', REM_AFP: '14', REM_SALUD: '102',
      TIPO_JORNADA: '1', DURACION_JORNADA: '44', TURNOS: '1', TIEMPO_COLACION: '60', T_COLACION_IMP: '0', T_COLACION_NO_IMP: '60', ROTACION: '1', NRO_DIAS_DIST_JOR: '5',
      LUNES_HORA_INICIO: '09:00', LUNES_HORA_TERMINO: '18:00', MARTES_HORA_INICIO: '09:00', MARTES_HORA_TERMINO: '18:00', MIERCOLES_HORA_INICIO: '09:00', MIERCOLES_HORA_TERMINO: '18:00',
      JUEVES_HORA_INICIO: '09:00', JUEVES_HORA_TERMINO: '18:00', VIERNES_HORA_INICIO: '09:00', VIERNES_HORA_TERMINO: '17:00',
      TIPO_CONTRATO: '1', FECHA_INI_RELABORAL: today(),
      OTROS_INDEMNIZACIONES: '0', OTROS_FERIADOS: '0', OTROS_NEGOCIACIONES: '0', OTROS_PROPINTELECTUAL: '1', OTROS_LICMEDICA: '0', OTROS_SALACUNA: '0', OTROS_PERMISOS: '0',
      OTROS_CONESPECIALES: '0', OTROS_SEGUROS: '0', OTROS_STOCK: '0', OTROS_INSTCOLECTIVO: '0'
    };
  }
  const download = (name, content, type = 'text/csv;charset=utf-8') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };

  function processFile(file, text) {
    const aState = { name: file.name, fileErrors: V.validateFileMeta(file, EMPLEADOR.rut), rowErrors: [], rows: [], ok: false, dj: false, done: false };
    MASIVO = aState;
    if (!aState.fileErrors.length) {
      const { rows } = V.parseCSV(text);
      const header = rows[0] || [];
      if (header.length !== CSV_COLUMNS.length || CSV_COLUMNS.some((c, i) => header[i] !== c)) {
        const missing = CSV_COLUMNS.filter(c => !header.includes(c));
        aState.fileErrors.push('No se mantiene la estructura de la plantilla' + (missing.length ? ` (faltan columnas: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''})` : ` (se esperaban ${CSV_COLUMNS.length} columnas y el archivo trae ${header.length})`) + '.');
      } else if (rows.length - 1 > 1000) {
        aState.fileErrors.push(`El archivo tiene ${rows.length - 1} filas; el máximo es 1.000.`);
      } else if (rows.length < 2) {
        aState.fileErrors.push('El archivo no contiene contratos.');
      } else {
        rows.slice(1).forEach((cells, i) => {
          const rec = {}; CSV_COLUMNS.forEach((c, k) => rec[c] = (cells[k] ?? '').trim());
          aState.rows.push(rec);
          V.validateRecord(rec).forEach(e => aState.rowErrors.push({ fila: i + 2, col: e.col, msg: e.msg }));
        });
        const a = m();
        aState.ok = aState.rowErrors.length === 0;
        if (aState.ok && (!a.rep || !a.email || !a.tel || !a.cae || !a.cargo)) { aState.ok = false; aState.fileErrors.push('Complete los antecedentes del contrato (sección 1) antes de cargar el archivo.'); }
      }
    }
    render();
  }

  // ───── Correos ─────
  views.correos = () => {
    const l = Store.get('mails'), b = Store.get('batches');
    l.forEach(x => x.leido = true); Store.set('mails', l);
    const pend = b.filter(x => x.estado === 'recibido');
    return layout(`<h1>Bandeja de correos (simulada)</h1>
      ${pend.length ? `<div class="okbar">Hay ${pend.length} archivo(s) pendiente(s) de validación de fondo. <button class="btn small primary" data-act="process" data-testid="btn-procesar">Simular procesamiento</button></div>` : ''}
      ${l.length ? l.map(x => `<article class="mail"><header><b>${esc(x.asunto)}</b><time>${fmtDT(x.fecha)}</time></header><pre>${esc(x.cuerpo)}</pre>${x.adjunto ? `<button class="btn small" data-act="dl-mail" data-id="${x.id}">Descargar ${esc(x.adjunto.nombre)}</button>` : ''}</article>`).join('') : '<p class="empty">Sin correos.</p>'}`, '<a href="#/rel">Menú REL</a> › Correos');
  };

  function processBatches() {
    const batches = Store.get('batches');
    batches.filter(b => b.estado === 'recibido').forEach(b => {
      const existing = Store.get('contracts');
      const obs = [], seen = new Set();
      b.rows.forEach((r, i) => {
        const wid = r.RUT_TRABAJADOR || r.DNI_TRABAJADOR;
        if (seen.has(wid)) obs.push({ fila: i + 2, col: 'RUT_TRABAJADOR', msg: 'Trabajador duplicado dentro del archivo' }); seen.add(wid);
        if (existing.some(c => c.workerId === wid && c.estado === 'Vigente' && c.data.FECHA_INI_RELABORAL === r.FECHA_INI_RELABORAL)) obs.push({ fila: i + 2, col: 'FECHA_INI_RELABORAL', msg: 'Ya existe un contrato vigente con la misma fecha de inicio' });
        if (V.isDate(r.FECHA_INI_RELABORAL) && V.isDate(r.FECHA_SUSCRPCION) && V.toDate(r.FECHA_INI_RELABORAL) < V.toDate(r.FECHA_SUSCRPCION)) obs.push({ fila: i + 2, col: 'FECHA_INI_RELABORAL', msg: 'La fecha de inicio es anterior a la fecha de suscripción' });
      });
      if (obs.length) {
        b.estado = 'con_errores';
        Store.addMail(`Registro masivo: archivo ${b.archivo} procesado con observaciones`, `Se realizó la validación de fondo del archivo ${b.archivo} (${b.rows.length} contratos).\nSe detectaron ${obs.length} observaciones; se adjunta el detalle. Ningún contrato fue registrado.`,
          { nombre: 'errores_' + b.archivo, contenido: V.toCSV([['FILA', 'COLUMNA', 'DETALLE']].concat(obs.map(o => [o.fila, o.col, o.msg]))) });
      } else {
        b.estado = 'validado';
        b.rows.forEach(r => Store.addContract(Object.assign({}, r, { CARGO: b.cargo }), 'Masivo'));
        Store.addMail(`Registro masivo: archivo ${b.archivo} procesado correctamente`, `La validación de fondo del archivo ${b.archivo} finalizó sin errores.\n${b.rows.length} contrato(s) de trabajo fueron registrados. Revise el Historial de Registro Electrónico Laboral.`);
      }
    });
    Store.set('batches', batches);
  }

  // ───── Integración n8n ─────
  views.prefill = () => layout(`<h1>Integración con n8n</h1>
    <p class="lead">Esta página sirve para probar el escenario: pegue el JSON que produce n8n a partir del contrato y el sitio recorre las 4 etapas como lo haría un robot.</p>
    <section><h2>Cargar JSON de contrato</h2>
      <p class="muted">Las claves son las columnas del CSV masivo (valores codificados) más algunos campos propios del formulario individual. Vea <code>docs/esquema-contrato.json</code> en el repositorio.</p>
      <textarea id="pf-json" rows="14" data-testid="pf-json" placeholder='{"RUT_TRABAJADOR":"18765432-7", ...}'></textarea>
      <div class="actions"><button class="btn" data-act="pf-example">Insertar ejemplo</button><button class="btn" data-act="pf-fill" data-testid="pf-fill">Precargar formulario</button><button class="btn primary" data-act="pf-run" data-testid="pf-run">Precargar y registrar (modo robot)</button></div>
      <div id="pf-msg"></div></section>
    <section><h2>API para automatización</h2><pre class="code">// En la consola o con Playwright / Puppeteer (page.evaluate):
COMCAIT.fillIndividual(json, { submit: true })  // precarga y registra, devuelve el contrato
COMCAIT.contracts()                             // contratos registrados (historial)
COMCAIT.reset()                                 // borra todos los datos locales

// Selectores estables: [data-field="RUT_TRABAJADOR"], [data-testid="btn-next"],
// [data-testid="btn-finalizar"], [data-testid="registro-exitoso"], [data-testid="csv-file"]
// Prefill por URL:  #/prefill?data=&lt;base64 del JSON&gt;&amp;run=1</pre></section>`, '<a href="#/rel">Menú REL</a> › Integración n8n');

  // ───────── Render / router ─────────
  let focusId = null;
  function render() {
    const hash = location.hash.replace(/^#/, '') || '/login';
    const [path, qs] = hash.split('?');
    const parts = path.split('/').filter(Boolean);
    const logged = Store.get('session');
    if (parts[0] !== 'login' && !logged) { location.hash = '#/login'; return; }
    let html;
    if (parts[0] === 'ind' && /^[1-4]$/.test(parts[1] || '')) {
      if (!DRAFT) DRAFT = newDraft();
      DRAFT.etapa = Math.max(DRAFT.etapa, +parts[1]);
      html = views.ind(+parts[1]);
    } else if (parts[0] === 'ind' && parts[1] === 'ok') html = views.indok();
    else html = (views[parts[0] || 'login'] || views.rel)();
    const y = window.scrollY;
    app.innerHTML = html;
    window.scrollTo(0, y);
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } } focusId = null; }
    if (parts[0] === 'prefill' && qs) {
      const p = new URLSearchParams(qs);
      if (p.get('data')) { try { const j = JSON.parse(decodeURIComponent(escape(atob(p.get('data'))))); $('#pf-json').value = JSON.stringify(j, null, 2); if (p.get('run')) runRobot(j); } catch (e) { $('#pf-msg').innerHTML = '<div class="errbox">JSON/base64 inválido</div>'; } }
    }
  }
  window.addEventListener('hashchange', () => { ERRORS = []; render(); });

  // Edición de campos (delegación)
  function onField(e) {
    const t = e.target;
    if (t.dataset.m) { const a = m(); a[t.dataset.m] = t.value; Store.set('masivo', a); return; }
    if (t.id === 'f-MASIVO_DJ' || t.dataset.field === 'MASIVO_DJ') { if (MASIVO) { MASIVO.dj = t.checked; render(); } return; }
    const col = t.dataset.field; if (!col || !DRAFT) return;
    DRAFT.data[col] = t.dataset.bool ? (t.checked ? '1' : '0') : t.value;
    if (col === 'TIPO_JORNADA') { /* limpiar dependientes simples */ }
    if (t.dataset.rerender && e.type === 'change') { focusId = null; render(); }
    else if (col === 'FUNCIONES' || col === 'GRAT_MODALIDAD') { const s = t.parentNode.querySelector('small'); if (s) s.textContent = `${t.value.length}/${t.maxLength} caracteres`; }
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);

  function openModal(text, onOk) {
    const w = document.createElement('div'); w.className = 'modal-bg'; w.innerHTML = `<div class="modal" role="dialog"><p>${esc(text)}</p><div class="actions center"><button class="btn" data-testid="btn-cancelar">Cancelar</button><button class="btn primary" data-testid="btn-aceptar">Aceptar</button></div></div>`;
    w.addEventListener('click', ev => { const t = ev.target.closest('button'); if (!t) return; w.remove(); if (t.dataset.testid === 'btn-aceptar') onOk(); });
    document.body.appendChild(w);
  }
  function goStage(n) { location.hash = '#/ind/' + n; }
  function finalize() {
    ERRORS = [1, 2, 3, 4].flatMap(s => stageErrors(s, DRAFT.data));
    if (!DRAFT.data.DECLARACION_JURADA || DRAFT.data.DECLARACION_JURADA !== '1') ERRORS.push({ col: 'DECLARACION_JURADA', msg: 'Debe aceptar la declaración jurada de veracidad' });
    if (ERRORS.length) { render(); window.scrollTo(0, 0); return null; }
    const rec = recordFrom(DRAFT.data); delete rec._haberes;
    const c = Store.addContract(rec, 'Individual');
    Store.removeDraft(DRAFT.id); DRAFT = null; window.__lastContract = c;
    return c;
  }

  function comprobante(id) {
    const c = Store.get('contracts').find(x => x.id === id); if (!c) return;
    const rows = Object.entries(c.data).filter(([k, v]) => v !== '' && k !== 'DECLARACION_JURADA' && !k.startsWith('_')).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    download(`comprobante_${c.workerId}_${c.folio}.html`, `<!doctype html><meta charset="utf-8"><title>Comprobante ${c.folio}</title><style>body{font:14px system-ui;margin:2rem}th{text-align:left;padding:2px 12px 2px 0;color:#555}</style><h1>Comprobante de ingreso — Registro de Contrato de Trabajo</h1><p><b>SIMULACIÓN Comcait Demo — sin valor legal.</b></p><p>Folio ${c.folio} · Versión ${c.version} · ${fmtDT(c.registrado)}<br>Empleador: ${esc(EMPLEADOR.razonSocial)} (${EMPLEADOR.rut})<br>Trabajador: ${esc(c.nombre)} (${esc(c.workerId)})</p><table>${rows}</table>`, 'text/html;charset=utf-8');
  }

  document.addEventListener('click', e => {
    const lg = e.target.closest('#logout'); if (lg) { Store.set('session', false); return; }
    const newLink = e.target.closest('[data-new]'); if (newLink) { DRAFT = null; ERRORS = []; }
    if (e.target.id === 'btn-login') { Store.set('session', true); location.hash = '#/rel'; return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    if (['tpl', 'tpl-ej', 'pf-example'].includes(act)) e.preventDefault();
    const stage = () => +(location.hash.match(/#\/ind\/(\d)/) || [0, 1])[1];
    switch (act) {
      case 'next': { const n = stage(); ERRORS = stageErrors(n, DRAFT.data); if (ERRORS.length) { render(); window.scrollTo(0, 0); return; } DRAFT.etapa = Math.max(DRAFT.etapa, n + 1); if (n >= 1) Store.saveDraft(DRAFT); goStage(n + 1); break; }
      case 'prev': ERRORS = []; goStage(stage() - 1); break;
      case 'finish': { openModal('¿Está seguro que desea finalizar el Registro de Contrato de Trabajo?', () => { if (finalize()) location.hash = '#/ind/ok'; }); break; }
      case 'add-haber': DRAFT.data._haberes = Math.min(5, (DRAFT.data._haberes || 1) + 1); render(); break;
      case 'del-haber': { const n = DRAFT.data._haberes || 1; ['HABER_', 'MONTO_', 'PER_DEVENGAMIENTO_'].forEach(p => delete DRAFT.data[p + n]); DRAFT.data._haberes = Math.max(1, n - 1); render(); break; }
      case 'resume': { const d = Store.get('drafts').find(x => x.id === id); DRAFT = d; goStage(d.etapa); break; }
      case 'del-draft': Store.removeDraft(id); render(); break;
      case 'del-contract': if (confirm('¿Eliminar el registro de este contrato de trabajo?')) { Store.removeContract(id); render(); } break;
      case 'comprobante': comprobante(id); break;
      case 'tpl': download('plantilla_registro_masivo.csv', V.toCSV([CSV_COLUMNS])); break;
      case 'tpl-ej': download(`${EMPLEADOR.rut}_${monthTag()}.csv`, V.toCSV([CSV_COLUMNS].concat([0, 1, 2].map(i => CSV_COLUMNS.map(c => exampleRecord(i)[c] || ''))))); break;
      case 'reset-upload': MASIVO = null; render(); break;
      case 'dl-errors': download('detalle_errores_' + MASIVO.name, V.toCSV([['FILA', 'COLUMNA', 'DETALLE']].concat(MASIVO.rowErrors.map(x => [x.fila, x.col, x.msg])))); break;
      case 'upload': {
        const a = m(), bl = Store.get('batches');
        bl.push({ id: Store.uid(), archivo: MASIVO.name, estado: 'recibido', rows: MASIVO.rows, cargo: a.cargo, cae: a.cae });
        Store.set('batches', bl);
        Store.addMail(`Registro masivo: recepción del archivo ${MASIVO.name}`, `Se recibió correctamente el archivo ${MASIVO.name} con ${MASIVO.rows.length} contrato(s) (cargo: ${a.cargo}).\nSe inició el procesamiento de la información; el plazo puede tardar hasta 7 días.`);
        MASIVO.done = true; MASIVO.ok = false; render(); break;
      }
      case 'process': processBatches(); render(); break;
      case 'dl-mail': { const mm = Store.get('mails').find(x => x.id === id); if (mm && mm.adjunto) download(mm.adjunto.nombre, mm.adjunto.contenido); break; }
      case 'pf-example': $('#pf-json').value = JSON.stringify(window.EXAMPLE_JSON(), null, 2); break;
      case 'pf-fill': { try { const j = JSON.parse($('#pf-json').value); DRAFT = newDraft(j); location.hash = '#/ind/1'; } catch (er) { $('#pf-msg').innerHTML = '<div class="errbox">JSON inválido: ' + esc(er.message) + '</div>'; } break; }
      case 'pf-run': { try { runRobot(JSON.parse($('#pf-json').value)); } catch (er) { $('#pf-msg').innerHTML = '<div class="errbox">JSON inválido: ' + esc(er.message) + '</div>'; } break; }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id !== 'csv-file' || !e.target.files[0]) return;
    const f = e.target.files[0]; const rd = new FileReader();
    rd.onload = () => processFile(f, rd.result); rd.readAsText(f, 'utf-8');
  });
  document.addEventListener('dragover', e => { if (e.target.closest('#drop')) e.preventDefault(); });
  document.addEventListener('drop', e => { const d = e.target.closest('#drop'); if (!d) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const rd = new FileReader(); rd.onload = () => processFile(f, rd.result); rd.readAsText(f, 'utf-8'); } });

  // ───────── Modo robot (recorre las 4 etapas como lo haría un RPA) ─────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function runRobot(json, fast) {
    DRAFT = newDraft(json); Store.set('session', true);
    for (let n = 1; n <= 4; n++) {
      location.hash = '#/ind/' + n; await sleep(fast ? 0 : 900);
      ERRORS = stageErrors(n, DRAFT.data);
      if (n === 4) { DRAFT.data.DECLARACION_JURADA = '1'; }
      if (ERRORS.length) { render(); return { ok: false, errors: ERRORS }; }
      DRAFT.etapa = Math.max(DRAFT.etapa, n + 1 > 4 ? 4 : n + 1); Store.saveDraft(DRAFT);
    }
    const c = finalize();
    if (!c) return { ok: false, errors: ERRORS };
    location.hash = '#/ind/ok'; return { ok: true, contrato: c };
  }

  window.EXAMPLE_JSON = () => Object.assign({
    EMP_EMAIL: 'rrhh@empresademo.cl', EMP_TELEFONO: '224001234', REP_RUT: '12345678-5', EMP_CAE: '620100', CARGO: 'Analista de datos',
    CLAUSULA_REM: 'El empleador pagará un sueldo base mensual de $1.000.000, colación $60.000 y movilización $50.000, además de gratificación legal conforme al Art. 50.',
    DISTRIB_JORNADA: 'Lunes a jueves de 09:00 a 18:00 y viernes de 09:00 a 17:00, con una hora de colación no imputable a la jornada.',
    OTRAS_ESTIPULACIONES: 'El trabajador cede al empleador los derechos de propiedad intelectual sobre las obras creadas en ejercicio de sus funciones.'
  }, exampleRecord(0), { COMUNA_CELEBRACION: '280', ZONA_GEOGRAFICA_1: '280' });

  window.COMCAIT = {
    version: '1.0',
    fillIndividual: async (json, opts = {}) => { const r = await runRobot(json, opts.fast !== false); return r.ok ? r.contrato : Promise.reject(r.errors); },
    contracts: () => Store.get('contracts'),
    reset: () => { Store.resetAll(); DRAFT = null; MASIVO = null; location.hash = '#/login'; render(); },
    csvColumns: CSV_COLUMNS
  };

  render();
})();
