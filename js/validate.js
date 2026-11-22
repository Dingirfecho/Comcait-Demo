// Validaciones compartidas por el formulario individual y la carga masiva.
// Las reglas siguen el Instructivo de Registro Masivo (v. 21.04.22).
(function () {
  const V = {};

  V.rutDV = function (num) {
    let s = 0, m = 2;
    for (const ch of String(num).split('').reverse()) { s += Number(ch) * m; m = m === 7 ? 2 : m + 1; }
    const r = 11 - (s % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  };
  // Formato del instructivo: sin puntos, con guion, sin "0" a la izquierda. Ej. 12345678-5
  V.isRut = function (v) {
    const m = /^([1-9]\d{4,7})-([\dK])$/.exec(String(v || '').toUpperCase());
    return !!m && V.rutDV(m[1]) === m[2];
  };
  V.normRut = function (v) {
    v = String(v || '').replace(/\./g, '').trim().toUpperCase();
    if (/^\d+[\dK]$/.test(v) && !v.includes('-')) v = v.slice(0, -1) + '-' + v.slice(-1);
    return v.replace(/^0+/, '');
  };
  V.isDate = function (v) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || ''));
    if (!m) return false;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1];
  };
  V.toDate = function (v) { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); return new Date(+m[3], +m[2] - 1, +m[1]); };
  V.isTime = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
  V.isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
  V.isInt = v => /^\d+$/.test(String(v ?? '').trim());

  const blank = v => v === undefined || v === null || String(v).trim() === '';

  // Devuelve [{col, msg}]
  V.validateRecord = function (r) {
    const e = [];
    const err = (col, msg) => e.push({ col, msg });
    const inCat = (col, cat, label) => {
      if (blank(r[col])) return err(col, `${label || col} es obligatorio`);
      if (!(String(r[col]).trim() in CAT[cat || col])) err(col, `${label || col}: código "${r[col]}" no existe en la tabla`);
    };
    const need = (col, label) => { if (blank(r[col])) { err(col, `${label || col} es obligatorio`); return false; } return true; };
    const dateF = (col) => { if (need(col) && !V.isDate(r[col])) err(col, `${col}: formato de fecha inválido (DD/MM/AAAA)`); };
    const money = (col) => {
      if (!need(col)) return;
      if (!V.isInt(r[col]) || String(r[col]).length > 9) err(col, `${col}: monto sin puntos, numérico y máximo 9 dígitos`);
    };

    // 1. Identificación
    if (String(r.CATEGORIA_CONTRATO).trim() !== '1') err('CATEGORIA_CONTRATO', 'CATEGORIA_CONTRATO debe ser 1');
    if (blank(r.COMUNA_CELEBRACION) || !(r.COMUNA_CELEBRACION in CAT.COMUNAS)) err('COMUNA_CELEBRACION', 'COMUNA_CELEBRACION: código de comuna inválido (Tabla 1)');
    dateF('FECHA_SUSCRPCION');

    const hasRut = !blank(r.RUT_TRABAJADOR), hasDni = !blank(r.DNI_TRABAJADOR);
    if (hasRut === hasDni) err('RUT_TRABAJADOR', 'Debe informar RUT_TRABAJADOR o DNI_TRABAJADOR (excluyentes)');
    if (hasRut && !V.isRut(r.RUT_TRABAJADOR)) err('RUT_TRABAJADOR', 'RUT_TRABAJADOR inválido (sin puntos, con guion y dígito verificador correcto, sin ceros a la izquierda)');
    if (hasDni) {
      dateF('FECHA_NACIMIENTO'); need('NOMBRES'); need('APELLIDOS');
      inCat('SEXO', 'SEXO'); inCat('NACIONALIDAD', 'NACIONALIDAD');
    }
    if (!blank(r.EMAIL) && !V.isEmail(r.EMAIL)) err('EMAIL', 'EMAIL con formato inválido');
    if (!blank(r.TELEFONO) && !/^\d{9}$/.test(String(r.TELEFONO))) err('TELEFONO', 'TELEFONO: 9 dígitos, sin código de país');
    if (blank(r.COMUNA) || !(r.COMUNA in CAT.COMUNAS)) err('COMUNA', 'COMUNA: código de comuna de residencia inválido');
    need('CALLE'); need('NUMERO');
    inCat('DECLARACION_DISCAPACIDAD', 'SINO'); inCat('DECLARACION_INVALIDEZ', 'SINO');

    // 2. Funciones y lugar de prestación
    if (need('FUNCIONES') && String(r.FUNCIONES).length > 300) err('FUNCIONES', 'FUNCIONES: máximo 300 caracteres');
    inCat('SUBCONTRATACION', 'SINO'); inCat('EST', 'SINO');
    if (String(r.SUBCONTRATACION) === '1' && !V.isRut(r.RUT_EMPRESA_PRINCIPAL)) err('RUT_EMPRESA_PRINCIPAL', 'RUT_EMPRESA_PRINCIPAL requerido y válido si SUBCONTRATACION=1');
    if (String(r.EST) === '1') {
      if (!V.isRut(r.RUT_EMPRESA_USUARIA)) err('RUT_EMPRESA_USUARIA', 'RUT_EMPRESA_USUARIA requerido y válido si EST=1');
      if (blank(r.FAENA_COMUNA) || !(r.FAENA_COMUNA in CAT.COMUNAS)) err('FAENA_COMUNA', 'FAENA_COMUNA requerida si EST=1');
      need('FAENA_CALLE'); need('FAENA_NUMERO');
    } else {
      if (blank(r.ZONA_GEOGRAFICA_1)) err('ZONA_GEOGRAFICA_1', 'ZONA_GEOGRAFICA_1 es obligatoria (hasta 5 comunas)');
    }
    for (let i = 1; i <= 5; i++) {
      const z = r['ZONA_GEOGRAFICA_' + i];
      if (!blank(z) && !(z in CAT.COMUNAS)) err('ZONA_GEOGRAFICA_' + i, `ZONA_GEOGRAFICA_${i}: código de comuna inválido`);
    }

    // 3. Remuneraciones
    money('SUELDO_BASE'); money('MONTO_IMPONIBLE');
    for (let i = 1; i <= 5; i++) {
      const h = r['HABER_' + i], m = r['MONTO_' + i], p = r['PER_DEVENGAMIENTO_' + i];
      if (blank(h) && blank(m) && blank(p)) continue;
      if (blank(h) || !(h in CAT.HABER)) err('HABER_' + i, `HABER_${i}: código inválido (Tabla 2)`);
      if (blank(m) || !V.isInt(m) || String(m).length > 9) err('MONTO_' + i, `MONTO_${i}: numérico sin puntos, máx. 9 dígitos (0 si es fórmula)`);
      if (blank(p) || !(p in CAT.PER_DEVENGAMIENTO)) err('PER_DEVENGAMIENTO_' + i, `PER_DEVENGAMIENTO_${i}: código inválido (Tabla 3)`);
    }
    inCat('GRAT_FORMA_PAGO', 'GRAT_FORMA_PAGO');
    const gf = String(r.GRAT_FORMA_PAGO);
    if (gf === '3') { if (need('GRAT_MODALIDAD') && String(r.GRAT_MODALIDAD).length > 2000) err('GRAT_MODALIDAD', 'GRAT_MODALIDAD: máx. 2.000 caracteres'); }
    if (['2', '3', '4'].includes(gf)) inCat('GRAT_PERIODO_PAGO', 'PERIODO_PAGO');
    inCat('REM_PERIODO_PAGO', 'PERIODO_PAGO');
    const fp = Number(r.REM_FECHA_PAGO);
    if (blank(r.REM_FECHA_PAGO) || !V.isInt(r.REM_FECHA_PAGO) || fp < 1 || fp > 30) err('REM_FECHA_PAGO', 'REM_FECHA_PAGO: día entre 1 y 30');
    inCat('REM_FORMA_PAGO', 'REM_FORMA_PAGO'); inCat('REM_ANTICIPO', 'REM_ANTICIPO');
    inCat('REM_AFP', 'REM_AFP'); inCat('REM_SALUD', 'REM_SALUD');
    if (!blank(r.REM_OTROS_PACTOS) && String(r.REM_OTROS_PACTOS).length > 2000) err('REM_OTROS_PACTOS', 'REM_OTROS_PACTOS: máx. 2.000 caracteres');

    // 4. Jornada
    inCat('TIPO_JORNADA', 'TIPO_JORNADA');
    const tj = Number(r.TIPO_JORNADA);
    if (tj === 6) {
      if (need('NRO_RESOLUCION') && String(r.NRO_RESOLUCION).length > 12) err('NRO_RESOLUCION', 'NRO_RESOLUCION: máx. 12 caracteres');
      dateF('FECHA_RESOLUCION');
    }
    if (![6, 7].includes(tj) && tj) {
      const d = Number(r.DURACION_JORNADA);
      if (blank(r.DURACION_JORNADA) || !V.isInt(r.DURACION_JORNADA) || d < 1 || d > 180) err('DURACION_JORNADA', 'DURACION_JORNADA: horas entre 1 y 180');
      inCat('TURNOS', 'TURNOS');
    }
    if ([1, 2, 5, 8, 9].includes(tj)) {
      const tc = Number(r.TIEMPO_COLACION);
      if (blank(r.TIEMPO_COLACION) || !V.isInt(r.TIEMPO_COLACION) || !(tc === 0 || (tc >= 30 && tc <= 240))) err('TIEMPO_COLACION', 'TIEMPO_COLACION: 0 (sin colación) o entre 30 y 240 minutos');
      else if (Number(r.T_COLACION_IMP || 0) + Number(r.T_COLACION_NO_IMP || 0) !== tc) err('T_COLACION_IMP', 'Colación imputable + no imputable debe ser igual a TIEMPO_COLACION');
    }
    if ([1, 2, 8, 9].includes(tj)) inCat('ROTACION', 'ROTACION');
    if (tj === 3) { const n = Number(r.NRO_DIAS_DIST_JOR); if (!V.isInt(r.NRO_DIAS_DIST_JOR) || n < 7 || n > 12) err('NRO_DIAS_DIST_JOR', 'NRO_DIAS_DIST_JOR: entre 7 y 12 para jornada bisemanal'); }
    if (tj === 4) { const n = Number(r.NRO_DIAS_DIST_JOR); if (!V.isInt(r.NRO_DIAS_DIST_JOR) || n < 20 || n > 26) err('NRO_DIAS_DIST_JOR', 'NRO_DIAS_DIST_JOR: entre 20 y 26 para jornada mensual'); }
    if ([1, 2, 5, 8, 9].includes(tj)) {
      let dias = 0;
      for (const d of DIAS) {
        const a = r[d + '_HORA_INICIO'], b = r[d + '_HORA_TERMINO'];
        if (blank(a) && blank(b)) continue;
        if (blank(a) || blank(b) || !V.isTime(a) || !V.isTime(b)) err(d + '_HORA_INICIO', `${DIAS_LABEL[d]}: horas de inicio y término requeridas en formato HH:MM`);
        else dias++;
        if (d === 'DOMINGO' && ![8, 9].includes(tj)) err('DOMINGO_HORA_INICIO', 'Domingo solo se informa en jornadas Art. 38 (tipos 8 y 9)');
      }
      if (dias === 0) err('LUNES_HORA_INICIO', 'Debe informar horario de al menos un día');
      if (r.NRO_DIAS_DIST_JOR && ![3, 4].includes(tj) && Number(r.NRO_DIAS_DIST_JOR) !== dias) err('NRO_DIAS_DIST_JOR', 'La cantidad de días con horario no coincide con NRO_DIAS_DIST_JOR');
    }

    // Fechas y plazo
    inCat('TIPO_CONTRATO', 'TIPO_CONTRATO');
    dateF('FECHA_INI_RELABORAL');
    if (String(r.TIPO_CONTRATO) === '2') {
      if (need('FECHA_FIN_RELABORAL')) {
        if (!V.isDate(r.FECHA_FIN_RELABORAL)) err('FECHA_FIN_RELABORAL', 'FECHA_FIN_RELABORAL: formato inválido');
        else if (V.isDate(r.FECHA_INI_RELABORAL) && V.toDate(r.FECHA_FIN_RELABORAL) <= V.toDate(r.FECHA_INI_RELABORAL)) err('FECHA_FIN_RELABORAL', 'FECHA_FIN_RELABORAL debe ser posterior al inicio');
      }
    }
    // Otras estipulaciones
    ['INDEMNIZACIONES', 'FERIADOS', 'NEGOCIACIONES', 'PROPINTELECTUAL', 'LICMEDICA', 'SALACUNA', 'PERMISOS', 'CONESPECIALES', 'SEGUROS', 'STOCK', 'INSTCOLECTIVO']
      .forEach(k => inCat('OTROS_' + k, 'SINO'));
    if (String(r.OTROS_INSTCOLECTIVO) === '1') {
      inCat('AFECTO_A', 'AFECTO_A'); dateF('FECHA_INI_INSTCOLECTIVO'); dateF('FECHA_FIN_INSTCOLECTIVO');
    }
    return e;
  };

  // Validaciones de archivo (requisitos del instructivo)
  V.validateFileMeta = function (file, rutEmpleador) {
    const errs = [];
    if (!/\.csv$/i.test(file.name)) errs.push('La extensión del archivo debe ser CSV.');
    if (file.size > 5 * 1024 * 1024) errs.push('El archivo supera el peso máximo de 5 MB.');
    const base = file.name.replace(/\.csv$/i, '');
    const expected = /^(\d{7,8}-[\dK])_(\d{4})(0[1-9]|1[0-2])$/i.exec(base);
    if (!expected) errs.push('El nombre debe tener el formato rutempleador_aaaamm (ej. 76123456-0_202611).');
    else if (expected[1].toUpperCase() !== rutEmpleador) errs.push(`El RUT del nombre del archivo (${expected[1]}) no coincide con el del empleador (${rutEmpleador}).`);
    return errs;
  };

  // Parser CSV con delimitador ";" (el instructivo exige punto y coma). Soporta comillas.
  V.parseCSV = function (text) {
    text = text.replace(/^﻿/, '');
    const delim = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return { delim, rows: rows.filter(r => r.some(x => String(x).trim() !== '')) };
  };
  V.toCSV = function (rows) {
    const esc = v => { v = v == null ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n') + '\r\n';
  };

  window.V = V;
})();
