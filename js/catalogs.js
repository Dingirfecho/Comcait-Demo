// Catálogos de códigos — Instructivo de Registro Masivo de Contratos de Trabajo (v. 21.04.22)
// y Guía rápida Registro de Contrato de Trabajo (v. 10.01.2024).
// Las comunas (Tabla 1) están en js/_comunas.js
window.CAT = {
  CATEGORIA_CONTRATO: { 1: 'Contrato de Trabajo sujeto a reglas generales' },
  SEXO: { 1: 'Femenino', 2: 'Masculino' },
  SINO: { 0: 'No', 1: 'Sí' },
  // Subconjunto de la tabla de nacionalidades (el instructivo lista ~300 códigos)
  NACIONALIDAD: {
    320: 'Chilena', 301: 'Argentina', 302: 'Boliviana', 303: 'Brasileña', 304: 'Colombiana',
    305: 'Ecuatoriana', 306: 'Guyanesa', 307: 'Paraguaya', 308: 'Peruana', 309: 'Surinameña',
    310: 'Uruguaya', 311: 'Venezolana', 206: 'Cubana', 211: 'Haitiana', 217: 'Dominicana',
    210: 'Guatemalteca', 212: 'Hondureña', 214: 'Nicaragüense', 215: 'Panameña', 208: 'Salvadoreña',
    205: 'Costarricense', 103: 'Mexicana', 102: 'Estadounidense', 101: 'Canadiense',
    609: 'Española', 611: 'Francesa', 602: 'Alemana', 625: 'Británica', 624: 'Portuguesa',
    511: 'China popular', 515: 'India', 520: 'Japonesa', 999: 'Apátrida'
  },
  // Tabla 2 — HABER (Suplemento LRE)
  HABER: {
    2: 'Sobresueldo', 3: 'Comisiones (mensual)', 4: 'Semana corrida mensual (Art. 45)', 5: 'Participación (mensual)',
    7: 'Recargo 30% día domingo (Art. 38)', 8: 'Remuneración variable pagada en vacaciones (Art. 71)',
    9: 'Remuneración variable pagada en clausura (Art. 38 DFL 2)', 10: 'Aguinaldo',
    11: 'Bonos u otras remuneraciones fijas mensuales', 12: 'Tratos (mensual)',
    13: 'Bonos u otras remuneraciones variables mensuales o superiores a un mes',
    14: 'Ejercicio opción no pactada en contrato (Art. 17 Nº8 LIR)', 15: 'Beneficios en especie constitutivos de remuneración',
    16: 'Remuneraciones bimestrales (devengo en dos meses)', 17: 'Remuneraciones trimestrales (devengo en tres meses)',
    18: 'Remuneraciones cuatrimestrales (devengo en cuatro meses)', 19: 'Remuneraciones semestrales (devengo en seis meses)',
    20: 'Remuneraciones anuales (devengo en doce meses)', 21: 'Participación anual (devengo en doce meses)',
    22: 'Otras remuneraciones superiores a un mes', 23: 'Pago por horas de trabajo sindical',
    24: 'Subsidio por incapacidad laboral por licencia médica - total mensual', 25: 'Beca de estudio (Art. 17 Nº18 LIR)',
    26: 'Gratificaciones de zona (Art. 17 Nº29 LIR)', 27: 'Otros ingresos no constitutivos de renta (Art. 17 Nº29 LIR)',
    28: 'Indemnizaciones voluntarias tributables', 29: 'Indemnizaciones contractuales tributables',
    30: 'Colación total mensual (Art. 41)', 31: 'Movilización total mensual (Art. 41)', 32: 'Viáticos total mensual (Art. 41)',
    33: 'Asignación de pérdida de caja total mensual (Art. 41)', 34: 'Asignación de desgaste herramienta total mensual (Art. 41)',
    35: 'Asignación familiar legal total mensual (Art.41)', 36: 'Gastos por causa del trabajo (Art. 41)',
    37: 'Gastos por cambio de residencia (Art. 53)', 38: 'Sala cuna (Art. 203)',
    39: 'Asignación trabajo a distancia o teletrabajo', 40: 'Depósito convenido hasta UF 900',
    41: 'Alojamiento por razones de trabajo (Art. 17 Nº14 LIR)', 42: 'Asignación de traslación (Art. 17 Nº14 LIR)',
    43: 'Indemnización por feriado legal', 44: 'Indemnización años de servicio', 45: 'Indemnización sustitutiva del aviso previo',
    46: 'Indemnización fuero maternal (Art. 163 bis)', 47: 'Indemnización a todo evento (Art. 164)'
  },
  // Tabla 3 — periodo de devengamiento
  PER_DEVENGAMIENTO: { 1: 'Hora', 2: 'Diario', 3: 'Semanal', 4: 'Quincenal', 5: 'Mensual', 6: 'Bimestral', 7: 'Trimestral', 8: 'Cuatrimestral', 9: 'Semestral', 10: 'Anual' },
  // Tabla 4 — gratificación
  GRAT_FORMA_PAGO: { 1: 'No pactado en contrato de trabajo', 2: 'Artículo 47 Código del Trabajo', 3: 'Modalidad convencional superior al mínimo legal', 4: 'Artículo 50 del Código del Trabajo', 5: 'Sin obligación legal de pago' },
  PERIODO_PAGO: { 1: 'Mensual', 2: 'Bimestral', 3: 'Trimestral', 4: 'Cuatrimestral', 5: 'Semestral', 6: 'Anual' },
  REM_FORMA_PAGO: { 1: 'Dinero en efectivo', 2: 'Cheque', 3: 'Vale vista', 4: 'Depósito bancario', 5: 'Transferencia bancaria' },
  REM_ANTICIPO: { 1: 'Sin anticipo', 2: 'Por hora', 3: 'Diario', 4: 'Semanal', 5: 'Quincenal' },
  REM_AFP: { 6: 'AFP Provida', 11: 'AFP Planvital', 13: 'AFP Cuprum', 14: 'AFP Habitat', 19: 'Uno S.A.', 27: 'AFP Bansander', 31: 'AFP Capital', 100: 'No afiliado', 101: 'IPS', 103: 'AFP Modelo', 104: 'Persona exceptuada de cotizar' },
  REM_SALUD: { 1: 'Isapre Cruz Blanca', 3: 'Isapre Banmédica', 4: 'Isapre Colmena', 9: 'Isapre Consalud', 12: 'Isapre Vida Tres', 37: 'Isapre Chuquicamata', 38: 'Isapre Cruz del Norte', 39: 'Isapre Fusat', 40: 'Isapre Fundación', 41: 'Isapre Río Blanco', 42: 'Isapre San Lorenzo', 43: 'Isapre Nueva Masvida', 102: 'Fonasa' },
  // Tabla 5 — tipo de jornada
  TIPO_JORNADA: { 1: 'Jornada Semanal Ordinaria', 2: 'Jornada Semanal Extendida', 3: 'Jornada Bisemanal', 4: 'Jornada Mensual', 5: 'Jornada Diaria', 6: 'Jornada Excepcional', 7: 'Jornada Art. 22', 8: 'Art. 38 Semanal Ordinaria', 9: 'Art. 38 Semanal Extendida' },
  TURNOS: { 1: 'Horario fijo sin turno', 2: 'Mañana', 3: 'Tarde', 4: 'Noche' },
  ROTACION: { 1: 'Horario fijo sin turno', 2: 'Mañana', 3: 'Tarde', 4: 'Noche' },
  TIPO_CONTRATO: { 1: 'Indefinido', 2: 'Plazo fijo', 3: 'Obra o faena' },
  AFECTO_A: { 1: 'Afecto a contrato colectivo', 2: 'Afecto a convenio colectivo', 3: 'Afecto a acuerdo de grupo negociador', 4: 'Afecto a fallo arbitral', 5: 'Afecto a extensión de beneficio' }
};
window.CAT.COMUNAS = window.CAT_COMUNAS;

window.DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
window.DIAS_LABEL = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo' };

// Orden de columnas del CSV de carga masiva (según el orden del instructivo)
window.CSV_COLUMNS = [
  'CATEGORIA_CONTRATO', 'COMUNA_CELEBRACION', 'FECHA_SUSCRPCION', 'RUT_TRABAJADOR', 'DNI_TRABAJADOR', 'FECHA_NACIMIENTO',
  'NOMBRES', 'APELLIDOS', 'SEXO', 'NACIONALIDAD', 'EMAIL', 'TELEFONO', 'COMUNA', 'CALLE', 'NUMERO', 'DPTO',
  'DECLARACION_DISCAPACIDAD', 'DECLARACION_INVALIDEZ', 'FUNCIONES', 'SUBCONTRATACION', 'RUT_EMPRESA_PRINCIPAL', 'EST',
  'RUT_EMPRESA_USUARIA', 'FAENA_COMUNA', 'FAENA_CALLE', 'FAENA_NUMERO', 'FAENA_DPTO',
  'ZONA_GEOGRAFICA_1', 'ZONA_GEOGRAFICA_2', 'ZONA_GEOGRAFICA_3', 'ZONA_GEOGRAFICA_4', 'ZONA_GEOGRAFICA_5',
  'SUELDO_BASE', 'MONTO_IMPONIBLE',
  'HABER_1', 'MONTO_1', 'PER_DEVENGAMIENTO_1', 'HABER_2', 'MONTO_2', 'PER_DEVENGAMIENTO_2', 'HABER_3', 'MONTO_3', 'PER_DEVENGAMIENTO_3',
  'HABER_4', 'MONTO_4', 'PER_DEVENGAMIENTO_4', 'HABER_5', 'MONTO_5', 'PER_DEVENGAMIENTO_5',
  'GRAT_FORMA_PAGO', 'GRAT_MODALIDAD', 'GRAT_PERIODO_PAGO', 'REM_PERIODO_PAGO', 'REM_FECHA_PAGO', 'REM_FORMA_PAGO',
  'REM_ANTICIPO', 'REM_AFP', 'REM_SALUD', 'REM_OTROS_PACTOS',
  'TIPO_JORNADA', 'NRO_RESOLUCION', 'FECHA_RESOLUCION', 'DURACION_JORNADA', 'TURNOS', 'TIEMPO_COLACION',
  'T_COLACION_IMP', 'T_COLACION_NO_IMP', 'ROTACION', 'NRO_DIAS_DIST_JOR',
  'LUNES_HORA_INICIO', 'LUNES_HORA_TERMINO', 'MARTES_HORA_INICIO', 'MARTES_HORA_TERMINO',
  'MIERCOLES_HORA_INICIO', 'MIERCOLES_HORA_TERMINO', 'JUEVES_HORA_INICIO', 'JUEVES_HORA_TERMINO',
  'VIERNES_HORA_INICIO', 'VIERNES_HORA_TERMINO', 'SABADO_HORA_INICIO', 'SABADO_HORA_TERMINO',
  'DOMINGO_HORA_INICIO', 'DOMINGO_HORA_TERMINO',
  'TIPO_CONTRATO', 'FECHA_INI_RELABORAL', 'FECHA_FIN_RELABORAL',
  'OTROS_INDEMNIZACIONES', 'OTROS_FERIADOS', 'OTROS_NEGOCIACIONES', 'OTROS_PROPINTELECTUAL', 'OTROS_LICMEDICA',
  'OTROS_SALACUNA', 'OTROS_PERMISOS', 'OTROS_CONESPECIALES', 'OTROS_SEGUROS', 'OTROS_STOCK', 'OTROS_INSTCOLECTIVO',
  'AFECTO_A', 'FECHA_INI_INSTCOLECTIVO', 'FECHA_FIN_INSTCOLECTIVO'
];

// Empleador ficticio (en el portal real viene del SII / Registro Civil)
window.EMPLEADOR = {
  rut: '76123456-0',
  razonSocial: 'Empresa Demo Comcait SpA',
  domicilios: [
    { id: 'd1', region: 'Región Metropolitana', comunaCod: 280, calle: 'Av. Apoquindo', numero: '4500', dpto: 'Of. 1201' },
    { id: 'd2', region: 'Región Metropolitana', comunaCod: 286, calle: 'Agustinas', numero: '1050', dpto: '' }
  ],
  caes: [
    { cod: '620100', glosa: 'Actividades de programación informática' },
    { cod: '702000', glosa: 'Actividades de consultoría de gestión' },
    { cod: 'otro', glosa: 'Otro' }
  ],
  representantes: [
    { rut: '12345678-5', nombre: 'María Fernanda Soto Rivas' },
    { rut: '15234567-4', nombre: 'Andrés Ignacio Pizarro Vega' }
  ]
};
