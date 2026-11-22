// Persistencia local (localStorage) — hace de "backend" del simulador.
(function () {
  const K = { contracts: 'comcait.contracts', drafts: 'comcait.drafts', mails: 'comcait.mails', batches: 'comcait.batches', session: 'comcait.session', masivo: 'comcait.masivo' };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Directorio ficticio que hace de "Registro Civil" para trabajadores con RUT
  const SRCEI = {
    '18765432-7': 'Camila Antonia Rojas Fuentes', '11222333-9': 'Jorge Luis Herrera Mena', '9876543-3': 'Rosa Elena Tapia Núñez',
    '15234567-4': 'Andrés Ignacio Pizarro Vega', '12345678-5': 'María Fernanda Soto Rivas'
  };

  const S = {
    K, uid, SRCEI,
    get: k => read(K[k], k === 'session' ? false : (k === 'masivo' ? {} : [])),
    set: (k, v) => write(K[k], v),
    workerId: d => d.RUT_TRABAJADOR ? d.RUT_TRABAJADOR : (d.DNI_TRABAJADOR || ''),
    workerName(d) {
      if (d.RUT_TRABAJADOR) return SRCEI[d.RUT_TRABAJADOR] || [d.NOMBRES, d.APELLIDOS].filter(Boolean).join(' ') || '(nombre obtenido del SRCeI)';
      return [d.NOMBRES, d.APELLIDOS].filter(Boolean).join(' ');
    },
    addContract(data, origen) {
      const list = S.get('contracts');
      const wid = S.workerId(data);
      const prev = list.filter(c => c.workerId === wid);
      prev.forEach(c => { if (c.estado === 'Vigente') c.estado = 'No vigente'; });
      const rec = {
        id: uid(), workerId: wid, nombre: S.workerName(data), estado: 'Vigente',
        version: (prev.length + 1) + '.0', origen, folio: 'REL-' + new Date().getFullYear() + '-' + String(list.length + 1).padStart(6, '0'),
        registrado: new Date().toISOString(), data
      };
      list.push(rec); S.set('contracts', list); return rec;
    },
    removeContract(id) { S.set('contracts', S.get('contracts').filter(c => c.id !== id)); },
    saveDraft(draft) {
      const l = S.get('drafts'); const i = l.findIndex(d => d.id === draft.id);
      draft.updated = new Date().toISOString();
      if (i >= 0) l[i] = draft; else l.push(draft);
      S.set('drafts', l);
    },
    removeDraft(id) { S.set('drafts', S.get('drafts').filter(d => d.id !== id)); },
    addMail(asunto, cuerpo, adjunto) {
      const l = S.get('mails');
      l.unshift({ id: uid(), fecha: new Date().toISOString(), asunto, cuerpo, adjunto: adjunto || null, leido: false });
      S.set('mails', l);
    },
    resetAll() { Object.values(K).forEach(k => localStorage.removeItem(k)); }
  };
  window.Store = S;
})();
