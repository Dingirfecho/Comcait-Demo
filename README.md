# Comcait Demo — simulador de Registro Electrónico Laboral (contratos de trabajo, Chile)

Sitio estático (HTML/CSS/JS, sin build) que reproduce las pantallas y los datos que exige el registro de un contrato de trabajo, para probar un escenario n8n que lee un contrato y lo carga automáticamente. **No es el sitio oficial y no envía nada a ningún organismo**; los datos viven en `localStorage`.

Basado en la *Guía rápida Registro de Contrato de Trabajo* (v. 10.01.2024) y el *Instructivo de Registro Masivo* (v. 21.04.22).

## Pantallas
Login simulado → Menú REL → Registro de Contrato (Individual / Masivo / Borradores) → Individual en 4 etapas (partes; funciones y lugar; remuneraciones; jornada y otras estipulaciones) → confirmación → Historial (versión, estado, comprobante) · Masivo (antecedentes + carga CSV con validaciones) · Correos simulados · Integración n8n.

## Contrato de datos
Todos los campos tienen `data-field="<COLUMNA_CSV>"`; `js/validate.js` aplica las reglas del instructivo (RUT módulo 11, códigos de tablas 1–5, dependencias entre campos). `docs/esquema-contrato.json` es un ejemplo del JSON que debería producir n8n.

## Vías de carga para n8n
1. **Masivo (recomendada para varios contratos):** n8n extrae los datos del contrato, arma un CSV `;` con `CSV_COLUMNS` (ver `js/catalogs.js`), nombre `rutempleador_aaaamm.csv`, y lo sube en `#/masivo` (`[data-testid=csv-file]`) con Playwright/Browserless.
2. **Individual (un contrato):** n8n navega a `#/prefill` y llama `COMCAIT.fillIndividual(json, {submit:true})`, o rellena `[data-field=…]` etapa por etapa.

Supuestos a confirmar con el portal real: el orden exacto de columnas de la plantilla oficial (aquí se sigue el orden del instructivo), y que Sábado/Domingo pueden quedar vacíos.

## Publicar
GitHub Pages: Settings → Pages → rama `main`, carpeta `/ (root)`.
