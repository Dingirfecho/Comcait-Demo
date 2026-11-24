// Robot de Browserless (/function, Puppeteer) que carga UN archivo CSV en el Registro Masivo de Comcait Demo
// y simula el procesamiento. context = { url, rep, email, tel, cae, cargo, archivo, csv }
export default async ({ page, context }) => {
  const responder = (data) => ({ data, type: 'application/json' });
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const pasos = [];
  const captura = async () => { try { return await page.screenshot({ encoding: 'base64', type: 'png', fullPage: true }); } catch (e) { return null; } };
  const consola = [];
  page.on('pageerror', (e) => consola.push('JS: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') consola.push('consola: ' + m.text()); });
  const errores = () => page.evaluate(() => Array.from(document.querySelectorAll('.errbox li, .errbox tbody tr')).map((e) => e.textContent.trim().replace(/\s+/g, ' ')).slice(0, 15));
  const fallo = async (paso, error, extra) => {
    let diag = '';
    try { diag = ' [dirección: ' + (await page.evaluate(() => location.hash)) + (consola.length ? '; ' + consola.slice(0, 3).join(' | ') : '') + ']'; } catch (e) { /* sin diagnóstico */ }
    return responder({ ok: false, paso, pasos, archivo: context.archivo, error: error + diag, ...(extra || {}), captura: await captura() });
  };

  await page.setViewport({ width: 1280, height: 1000 });
  try { await page.goto(context.url + '#/login', { waitUntil: 'networkidle2', timeout: 45000 }); }
  catch (e) { return responder({ ok: false, paso: 'abrir', pasos, archivo: context.archivo, error: 'No se pudo abrir el sitio: ' + e.message }); }

  try {
    await page.waitForSelector('#btn-login', { timeout: 15000 });
    await page.click('#btn-login'); pasos.push('ingreso');
    await page.waitForSelector('[data-testid=card-registro-contrato]', { timeout: 10000 });
    await page.click('[data-testid=card-registro-contrato]');
    await page.waitForSelector('[data-testid=card-masivo]', { timeout: 10000 });
    await page.click('[data-testid=card-masivo]');
    await page.waitForSelector('[data-testid=csv-file]', { timeout: 10000 });
    pasos.push('registro masivo');

    // 1. Antecedentes del contrato (se completan antes de subir el archivo)
    await page.evaluate((c) => {
      const poner = (id, v) => { const el = document.getElementById(id); if (!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      poner('m-rep', c.rep); poner('m-email', c.email); poner('m-tel', c.tel); poner('m-cae', c.cae); poner('m-cargo', c.cargo);
    }, context);
    pasos.push('antecedentes completos');

    // 2. Subir el CSV
    await page.evaluate((nombre, csv) => {
      const inp = document.querySelector('[data-testid=csv-file]');
      const dt = new DataTransfer();
      dt.items.add(new File([csv], nombre, { type: 'text/csv' }));
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }, context.archivo, context.csv);
    await Promise.race([
      page.waitForSelector('.okbar', { timeout: 15000 }),
      page.waitForSelector('.errbox', { timeout: 15000 })
    ]).catch(() => {});
    if (!(await page.$('.okbar'))) {
      return await fallo('archivo', 'El sitio rechazó el archivo ' + context.archivo, { errores: await errores() });
    }
    pasos.push('archivo válido');

    // 3. Declaración jurada y carga
    await page.evaluate(() => { const c = document.getElementById('f-MASIVO_DJ'); if (c && !c.checked) c.click(); });
    await page.waitForFunction("(() => { const b = document.querySelector('[data-testid=btn-cargar]'); return b && !b.disabled; })()", { timeout: 5000 });
    await page.click('[data-testid=btn-cargar]');
    await page.waitForSelector('.ok-box', { timeout: 10000 });
    pasos.push('archivo cargado');

    // 4. Procesamiento (en el sitio real tarda hasta 7 días; acá se simula)
    await page.evaluate(() => { location.hash = '#/correos'; });
    await page.waitForSelector('[data-testid=btn-procesar]', { timeout: 10000 });
    await page.click('[data-testid=btn-procesar]');
    await espera(500);
    const correos = await page.evaluate(() => Array.from(document.querySelectorAll('article.mail')).map((a) => ({ asunto: a.querySelector('header b').textContent.trim(), cuerpo: a.querySelector('pre').textContent.trim() })));
    const final = correos.find((c) => /procesado/.test(c.asunto));
    pasos.push('procesamiento simulado');
    const asuntos = correos.map((c) => c.asunto);
    if (!final || !/correctamente/.test(final.asunto)) {
      return await fallo('procesamiento', 'La validación de fondo observó el archivo', { correos: asuntos, detalle: final ? final.cuerpo : null });
    }

    // 5. Resultado en el historial
    await page.evaluate(() => { location.hash = '#/historial'; });
    await page.waitForSelector('[data-testid=tabla-historial]', { timeout: 5000 }).catch(() => {});
    const registros = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid=tabla-historial] tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).slice(0, 6).map((td) => td.textContent.trim())));
    const folios = registros.map((r) => r[5]).filter(Boolean);
    pasos.push(folios.length + ' contrato(s) registrado(s)');
    return responder({ ok: true, paso: 'registrado', pasos, archivo: context.archivo, folios, registrados: folios.length, correos: asuntos, captura: await captura() });
  } catch (e) {
    return await fallo('robot', 'El robot se cortó: ' + e.message);
  }
};
