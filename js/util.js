/* ============================================================
   HAY FULBO — util.js
   Helpers de DOM, formato, almacenamiento y feedback.
   Expone: window.HF.util
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});

  /* ---------------- DOM ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : String(v));
      }
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /** <svg><use href="#id"></use></svg> sin recurrir a innerHTML. */
  function icon(id, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (cls) svg.setAttribute('class', cls);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /** Delegación de eventos: on(root, 'click', '.sel', handler) */
  function on(root, type, selector, handler) {
    root.addEventListener(type, (ev) => {
      const target = ev.target.closest(selector);
      if (target && root.contains(target)) handler(ev, target);
    });
  }

  /* ---------------- ids / strings ---------------- */
  let seq = 0;
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + (seq++).toString(36);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function toInt(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Los puntajes van de a cuartos: 7 · 7,25 · 7,5 · 7,75 · 8. */
  function toQuarter(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(n * 4) / 4;
  }

  /** 7 → "7" · 7.5 → "7,5" · 7.25 → "7,25", con la coma de acá. */
  function formatScore(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0';
    return v.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  /** Normaliza para comparar nombres (sin tildes, sin case). */
  function normalize(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function titleCase(str) {
    return String(str || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(^|\s|['-])([\p{L}])/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('es'));
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /* ---------------- fechas / números ---------------- */
  const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  function parseISODate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** "2026-09-12" -> "VIE 12 SEP" */
  function formatDateShort(iso) {
    const d = parseISODate(iso);
    if (!d) return '';
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  /** "2026-09-12" -> "viernes 12 de septiembre" */
  function formatDateLong(iso) {
    const d = parseISODate(iso);
    if (!d) return '';
    try {
      return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (_) {
      return formatDateShort(iso);
    }
  }

  function formatTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = String(hhmm).split(':');
    if (h === undefined || m === undefined) return '';
    return `${h.padStart(2, '0')}:${m}`;
  }

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function money(n) {
    const v = Math.round(Number(n) || 0);
    return '$' + v.toLocaleString('es-AR');
  }

  /* ---------------- storage ---------------- */
  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        /* noop */
      }
    },
  };

  /* ---------------- base64url para links compartibles ---------------- */
  function encodeB64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeB64Url(str) {
    let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /* ---------------- clipboard ---------------- */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        /* cae al fallback */
      }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg, type) {
    const box = $('#toast');
    if (!box) return;
    const kind = type || 'check';
    box.dataset.type = kind;
    $('.toast__msg', box).textContent = msg;
    $('.toast__icon use', box).setAttribute(
      'href',
      kind === 'check' ? '#i-check' : kind === 'info' ? '#i-info' : '#i-warn'
    );
    box.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-on'), 2600);
  }

  /* ---------------- confetti ---------------- */
  let confettiRAF = null;
  function confetti(opts) {
    const cfg = Object.assign({ count: 130, duration: 2400, colors: ['#22ff88', '#ffcb3d', '#ffffff', '#00d9ff', '#ff5a7d'] }, opts);
    const canvas = $('#confetti');
    if (!canvas) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.classList.add('is-on');

    const W = window.innerWidth;
    const H = window.innerHeight;
    const pieces = Array.from({ length: cfg.count }, () => ({
      x: Math.random() * W,
      y: -Math.random() * H * 0.6,
      w: 5 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      color: cfg.colors[(Math.random() * cfg.colors.length) | 0],
      vx: (Math.random() - 0.5) * 2.2,
      vy: 2.4 + Math.random() * 4.2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.28,
      sway: Math.random() * Math.PI * 2,
    }));

    const start = performance.now();
    cancelAnimationFrame(confettiRAF);

    function frame(now) {
      const t = now - start;
      const fade = t > cfg.duration - 500 ? Math.max(0, (cfg.duration - t) / 500) : 1;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        p.sway += 0.06;
        p.x += p.vx + Math.sin(p.sway) * 0.9;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > H + 30) {
          p.y = -20;
          p.x = Math.random() * W;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (t < cfg.duration) {
        confettiRAF = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        canvas.classList.remove('is-on');
      }
    }
    confettiRAF = requestAnimationFrame(frame);
  }

  /* ---------------- modales ---------------- */
  const modalStack = [];

  function openModal(id) {
    const modal = typeof id === 'string' ? $('#' + id) : id;
    if (!modal) return;
    modal.hidden = false;
    modalStack.push(modal);
    document.body.style.overflow = 'hidden';
    const focusable = modal.querySelector('button, [href], input, select, textarea');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 40);
  }

  function closeModal(id) {
    const modal = typeof id === 'string' ? $('#' + id) : id || modalStack[modalStack.length - 1];
    if (!modal) return;
    modal.hidden = true;
    const i = modalStack.indexOf(modal);
    if (i >= 0) modalStack.splice(i, 1);
    if (!modalStack.length) document.body.style.overflow = '';
  }

  function initModals() {
    $$('.modal').forEach((modal) => {
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal || ev.target.closest('[data-close]')) closeModal(modal);
      });
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && modalStack.length) closeModal(modalStack[modalStack.length - 1]);
    });
  }

  let confirmHandler = null;
  function confirmDialog(title, text, onYes) {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    confirmHandler = onYes;
    openModal('confirm-modal');
  }

  function initConfirm() {
    const yes = $('#confirm-yes');
    if (!yes) return;
    yes.addEventListener('click', () => {
      closeModal('confirm-modal');
      const fn = confirmHandler;
      confirmHandler = null;
      if (fn) fn();
    });
  }

  /* ---------------- exports ---------------- */
  HF.util = {
    $, $$, el, icon, on,
    uid, clamp, toInt, toQuarter, formatScore, normalize, titleCase, initials,
    formatDateShort, formatDateLong, formatTime, todayISO, money, parseISODate,
    storage, encodeB64Url, decodeB64Url, copyText,
    toast, confetti,
    openModal, closeModal, initModals, confirmDialog, initConfirm,
  };
})(window);
