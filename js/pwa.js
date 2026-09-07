/* ============================================================
   HAY FULBO — pwa.js
   Registro del service worker, invitación a instalar y aviso de
   versión nueva. Expone: window.HF.pwa
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const U = HF.util;

  const DISMISS_KEY = 'hayfulbo:install-dismissed';

  let deferredPrompt = null;
  let waitingWorker = null;
  let reloading = false;

  /* ---------------- estado del entorno ---------------- */

  /** ¿Ya está corriendo como app instalada? */
  function isStandalone() {
    return (
      global.matchMedia('(display-mode: standalone)').matches ||
      global.matchMedia('(display-mode: minimal-ui)').matches ||
      navigator.standalone === true
    );
  }

  /** iOS no dispara beforeinstallprompt: hay que explicar el paso a mano. */
  function isIOS() {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /* ---------------- banner de instalación ---------------- */

  function showBanner(mode) {
    const banner = U.$('#install-banner');
    if (!banner || isStandalone()) return;
    if (U.storage.get(DISMISS_KEY, false)) return;
    banner.dataset.mode = mode;
    banner.hidden = false;
  }

  function hideBanner() {
    const banner = U.$('#install-banner');
    if (banner) banner.hidden = true;
  }

  async function promptInstall() {
    if (deferredPrompt) {
      hideBanner();
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        U.toast('Instalando Hay Fulbo…', 'check');
      } else {
        U.storage.set(DISMISS_KEY, true);
      }
      return;
    }
    /* Sin prompt nativo (iOS, o navegador que no lo soporta): mostramos el cómo. */
    U.openModal('ios-modal');
  }

  /* ---------------- actualizaciones ---------------- */

  function showUpdate(worker) {
    waitingWorker = worker;
    const bar = U.$('#update-bar');
    if (bar) bar.hidden = false;
  }

  function applyUpdate() {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    const bar = U.$('#update-bar');
    if (bar) bar.hidden = true;
  }

  function watchRegistration(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const incoming = reg.installing;
      if (!incoming) return;
      incoming.addEventListener('statechange', () => {
        if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdate(incoming);
        }
      });
    });
  }

  /* ---------------- arranque ---------------- */

  function init() {
    const installBtn = U.$('#btn-install');
    const dismissBtn = U.$('#btn-install-dismiss');
    const updateBtn = U.$('#btn-update');

    if (installBtn) installBtn.addEventListener('click', promptInstall);
    if (updateBtn) updateBtn.addEventListener('click', applyUpdate);
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        U.storage.set(DISMISS_KEY, true);
        hideBanner();
      });
    }

    global.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      deferredPrompt = ev;
      showBanner('prompt');
    });

    global.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideBanner();
      U.storage.set(DISMISS_KEY, true);
      U.toast('¡Listo! Hay Fulbo quedó en tu pantalla de inicio.', 'check');
    });

    /* En iOS el banner se muestra igual, con instrucciones en vez de prompt. */
    if (isIOS() && !isStandalone()) setTimeout(() => showBanner('ios'), 1200);

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      global.location.reload();
    });

    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(watchRegistration)
      .catch((err) => console.warn('[hayfulbo] no se pudo registrar el service worker', err));
  }

  HF.pwa = { init, isStandalone, isIOS, promptInstall };
})(window);
