// Robot de Browserless (/function, Puppeteer) que registra UN contrato en el formulario individual de Comcait Demo.
// context = { url, datos }   datos = claves de columnas del CSV de la DT + extras del formulario (ver esquema-contrato.json)
export default async ({ page, context }) => {
  const responder = (data) => ({ data, type: 'application/json' });
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const pasos = [];
  const datos = context.datos || {};
  const captura = async () => { try { return await page.screenshot({ encoding: 'base64', type: 'png', fullPage: true }); } catch (e) { return null; } };
  const errores = () => page.evaluate(() => Array.from(document.querySelectorAll('.errbox li')).map((e) => e.textContent.trim()));
  const fallo = async (paso, error, extra) => responder({ ok: false, paso, pasos, error, ...(extra || {}), captura: await captura() });

  // Escribe en la página los valores de "datos" en los campos [data-field]. Varias pasadas: algunos campos
  // (régimen especial, tipo de jornada, tipo de contrato...) hacen aparecer otros al cambiar.
  const llenar = () => page.evaluate((d) => {
    const avisar = (el) => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    for (let pasada = 0; pasada < 3; pasada++) {
      for (const [k, v] of Object.entries(d)) {
        if (v === null || v === undefined || v === '') continue;
        const el = document.querySelector('[data-field="' + k + '"]');
        if (!el || el.disabled) continue;
        const val = String(v);
        if (el.type === 'checkbox') { const q = val === '1'; if (el.checked !== q) { el.checked = q; avisar(el); } }
        else if (el.value !== val) { el.value = val; avisar(el); }
      }
    }
  }, datos);

  await page.setViewport({ width: 1280, height: 1000 });
  try { await page.goto(context.url + '#/login', { waitUntil: 'networkidle2', timeout: 45000 }); }
  catch (e) { return responder({ ok: false, paso: 'abrir', pasos, error: 'No se pudo abrir el sitio: ' + e.message }); }

  try {
    await page.waitForSelector('#btn-login', { timeout: 15000 });
    await page.click('#btn-login'); pasos.push('ingreso');
    await page.waitForSelector('[data-testid=card-registro-contrato]', { timeout: 10000 });
    await page.click('[data-testid=card-registro-contrato]');
    await page.waitForSelector('[data-testid=card-individual]', { timeout: 10000 });
    await page.click('[data-testid=card-individual]'); pasos.push('registro individual');

    for (let n = 1; n <= 3; n++) {
      // Esperar a que la etapa esté dibujada (si el sitio volvió al menú, se vuelve a la etapa).
      await page.waitForFunction('location.hash === "#/ind/' + n + '"', { timeout: 10000 }).catch(() => {});
      if (!(await page.$('[data-testid=btn-next]'))) {
        await page.evaluate((x) => { location.hash = '#/ind/' + x; }, n);
        await page.waitForSelector('[data-testid=btn-next]', { timeout: 10000 });
      }
      if (n === 3) {  // tantas filas de haberes como haya HABER_n
        let k = 1; for (let i = 1; i <= 5; i++) if (datos['HABER_' + i]) k = i;
        for (let i = 1; i < k; i++) { await page.click('[data-testid=btn-add-haber]'); await espera(150); }
      }
      await llenar(); pasos.push('etapa ' + n + ' completa');
      await page.click('[data-testid=btn-next]');
      // Esperar el resultado: pasa a la etapa siguiente o aparecen errores.
      await Promise.race([
        page.waitForFunction('location.hash === "#/ind/' + (n + 1) + '"', { timeout: 10000 }),
        page.waitForSelector('.errbox', { timeout: 10000 })
      ]).catch(() => {});
      await espera(300);
      const errs = await errores();
      if (errs.length) return await fallo('etapa ' + n, 'El formulario rechazó la etapa ' + n, { errores: errs });
    }
    await page.waitForSelector('[data-testid=btn-finalizar]', { timeout: 10000 });
    await llenar();
    await page.evaluate(() => { const c = document.querySelector('[data-field="DECLARACION_JURADA"]'); if (c && !c.checked) c.click(); });
    pasos.push('etapa 4 completa y declaración jurada');
    await page.click('[data-testid=btn-finalizar]');
    await page.waitForSelector('[data-testid=btn-aceptar]', { timeout: 5000 });
    await page.click('[data-testid=btn-aceptar]');
    await Promise.race([
      page.waitForSelector('[data-testid=registro-exitoso]', { timeout: 10000 }),
      page.waitForSelector('.errbox', { timeout: 10000 })
    ]).catch(() => {});
    if (!(await page.$('[data-testid=registro-exitoso]'))) {
      const errs = await errores();
      return await fallo('finalizar', errs.length ? 'El formulario rechazó el registro' : 'El sitio no confirmó el registro', { errores: errs });
    }
    const folio = await page.$eval('[data-testid=folio]', (e) => e.textContent.trim());
    pasos.push('registro exitoso ' + folio);
    await page.evaluate(() => { location.hash = '#/historial'; });
    await page.waitForSelector('[data-testid=tabla-historial]', { timeout: 5000 }).catch(() => {});
    return responder({ ok: true, paso: 'registrado', pasos, folio, captura: await captura() });
  } catch (e) {
    return await fallo('robot', 'El robot se cortó: ' + e.message);
  }
};
