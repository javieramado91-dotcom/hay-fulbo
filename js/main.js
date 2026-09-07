/* ============================================================
   HAY FULBO — main.js
   Punto de entrada: carga el estado y arranca la interfaz.
   ============================================================ */
(function (global) {
  'use strict';

  const HF = global.HF;

  function boot() {
    const required = ['util', 'store', 'teams', 'kit', 'themes', 'flyers', 'ui'];
    const missing = required.filter((key) => !HF || !HF[key]);
    if (missing.length) {
      console.error('[hayfulbo] faltan módulos:', missing.join(', '));
      return;
    }

    let session = { fromLink: false };
    try {
      session = HF.store.load();
    } catch (err) {
      console.error('[hayfulbo] no se pudo cargar el estado guardado', err);
      HF.store.reset(false);
    }

    HF.ui.init(session);

    /* Si llega un link de convocatoria con la app ya abierta, lo aplicamos igual. */
    window.addEventListener('hashchange', () => {
      if (!/[#&]m=/.test(location.hash)) return;
      try {
        HF.ui.reload(HF.store.load());
      } catch (err) {
        console.error('[hayfulbo] link de convocatoria inválido', err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window);
