/* ============================================================
   HAY FULBO — canvas-kit.js
   Primitivas de dibujo reutilizables para el motor de flyers.
   Todo se dibuja en un lienzo de 1080x1920 (9:16).
   Expone: window.HF.kit
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});

  const FONT_DISPLAY = 'Anton, "Arial Black", sans-serif';
  const FONT_COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const FONT_BODY = 'Inter, system-ui, sans-serif';

  /* ---------------- fuentes ---------------- */
  const FONT_SPECS = [
    '400 120px Anton',
    '700 60px "Barlow Condensed"',
    '600 40px "Barlow Condensed"',
    '800 40px Inter',
    '600 32px Inter',
    '400 28px Inter',
  ];

  let fontsPromise = null;
  /** Garantiza que las tipografías estén listas antes de rasterizar. */
  function loadFonts() {
    if (fontsPromise) return fontsPromise;
    if (!document.fonts || !document.fonts.load) {
      fontsPromise = Promise.resolve(false);
      return fontsPromise;
    }
    fontsPromise = Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec).catch(() => null)))
      .then(() => document.fonts.ready)
      .then(() => true)
      .catch(() => false);
    return fontsPromise;
  }

  /* ---------------- color ---------------- */
  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const c = (k) => Math.round(a[k] + (b[k] - a[k]) * t);
    return `rgb(${c('r')},${c('g')},${c('b')})`;
  }

  /* ---------------- formas ---------------- */
  function rr(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRR(ctx, x, y, w, h, r, fill) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRR(ctx, x, y, w, h, r, stroke, width) {
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width || 2;
    ctx.stroke();
  }

  function lg(ctx, x0, y0, x1, y1, stops) {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
    return grad;
  }

  /** Halo radial suave (luz de estadio, brillo detrás de un título…). */
  function glow(ctx, x, y, radius, color, alpha) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(0.55, rgba(color, alpha * 0.28));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  /* ---------------- texturas ---------------- */
  let noiseTile = null;
  function getNoiseTile() {
    if (noiseTile) return noiseTile;
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    const img = cx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    noiseTile = c;
    return c;
  }

  /** Grano de film para que el degradé no se vea plano. */
  function grain(ctx, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function vignette(ctx, w, h, strength) {
    const grad = ctx.createRadialGradient(w / 2, h * 0.42, h * 0.18, w / 2, h * 0.5, h * 0.78);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /** Conos de luz que bajan desde el borde superior. */
  function beams(ctx, w, h, color, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    [[-0.1, 0.22], [0.42, 0.5], [1.1, 0.78]].forEach(([from, to], i) => {
      const x0 = w * from;
      const x1 = w * to;
      ctx.beginPath();
      ctx.moveTo(x0 - 70, -40);
      ctx.lineTo(x0 + 70, -40);
      ctx.lineTo(x1 + 300, h * 0.72);
      ctx.lineTo(x1 - 300, h * 0.72);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
      grad.addColorStop(0, rgba(color, alpha * (i === 1 ? 1 : 0.6)));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.fill();
    });
    ctx.restore();
  }

  /** Franjas de césped cortado, como se ven por TV. */
  function mowStripes(ctx, x, y, w, h, color, alpha, band) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const step = band || 110;
    for (let i = 0; y + i * step < y + h; i += 2) {
      ctx.fillRect(x, y + i * step, w, Math.min(step, y + h - (y + i * step)));
    }
    ctx.restore();
  }

  /** Tejido de red de arco (rombos). */
  function netPattern(ctx, x, y, w, h, color, alpha, cell) {
    const size = cell || 34;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -h; i < w + h; i += size) {
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Cancha completa vista desde arriba, con líneas reglamentarias.
   * Dibuja dentro del rectángulo indicado (orientación vertical).
   */
  function pitchField(ctx, x, y, w, h, opts) {
    const o = Object.assign(
      { grass: '#0d4a26', grass2: '#0a3a1e', line: '#ffffff', lineAlpha: 0.5, radius: 26 },
      opts
    );
    ctx.save();
    rr(ctx, x, y, w, h, o.radius);
    ctx.clip();

    ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, o.grass], [0.5, o.grass2], [1, o.grass]]);
    ctx.fillRect(x, y, w, h);
    mowStripes(ctx, x, y, w, h, '#ffffff', 0.045, h / 12);

    ctx.strokeStyle = rgba(o.line, o.lineAlpha);
    ctx.fillStyle = rgba(o.line, o.lineAlpha);
    ctx.lineWidth = 4;

    const pad = 22;
    const fx = x + pad;
    const fy = y + pad;
    const fw = w - pad * 2;
    const fh = h - pad * 2;
    ctx.strokeRect(fx, fy, fw, fh);

    /* Línea y círculo central. */
    ctx.beginPath();
    ctx.moveTo(fx, fy + fh / 2);
    ctx.lineTo(fx + fw, fy + fh / 2);
    ctx.stroke();
    const cr = Math.min(fw * 0.19, fh * 0.13);
    ctx.beginPath();
    ctx.arc(fx + fw / 2, fy + fh / 2, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fx + fw / 2, fy + fh / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    /* Áreas, arcos y manchas de penal en los dos fondos. */
    const boxW = fw * 0.56;
    const boxH = fh * 0.15;
    const smallW = fw * 0.28;
    const smallH = fh * 0.06;
    [1, -1].forEach((dir) => {
      const baseY = dir === 1 ? fy : fy + fh;
      const bx = fx + (fw - boxW) / 2;
      const by = dir === 1 ? baseY : baseY - boxH;
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.strokeRect(fx + (fw - smallW) / 2, dir === 1 ? baseY : baseY - smallH, smallW, smallH);

      const spotY = baseY + dir * boxH * 0.72;
      ctx.beginPath();
      ctx.arc(fx + fw / 2, spotY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(fx + fw / 2, spotY, cr * 0.78, dir === 1 ? 0.15 * Math.PI : 1.15 * Math.PI, dir === 1 ? 0.85 * Math.PI : 1.85 * Math.PI);
      ctx.stroke();

      /* Arco con red. */
      const goalW = fw * 0.24;
      const goalH = 26;
      const gx = fx + (fw - goalW) / 2;
      const gy = dir === 1 ? fy - goalH : fy + fh;
      netPattern(ctx, gx, gy, goalW, goalH, o.line, 0.35, 14);
      ctx.strokeRect(gx, gy, goalW, goalH);
    });

    /* Córners. */
    [[fx, fy, 0, 0.5], [fx + fw, fy, 0.5, 1], [fx + fw, fy + fh, 1, 1.5], [fx, fy + fh, 1.5, 2]].forEach(
      ([cx, cy, a0, a1]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 22, a0 * Math.PI, a1 * Math.PI);
        ctx.stroke();
      }
    );

    ctx.restore();
  }

  /** Marcas de cancha tenues sobre todo el lienzo, para el fondo general. */
  function pitchMarks(ctx, w, h, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    const boxW = w * 0.62;
    ctx.strokeRect((w - boxW) / 2, -40, boxW, 250);
    ctx.strokeRect((w - boxW) / 2, h - 210, boxW, 250);

    const smallW = w * 0.3;
    ctx.strokeRect((w - smallW) / 2, -40, smallW, 130);
    ctx.strokeRect((w - smallW) / 2, h - 90, smallW, 130);
    ctx.restore();
  }

  /** Camiseta con dorsal, para las formaciones. */
  function jersey(ctx, x, y, size, color, number, opts) {
    const o = Object.assign({ ink: '#04150b', stroke: null }, opts);
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.32);
    ctx.lineTo(-s * 0.2, -s * 0.48);
    ctx.quadraticCurveTo(0, -s * 0.24, s * 0.2, -s * 0.48);
    ctx.lineTo(s * 0.5, -s * 0.32);
    ctx.lineTo(s * 0.36, -s * 0.04);
    ctx.lineTo(s * 0.29, -s * 0.09);
    ctx.lineTo(s * 0.29, s * 0.5);
    ctx.lineTo(-s * 0.29, s * 0.5);
    ctx.lineTo(-s * 0.29, -s * 0.09);
    ctx.lineTo(-s * 0.36, -s * 0.04);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (o.stroke) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = o.stroke;
      ctx.stroke();
    }
    ctx.restore();
    if (number !== undefined && number !== null) {
      text(ctx, String(number), x, y + s * 0.28, {
        family: FONT_DISPLAY, weight: '400', size: s * 0.52, color: o.ink, align: 'center',
      });
    }
  }

  /** Degradé oscuro sobre un borde para que el texto siempre tenga contraste. */
  function scrim(ctx, w, h, edge, size, strength) {
    const vertical = edge === 'top' || edge === 'bottom';
    const from = edge === 'top' ? 0 : edge === 'bottom' ? h : edge === 'left' ? 0 : w;
    const to = edge === 'top' ? size : edge === 'bottom' ? h - size : edge === 'left' ? size : w - size;
    const grad = vertical
      ? ctx.createLinearGradient(0, from, 0, to)
      : ctx.createLinearGradient(from, 0, to, 0);
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /** Escuadras en las esquinas del marco. */
  function corners(ctx, x, y, w, h, arm, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 5;
    ctx.lineCap = 'round';
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * arm);
      ctx.stroke();
    });
    ctx.restore();
  }

  /* ---------------- tipografía ---------------- */
  function setFont(ctx, weight, size, family) {
    ctx.font = `${weight} ${size}px ${family}`;
    return size;
  }

  function measure(ctx, str, tracking) {
    const base = ctx.measureText(str).width;
    return tracking ? base + tracking * Math.max(0, [...str].length - 1) : base;
  }

  /** Baja el cuerpo hasta que el texto entra en maxWidth. */
  function fit(ctx, str, maxWidth, opts) {
    const o = Object.assign({ family: FONT_DISPLAY, weight: '400', max: 120, min: 22, tracking: 0 }, opts);
    let size = o.max;
    while (size > o.min) {
      setFont(ctx, o.weight, size, o.family);
      if (measure(ctx, str, o.tracking) <= maxWidth) break;
      size -= 2;
    }
    setFont(ctx, o.weight, size, o.family);
    return size;
  }

  /** Recorta con puntos suspensivos si no entra. */
  function truncate(ctx, str, maxWidth) {
    if (ctx.measureText(str).width <= maxWidth) return str;
    let out = str;
    while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
    return out.trimEnd() + '…';
  }

  /**
   * Dibuja texto con soporte de tracking, glow y trazo.
   * @returns {number} ancho ocupado
   */
  function text(ctx, str, x, y, opts) {
    const o = Object.assign(
      {
        family: FONT_BODY, weight: '600', size: 32, color: '#fff',
        align: 'left', tracking: 0, glow: null, glowBlur: 30,
        stroke: null, strokeWidth: 0, alpha: 1, maxWidth: 0,
      },
      opts
    );

    ctx.save();
    ctx.globalAlpha = o.alpha;
    setFont(ctx, o.weight, o.size, o.family);
    let content = String(str);
    if (o.maxWidth) content = truncate(ctx, content, o.maxWidth);

    const width = measure(ctx, content, o.tracking);
    let startX = x;
    if (o.align === 'center') startX = x - width / 2;
    else if (o.align === 'right') startX = x - width;

    ctx.textAlign = 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';

    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = o.glowBlur;
    }

    const paint = (drawFn) => {
      if (o.tracking) {
        let cx = startX;
        for (const ch of content) {
          drawFn(ch, cx);
          cx += ctx.measureText(ch).width + o.tracking;
        }
      } else {
        drawFn(content, startX);
      }
    };

    if (o.stroke && o.strokeWidth) {
      ctx.lineWidth = o.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke;
      paint((s, cx) => ctx.strokeText(s, cx, y));
    }

    ctx.fillStyle = typeof o.color === 'function' ? o.color(ctx, startX, width) : o.color;
    paint((s, cx) => ctx.fillText(s, cx, y));

    ctx.restore();
    return width;
  }

  /** Etiqueta redondeada con texto centrado. Devuelve su ancho. */
  function chip(ctx, opts) {
    const o = Object.assign(
      {
        x: 0, y: 0, text: '', padX: 28, height: 56, radius: 28,
        bg: '#fff', fg: '#000', size: 26, weight: '800',
        family: FONT_BODY, tracking: 2, align: 'center', border: null, glow: null,
      },
      opts
    );
    setFont(ctx, o.weight, o.size, o.family);
    const textWidth = measure(ctx, o.text, o.tracking);
    const width = textWidth + o.padX * 2;
    const x = o.align === 'center' ? o.x - width / 2 : o.align === 'right' ? o.x - width : o.x;

    ctx.save();
    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = 34;
    }
    fillRR(ctx, x, o.y, width, o.height, o.radius, o.bg);
    ctx.restore();
    if (o.border) strokeRR(ctx, x, o.y, width, o.height, o.radius, o.border, 2);

    text(ctx, o.text, x + width / 2, o.y + o.height / 2 + o.size * 0.36, {
      family: o.family, weight: o.weight, size: o.size, color: o.fg, align: 'center', tracking: o.tracking,
    });
    return width;
  }

  /** Anillo de progreso (0..1) usado en el flyer de la figura. */
  function ring(ctx, x, y, radius, pct, opts) {
    const o = Object.assign({ width: 16, track: 'rgba(255,255,255,.12)', color: '#ffcb3d', glow: null }, opts);
    ctx.save();
    ctx.lineWidth = o.width;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = o.track;
    ctx.stroke();

    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = 30;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, pct));
    ctx.strokeStyle = o.color;
    ctx.stroke();
    ctx.restore();
  }

  /** Círculo con las iniciales del jugador. */
  function avatar(ctx, x, y, radius, name, opts) {
    const o = Object.assign({ bg: '#12301f', fg: '#fff', border: null, size: null }, opts);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = o.bg;
    ctx.fill();
    if (o.border) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = o.border;
      ctx.stroke();
    }
    ctx.restore();
    text(ctx, HF.util.initials(name), x, y + radius * 0.34, {
      family: FONT_DISPLAY, weight: '400', size: o.size || radius * 0.95, color: o.fg, align: 'center',
    });
  }

  /* ---------------- iconos vectoriales ---------------- */
  /** Iconos simples dibujados a mano: no dependen de fuentes de emoji. */
  const ICONS = {
    pin(ctx, s) {
      ctx.beginPath();
      ctx.arc(0, -s * 0.12, s * 0.36, Math.PI * 0.86, Math.PI * 0.14);
      ctx.lineTo(0, s * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, -s * 0.12, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    },
    clock(ctx, s) {
      ctx.lineWidth = s * 0.11;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.24);
      ctx.lineTo(0, 0);
      ctx.lineTo(s * 0.2, s * 0.08);
      ctx.stroke();
    },
    cal(ctx, s) {
      ctx.lineWidth = s * 0.1;
      rr(ctx, -s * 0.42, -s * 0.34, s * 0.84, s * 0.76, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.08);
      ctx.lineTo(s * 0.42, -s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.5);
      ctx.lineTo(-s * 0.2, -s * 0.24);
      ctx.moveTo(s * 0.2, -s * 0.5);
      ctx.lineTo(s * 0.2, -s * 0.24);
      ctx.stroke();
    },
    ball(ctx, s) {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const r = s * 0.17;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      for (let i = 1; i <= 5; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * s * 0.36, Math.sin(ang) * s * 0.36, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    money(ctx, s) {
      ctx.lineWidth = s * 0.1;
      rr(ctx, -s * 0.46, -s * 0.3, s * 0.92, s * 0.6, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    },
    trophy(ctx, s) {
      ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.42);
      ctx.lineTo(s * 0.3, -s * 0.42);
      ctx.lineTo(s * 0.24, s * 0.02);
      ctx.quadraticCurveTo(0, s * 0.22, -s * 0.24, s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.06, s * 0.14);
      ctx.lineTo(-s * 0.06, s * 0.36);
      ctx.lineTo(s * 0.06, s * 0.36);
      ctx.lineTo(s * 0.06, s * 0.14);
      ctx.fill();
      ctx.fillRect(-s * 0.26, s * 0.36, s * 0.52, s * 0.1);
      ctx.beginPath();
      ctx.arc(-s * 0.36, -s * 0.26, s * 0.13, Math.PI * 0.5, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.36, -s * 0.26, s * 0.13, Math.PI * 1.4, Math.PI * 0.5);
      ctx.stroke();
    },
    shirt(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.28);
      ctx.lineTo(-s * 0.16, -s * 0.42);
      ctx.quadraticCurveTo(0, -s * 0.2, s * 0.16, -s * 0.42);
      ctx.lineTo(s * 0.42, -s * 0.28);
      ctx.lineTo(s * 0.3, -s * 0.06);
      ctx.lineTo(s * 0.24, -s * 0.1);
      ctx.lineTo(s * 0.24, s * 0.44);
      ctx.lineTo(-s * 0.24, s * 0.44);
      ctx.lineTo(-s * 0.24, -s * 0.1);
      ctx.lineTo(-s * 0.3, -s * 0.06);
      ctx.closePath();
      ctx.fill();
    },
  };

  function icon(ctx, name, x, y, size, color) {
    const draw = ICONS[name];
    if (!draw) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx, size);
    ctx.restore();
  }

  /* ---------------- exports ---------------- */
  HF.kit = {
    FONT_DISPLAY, FONT_COND, FONT_BODY,
    loadFonts, hexToRgb, rgba, mix,
    rr, fillRR, strokeRR, lg, glow,
    grain, vignette, beams, scrim, corners,
    mowStripes, netPattern, pitchField, pitchMarks, jersey,
    setFont, measure, fit, truncate, text, chip, ring, avatar, icon,
  };
})(window);
