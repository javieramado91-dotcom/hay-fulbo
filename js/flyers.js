/* ============================================================
   HAY FULBO — flyers.js
   Motor de flyers verticales 1080x1920 (9:16).
   Tres piezas: convocatoria, formaciones sobre la cancha y la
   figura del partido en formato figurita.
   Expone: window.HF.flyers
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const K = HF.kit;
  const U = HF.util;

  const W = 1080;
  const H = 1920;
  const M = 72;                 // margen lateral
  const INNER = W - M * 2;      // 936
  const CTA_TOP = H - 152;      // techo del pie

  /* ============================================================
     Bloques compartidos
     ============================================================ */

  /** Fondo: cancha nocturna con franjas de corte, red y luces. */
  function paintStage(ctx, t, opts) {
    const o = Object.assign({ marks: true, net: true, accent: t.accent }, opts);

    ctx.fillStyle = K.lg(ctx, 0, 0, 0, H, [
      [0, t.bg[0]],
      [0.45, t.bg[1]],
      [1, t.bg[2]],
    ]);
    ctx.fillRect(0, 0, W, H);

    K.mowStripes(ctx, 0, 0, W, H, '#ffffff', 0.035, 168);
    if (o.net) K.netPattern(ctx, 0, 0, W, 300, t.ink, 0.06, 40);
    if (o.marks) K.pitchMarks(ctx, W, H, K.rgba(t.ink, 1), 0.07);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    K.glow(ctx, W / 2, -60, 760, o.accent, 0.2);
    K.glow(ctx, W * 0.1, H * 0.78, 540, t.accent2, 0.1);
    ctx.restore();

    K.beams(ctx, W, H, t.beam, 0.08);
    K.grain(ctx, W, H, 0.055);
    K.vignette(ctx, W, H, 0.88);
    K.scrim(ctx, W, H, 'top', 300, 0.55);
    K.scrim(ctx, W, H, 'bottom', 420, 0.62);
  }

  /** Marco fino con escuadras en las esquinas. */
  function paintFrame(ctx, t) {
    K.strokeRR(ctx, 40, 40, W - 80, H - 80, 44, K.rgba(t.accent, 0.2), 3);
    K.corners(ctx, 62, 62, W - 124, H - 124, 46, K.rgba(t.accent, 0.75), 6);
  }

  /** Barra superior con la marca y un dato a la derecha. */
  function paintBrand(ctx, t, rightText) {
    K.icon(ctx, 'ball', M + 26, 128, 54, t.accent);
    K.text(ctx, 'HAY FULBO', M + 62, 148, {
      family: K.FONT_DISPLAY, weight: '400', size: 48, color: t.ink, tracking: 3,
    });
    if (rightText) {
      K.text(ctx, rightText.toUpperCase(), W - M, 144, {
        family: K.FONT_COND, weight: '700', size: 36, color: K.rgba(t.sub, 0.85),
        align: 'right', tracking: 3, maxWidth: 420,
      });
    }
    ctx.fillStyle = K.rgba(t.ink, 0.12);
    ctx.fillRect(M, 176, INNER, 2);
  }

  /** Etiqueta de sección centrada bajo la marca. */
  function paintKicker(ctx, t, label, color) {
    const tone = color || t.accent;
    K.chip(ctx, {
      x: W / 2, y: 208, text: label, size: 24, height: 54, radius: 27, padX: 32,
      bg: K.rgba(tone, 0.16), fg: tone, border: K.rgba(tone, 0.5), tracking: 6,
    });
    return 262;
  }

  /** Titular del partido. Devuelve la Y donde termina. */
  function paintTitle(ctx, t, raw, top, maxSize, color) {
    const title = (raw || 'PICADO').toUpperCase();
    const size = K.fit(ctx, title, INNER - 30, {
      family: K.FONT_DISPLAY, weight: '400', max: maxSize || 80, min: 32,
    });
    const baseline = top + size * 0.78;
    K.text(ctx, title, W / 2, baseline, {
      family: K.FONT_DISPLAY, weight: '400', size, color: color || t.ink, align: 'center', tracking: 2,
    });
    return baseline + size * 0.24;
  }

  /** Tarjeta de dato con icono, etiqueta y valor. */
  function infoCard(ctx, t, x, y, w, h, iconName, label, value) {
    K.fillRR(ctx, x, y, w, h, 22, K.rgba(t.ink, 0.06));
    K.strokeRR(ctx, x, y, w, h, 22, K.rgba(t.accent, 0.22), 2);
    K.icon(ctx, iconName, x + 44, y + h / 2, 44, t.accent);
    K.text(ctx, label, x + 78, y + h / 2 - 8, {
      family: K.FONT_BODY, weight: '800', size: 20, color: K.rgba(t.sub, 0.75), tracking: 3,
    });
    K.text(ctx, value || '—', x + 78, y + h / 2 + 30, {
      family: K.FONT_COND, weight: '700', size: 40, color: t.ink, maxWidth: w - 110,
    });
  }

  function paintInfoBlock(ctx, t, match, y) {
    const halfW = (INNER - 16) / 2;
    infoCard(ctx, t, M, y, halfW, 110, 'cal', 'FECHA', U.formatDateShort(match.fecha) || 'A CONFIRMAR');
    infoCard(ctx, t, M + halfW + 16, y, halfW, 110, 'clock', 'HORA',
      U.formatTime(match.hora) ? U.formatTime(match.hora) + ' HS' : 'A CONFIRMAR');
    infoCard(ctx, t, M, y + 126, INNER, 110, 'pin', 'CANCHA', (match.lugar || 'A confirmar').toUpperCase());
    return y + 236;
  }

  /** Grilla de cupos con dorsal: llenos con acento, libres apagados. */
  function paintRoster(ctx, t, players, slots, box) {
    const cols = slots > 26 ? 4 : slots > 14 ? 3 : 2;
    const rows = Math.ceil(slots / cols);
    const gap = 12;
    const cellW = (box.w - gap * (cols - 1)) / cols;
    const pillH = Math.min(78, (box.h - gap * (rows - 1)) / rows);
    const fontSize = Math.max(16, Math.min(32, pillH * 0.44));

    /* Con pocas filas las pastillas topan su alto máximo: el sobrante se
       reparte arriba y abajo en vez de acumularse al pie. */
    const usado = rows * (pillH + gap) - gap;
    const topY = box.y + Math.max(0, (box.h - usado) / 2);

    for (let i = 0; i < slots; i++) {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = box.x + col * (cellW + gap);
      const y = topY + row * (pillH + gap);
      const player = players[i];
      const isSub = i >= box.starters;
      const tone = isSub ? t.accent2 : t.accent;

      K.fillRR(ctx, x, y, cellW, pillH, pillH / 2, player ? K.rgba(tone, 0.16) : K.rgba(t.ink, 0.045));
      K.strokeRR(ctx, x, y, cellW, pillH, pillH / 2, player ? K.rgba(tone, 0.45) : K.rgba(t.ink, 0.1), 2);

      const badgeR = pillH / 2 - 8;
      const cx = x + pillH / 2;
      const cy = y + pillH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = player ? tone : K.rgba(t.ink, 0.12);
      ctx.fill();
      K.text(ctx, String(i + 1), cx, cy + badgeR * 0.42, {
        family: K.FONT_BODY, weight: '800', size: badgeR * 1.05,
        color: player ? '#04150b' : K.rgba(t.ink, 0.5), align: 'center',
      });

      K.text(ctx, player ? player.name.toUpperCase() : 'LIBRE', x + pillH + 4, cy + fontSize * 0.36, {
        family: K.FONT_COND, weight: player ? '700' : '600', size: fontSize,
        color: player ? t.ink : K.rgba(t.ink, 0.32),
        maxWidth: cellW - pillH - 22,
      });
    }
    return topY + usado;
  }

  function paintCTA(ctx, t, label) {
    K.fillRR(ctx, M, CTA_TOP, INNER, 78, 39, K.rgba(t.accent, 0.14));
    K.strokeRR(ctx, M, CTA_TOP, INNER, 78, 39, K.rgba(t.accent, 0.45), 2);
    K.text(ctx, label, W / 2, CTA_TOP + 52, {
      family: K.FONT_BODY, weight: '800', size: 27, color: t.accent, align: 'center', tracking: 4,
      maxWidth: INNER - 60,
    });
    K.text(ctx, 'Powered by JA', W / 2, H - 52, {
      family: K.FONT_BODY, weight: '600', size: 18, color: K.rgba(t.sub, 0.38), align: 'center', tracking: 3,
    });
  }

  function paintContextLine(ctx, t, parts) {
    const line = parts.filter(Boolean).join(' · ').toUpperCase();
    if (!line) return;
    K.text(ctx, line, W / 2, CTA_TOP - 34, {
      family: K.FONT_BODY, weight: '600', size: 24, color: K.rgba(t.sub, 0.6),
      align: 'center', tracking: 3, maxWidth: INNER,
    });
  }

  /* ============================================================
     1. CONVOCATORIA
     ============================================================ */
  function renderCall(ctx, data) {
    const { match, t, store } = data;
    const missing = store.missing;
    const total = match.totalPlayers;
    const count = match.players.length;
    const slots = Math.max(total, count);

    paintStage(ctx, t);
    paintFrame(ctx, t);
    paintBrand(ctx, t, HF.model.FORMATS[total] || 'Picado');
    paintKicker(ctx, t, missing > 0 ? 'CONVOCATORIA ABIERTA' : 'CUPO COMPLETO',
      missing > 0 ? t.warn : t.accent);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    K.glow(ctx, W / 2, 510, 400, t.accent, 0.2);
    ctx.restore();

    if (missing > 0) {
      /* Camiseta de fondo: el número que falta va como dorsal. */
      K.jersey(ctx, W / 2, 528, 460, K.rgba(t.accent, 0.1), null, { stroke: K.rgba(t.accent, 0.26) });

      K.text(ctx, 'FALTAN', W / 2, 386, {
        family: K.FONT_DISPLAY, weight: '400', size: 86, color: K.rgba(t.sub, 0.92),
        align: 'center', tracking: 14,
      });
      const numSize = K.fit(ctx, String(missing), INNER - 240, {
        family: K.FONT_DISPLAY, weight: '400', max: 275, min: 110,
      });
      K.text(ctx, String(missing), W / 2, 636, {
        family: K.FONT_DISPLAY, weight: '400', size: numSize, align: 'center',
        color: (c, x, w) => K.lg(c, x, 410, x + w, 650, [[0, '#ffffff'], [0.55, t.accent], [1, t.accent2]]),
        glow: K.rgba(t.accent, 0.85), glowBlur: 60,
        stroke: K.rgba(t.accent, 0.35), strokeWidth: 6,
      });
      K.text(ctx, missing === 1 ? 'JUGADOR' : 'JUGADORES', W / 2, 704, {
        family: K.FONT_DISPLAY, weight: '400', size: 72, color: t.ink, align: 'center', tracking: 10,
      });
    } else {
      K.text(ctx, 'ESTAMOS', W / 2, 442, {
        family: K.FONT_DISPLAY, weight: '400', size: 112, color: K.rgba(t.sub, 0.92),
        align: 'center', tracking: 8,
      });
      K.text(ctx, 'TODOS', W / 2, 604, {
        family: K.FONT_DISPLAY, weight: '400', size: 170, align: 'center', tracking: 4,
        color: (c, x, w) => K.lg(c, x, 460, x + w, 624, [[0, '#ffffff'], [0.55, t.accent], [1, t.accent2]]),
        glow: K.rgba(t.accent, 0.8), glowBlur: 60,
      });
      K.chip(ctx, {
        x: W / 2, y: 648, height: 66, radius: 33, padX: 38, size: 30, tracking: 4,
        text: missing === 0 ? 'SE JUEGA SÍ O SÍ' : 'SE JUEGA · +' + Math.abs(missing) + ' EN BANCO',
        bg: t.accent, fg: '#04150b', glow: K.rgba(t.accent, 0.6),
      });
    }

    paintTitle(ctx, t, match.titulo || 'PARTIDO DE FULBO', 774, 76);
    paintInfoBlock(ctx, t, match, 870);

    /* Progreso de la lista. */
    const labelY = 1146;
    K.icon(ctx, 'shirt', M + 16, labelY - 8, 30, K.rgba(t.sub, 0.7));
    K.text(ctx, 'LA LISTA', M + 40, labelY, {
      family: K.FONT_BODY, weight: '800', size: 22, color: K.rgba(t.sub, 0.7), tracking: 5,
    });
    K.text(ctx, count + '/' + total, W - M, labelY + 2, {
      family: K.FONT_COND, weight: '700', size: 36, color: t.accent, align: 'right',
    });

    const barY = labelY + 30;
    K.fillRR(ctx, M, barY, INNER, 12, 6, K.rgba(t.ink, 0.1));
    const pct = Math.min(1, count / Math.max(1, total));
    if (pct > 0) {
      ctx.save();
      ctx.shadowColor = K.rgba(t.accent, 0.8);
      ctx.shadowBlur = 22;
      K.fillRR(ctx, M, barY, Math.max(14, INNER * pct), 12, 6,
        K.lg(ctx, M, 0, M + INNER, 0, [[0, t.accent], [1, t.accent2]]));
      ctx.restore();
    }

    /*
     * La franja de plata sólo aparece si hay precio cargado. Sin él no aporta
     * nada que la barra de progreso no diga ya, y esos 108px le quedan mejor
     * a la nómina.
     */
    const precio = match.precio;
    const stripH = 82;
    const rosterTop = barY + 40;
    const rosterBottom = precio > 0 ? CTA_TOP - stripH - 50 : CTA_TOP - 30;

    paintRoster(ctx, t, match.players, slots, {
      x: M, y: rosterTop, w: INNER, h: rosterBottom - rosterTop, starters: total,
    });

    if (precio > 0) {
      const stripY = CTA_TOP - stripH - 26;
      const subs = Math.max(0, count - total);
      const cupo = subs > 0
        ? subs + ' EN BANCO'
        : missing > 0
          ? missing + (missing === 1 ? ' LUGAR LIBRE' : ' LUGARES LIBRES')
          : count + ' CONFIRMADOS';

      K.fillRR(ctx, M, stripY, INNER, stripH, 26, K.rgba(t.ink, 0.06));
      K.strokeRR(ctx, M, stripY, INNER, stripH, 26, K.rgba(t.ink, 0.12), 2);
      K.icon(ctx, 'money', M + 46, stripY + 41, 42, t.accent);
      K.text(ctx, U.money(precio) + ' POR PERSONA', M + 82, stripY + 52, {
        family: K.FONT_COND, weight: '700', size: 40, color: t.ink, maxWidth: INNER - 340,
      });
      K.text(ctx, cupo, W - M - 30, stripY + 52, {
        family: K.FONT_BODY, weight: '800', size: 24, color: K.rgba(t.sub, 0.8), align: 'right', tracking: 2,
      });
    }

    paintCTA(ctx, t, missing > 0 ? 'ANOTATE EN EL GRUPO' : 'NOS VEMOS EN LA CANCHA');
  }

  /* ============================================================
     2. FORMACIONES SOBRE LA CANCHA
     ============================================================ */

  /** Líneas de una formación clásica según los jugadores de campo. */
  const FORMATIONS = {
    0: [], 1: [1], 2: [1, 1], 3: [2, 1], 4: [2, 2], 5: [2, 2, 1],
    6: [3, 2, 1], 7: [3, 3, 1], 8: [3, 3, 2], 9: [4, 3, 2], 10: [4, 4, 2],
  };

  function formationRows(count) {
    if (FORMATIONS[count]) return FORMATIONS[count].slice();
    const rows = [];
    let left = count;
    while (left > 0) {
      const take = Math.min(4, left);
      rows.push(take);
      left -= take;
    }
    return rows;
  }

  const POS_ORDER = { ARQ: 0, DEF: 0, COM: 1, MED: 1, DEL: 2 };

  /** Separa al arquero y ordena al resto de atrás hacia adelante. */
  function arrangeTeam(list) {
    const keeper = list.find((p) => p.pos === 'ARQ') || null;
    const field = list.filter((p) => p !== keeper);
    field.sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.level - a.level);
    return { keeper: keeper, field: field, rows: formationRows(field.length) };
  }

  function renderTeams(ctx, data) {
    const { match, t, store } = data;
    const teams = match.teams || { a: [], b: [] };
    const listA = teams.a.map((id) => store.playerById(id)).filter(Boolean);
    const listB = teams.b.map((id) => store.playerById(id)).filter(Boolean);

    paintStage(ctx, t, { marks: false });
    paintFrame(ctx, t);
    paintBrand(ctx, t, U.formatDateShort(match.fecha));
    paintKicker(ctx, t, 'FORMACIONES');
    const titleBottom = paintTitle(ctx, t, match.titulo || 'HOY SE JUEGA', 286, 78);

    /* Cabecera: nombre y nivel de cada equipo, con el VS en el medio. */
    const headY = titleBottom + 24;
    const headH = 96;
    const halfW = (INNER - 96) / 2;

    function teamHead(x, name, list, color) {
      const level = list.reduce((acc, p) => acc + p.level, 0);
      K.fillRR(ctx, x, headY, halfW, headH, 26, K.rgba(color, 0.12));
      K.strokeRR(ctx, x, headY, halfW, headH, 26, K.rgba(color, 0.45), 2);
      const nameSize = K.fit(ctx, name.toUpperCase(), halfW - 40, {
        family: K.FONT_DISPLAY, weight: '400', max: 46, min: 20,
      });
      K.text(ctx, name.toUpperCase(), x + halfW / 2, headY + 48, {
        family: K.FONT_DISPLAY, weight: '400', size: nameSize, color: color, align: 'center', tracking: 1,
      });
      K.text(ctx, list.length + ' JUG · NIVEL ' + level, x + halfW / 2, headY + 78, {
        family: K.FONT_BODY, weight: '800', size: 20, color: K.rgba(t.sub, 0.7), align: 'center', tracking: 3,
      });
    }

    teamHead(M, match.teamNames.a, listA, t.accent);
    teamHead(M + halfW + 96, match.teamNames.b, listB, t.accent2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 34;
    ctx.beginPath();
    ctx.arc(W / 2, headY + headH / 2, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#05100a';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(W / 2, headY + headH / 2, 46, 0, Math.PI * 2);
    ctx.strokeStyle = K.rgba(t.ink, 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
    K.text(ctx, 'VS', W / 2, headY + headH / 2 + 14, {
      family: K.FONT_DISPLAY, weight: '400', size: 40, color: t.ink, align: 'center',
    });

    /* Cancha con las dos formaciones enfrentadas. */
    const stripH = 96;
    const pitchY = headY + headH + 24;
    const pitchH = CTA_TOP - 44 - stripH - 24 - pitchY;
    K.pitchField(ctx, M, pitchY, INNER, pitchH, {
      grass: K.mix(t.turf, '#000000', 0.02),
      grass2: K.mix(t.turf, '#000000', 0.34),
      line: t.ink,
      lineAlpha: 0.4,
      radius: 30,
    });
    K.strokeRR(ctx, M, pitchY, INNER, pitchH, 30, K.rgba(t.ink, 0.18), 3);

    const pad = 22;
    const fx = M + pad;
    const fw = INNER - pad * 2;
    const fyTop = pitchY + pad;
    const fyBottom = pitchY + pitchH - pad;
    const midY = (fyTop + fyBottom) / 2;

    function paintFormation(list, color, dir) {
      const arranged = arrangeTeam(list);
      const rows = arranged.rows;
      const widest = rows.reduce((a, b) => Math.max(a, b), 1);
      const size = U.clamp(Math.round((fw / (widest + 1)) * 0.62), 44, 94);

      const gkY = dir < 0 ? fyBottom - size * 0.85 : fyTop + size * 0.85;
      const endY = midY - dir * 96;
      const gap = Math.abs(gkY - endY) / (rows.length + 0.15);
      const labelSize = Math.min(24, size * 0.34);
      const maxLabel = fw / (widest + 0.35);

      function marker(player, x, y, number) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.65)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        K.jersey(ctx, x, y, size, color, number, { ink: '#04150b' });
        ctx.restore();

        K.setFont(ctx, '700', labelSize, K.FONT_COND);
        const clipped = K.truncate(ctx, player.name.toUpperCase(), maxLabel - 20);
        const labelW = ctx.measureText(clipped).width + 22;
        const labelY = y + size * 0.58;
        K.fillRR(ctx, x - labelW / 2, labelY, labelW, labelSize + 12, (labelSize + 12) / 2, 'rgba(3,12,7,.84)');
        K.text(ctx, clipped, x, labelY + labelSize * 0.86, {
          family: K.FONT_COND, weight: '700', size: labelSize, color: t.ink, align: 'center',
        });
      }

      let dorsal = 1;
      if (arranged.keeper) marker(arranged.keeper, fx + fw / 2, gkY, dorsal++);
      rows.forEach((rowCount, i) => {
        const y = gkY + dir * gap * (i + 1);
        const offset = rows.slice(0, i).reduce((a, b) => a + b, 0);
        for (let j = 0; j < rowCount; j++) {
          const player = arranged.field[offset + j];
          if (!player) continue;
          marker(player, fx + (fw * (j + 1)) / (rowCount + 1), y, dorsal++);
        }
      });
    }

    paintFormation(listB, t.accent2, 1);
    paintFormation(listA, t.accent, -1);

    /* Pie con lugar y horario. */
    const stripY = pitchY + pitchH + 24;
    K.fillRR(ctx, M, stripY, INNER, stripH, 30, K.rgba(t.ink, 0.06));
    K.strokeRR(ctx, M, stripY, INNER, stripH, 30, K.rgba(t.ink, 0.12), 2);
    K.icon(ctx, 'pin', M + 48, stripY + 48, 44, t.accent);
    K.text(ctx, (match.lugar || 'Cancha a confirmar').toUpperCase(), M + 84, stripY + 44, {
      family: K.FONT_COND, weight: '700', size: 38, color: t.ink, maxWidth: INNER - 150,
    });
    K.text(ctx, [U.formatDateShort(match.fecha), U.formatTime(match.hora) ? U.formatTime(match.hora) + ' HS' : '']
      .filter(Boolean).join(' · '), M + 84, stripY + 76, {
      family: K.FONT_BODY, weight: '600', size: 22, color: K.rgba(t.sub, 0.8), tracking: 2,
    });

    const diff = Math.abs(
      listA.reduce((a, p) => a + p.level, 0) - listB.reduce((a, p) => a + p.level, 0)
    );
    paintCTA(ctx, t, 'EQUIPOS BALANCEADOS · ' + HF.teams.qualityLabel(diff).toUpperCase());
  }

  /* ============================================================
     3. FIGURA DEL PARTIDO (formato figurita)
     ============================================================ */
  function renderMvp(ctx, data) {
    const { match, t, store } = data;
    const mvp = store.mvp;
    if (!mvp) return;

    const ranking = [...match.players]
      .sort((a, b) => b.score - a.score || b.goals - a.goals)
      .slice(0, 4);

    paintStage(ctx, t, { marks: false, accent: t.warn });
    paintFrame(ctx, t);
    paintBrand(ctx, t, U.formatDateShort(match.fecha));
    paintKicker(ctx, t, 'LA FIGURA DEL PARTIDO', t.warn);

    const cardX = 112;
    const cardY = 286;
    const cardW = 856;
    const cardH = 1330;

    /* Borde metálico de la figurita. */
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.8)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    K.fillRR(ctx, cardX, cardY, cardW, cardH, 44,
      K.lg(ctx, cardX, cardY, cardX + cardW, cardY + cardH, [
        [0, t.warn], [0.45, K.mix(t.warn, '#ffffff', 0.55)], [1, t.accent2],
      ]));
    ctx.restore();

    const px = cardX + 12;
    const py = cardY + 12;
    const pw = cardW - 24;
    const ph = cardH - 24;
    K.fillRR(ctx, px, py, pw, ph, 34, K.lg(ctx, 0, py, 0, py + ph, [
      [0, K.mix(t.bg[0], '#000000', 0.2)], [0.55, t.bg[1]], [1, '#020704'],
    ]));

    ctx.save();
    K.rr(ctx, px, py, pw, ph, 34);
    ctx.clip();
    K.mowStripes(ctx, px, py, pw, ph, '#ffffff', 0.03, 118);
    ctx.globalCompositeOperation = 'screen';
    K.glow(ctx, px + pw / 2, py + ph * 0.33, 400, t.warn, 0.22);
    ctx.globalCompositeOperation = 'overlay';
    ctx.beginPath();
    ctx.moveTo(px - 120, py + ph * 0.74);
    ctx.lineTo(px + pw * 0.48, py - 60);
    ctx.lineTo(px + pw * 0.7, py - 60);
    ctx.lineTo(px - 120, py + ph * 0.97);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.085)';
    ctx.fill();
    ctx.restore();

    K.strokeRR(ctx, px, py, pw, ph, 34, K.rgba(t.warn, 0.35), 2);

    /* Bloque de puntaje, arriba a la izquierda. */
    const scoreInt = Math.floor(mvp.score);
    const scoreFrac = mvp.score - scoreInt;
    const scoreW = K.text(ctx, String(scoreInt), px + 60, py + 150, {
      family: K.FONT_DISPLAY, weight: '400', size: 130, color: t.warn,
      glow: K.rgba(t.warn, 0.55), glowBlur: 28,
    });
    if (scoreFrac > 0) {
      K.text(ctx, U.formatScore(scoreFrac).replace(/^0/, ''), px + 68 + scoreW, py + 150, {
        family: K.FONT_DISPLAY, weight: '400', size: 56, color: t.warn,
        glow: K.rgba(t.warn, 0.45), glowBlur: 18,
      });
    }
    K.text(ctx, 'PUNTOS', px + 64, py + 188, {
      family: K.FONT_BODY, weight: '800', size: 22, color: K.rgba(t.sub, 0.8), tracking: 5,
    });
    ctx.fillStyle = K.rgba(t.warn, 0.5);
    ctx.fillRect(px + 64, py + 208, 96, 3);
    K.text(ctx, HF.model.POS_LABEL[mvp.pos].toUpperCase(), px + 64, py + 248, {
      family: K.FONT_COND, weight: '700', size: 34, color: t.ink, tracking: 2,
    });

    /* Trofeo, arriba a la derecha. */
    K.icon(ctx, 'trophy', px + pw - 100, py + 118, 92, K.rgba(t.warn, 0.9));
    K.text(ctx, 'MVP', px + pw - 100, py + 200, {
      family: K.FONT_DISPLAY, weight: '400', size: 40, color: K.rgba(t.warn, 0.9), align: 'center', tracking: 3,
    });

    /* Retrato con anillo de puntaje. */
    const cx = px + pw / 2;
    const cy = py + 430;
    K.avatar(ctx, cx, cy, 158, mvp.name, {
      bg: K.rgba(t.ink, 0.08), fg: t.ink, border: K.rgba(t.warn, 0.28), size: 138,
    });
    K.ring(ctx, cx, cy, 184, mvp.score / 10, {
      width: 16, track: K.rgba(t.ink, 0.1), color: t.warn, glow: K.rgba(t.warn, 0.75),
    });

    /* Nombre. */
    const name = mvp.name.toUpperCase();
    const nameSize = K.fit(ctx, name, pw - 90, { family: K.FONT_DISPLAY, weight: '400', max: 122, min: 38 });
    const nameBaseline = py + 654 + nameSize * 0.74;
    K.text(ctx, name, cx, nameBaseline, {
      family: K.FONT_DISPLAY, weight: '400', size: nameSize, align: 'center', tracking: 2,
      color: (c, x, w) => K.lg(c, x, nameBaseline - nameSize, x + w, nameBaseline, [
        [0, '#ffffff'], [0.55, t.warn], [1, t.accent2],
      ]),
      glow: K.rgba(t.warn, 0.55), glowBlur: 38,
    });

    /* Fila de estadísticas. */
    const stats = [
      { label: 'NOTA', value: U.formatScore(mvp.score) + '/10' },
      { label: 'GOLES', value: String(mvp.goals) },
      { label: 'NIVEL', value: String(mvp.level) },
    ];
    const statY = py + 770;
    const statW = (pw - 120) / stats.length;
    stats.forEach((stat, i) => {
      const x = px + 60 + i * statW;
      K.text(ctx, stat.label, x + statW / 2, statY + 28, {
        family: K.FONT_BODY, weight: '800', size: 20, color: K.rgba(t.sub, 0.65), align: 'center', tracking: 4,
      });
      K.text(ctx, stat.value, x + statW / 2, statY + 86, {
        family: K.FONT_DISPLAY, weight: '400', size: 54, color: t.ink, align: 'center',
      });
      if (i < stats.length - 1) {
        ctx.fillStyle = K.rgba(t.ink, 0.12);
        ctx.fillRect(x + statW - 1, statY + 12, 2, 82);
      }
    });

    /* Resto del podio, dentro de la misma figurita. */
    const tableY = statY + 126;
    const tableH = py + ph - 34 - tableY;
    ctx.fillStyle = K.rgba(t.ink, 0.12);
    ctx.fillRect(px + 60, tableY, pw - 120, 2);
    K.text(ctx, 'PUNTAJES DEL PARTIDO', px + 60, tableY + 44, {
      family: K.FONT_BODY, weight: '800', size: 20, color: K.rgba(t.sub, 0.65), tracking: 4,
    });

    const rowH = Math.min(70, (tableH - 66) / Math.max(1, ranking.length));
    ranking.forEach((player, i) => {
      const y = tableY + 70 + i * rowH;
      const isTop = player.id === mvp.id;
      K.text(ctx, String(i + 1), px + 76, y + rowH * 0.62, {
        family: K.FONT_COND, weight: '700', size: 30,
        color: isTop ? t.warn : K.rgba(t.sub, 0.5), align: 'center',
      });
      K.text(ctx, player.name.toUpperCase(), px + 108, y + rowH * 0.64, {
        family: K.FONT_COND, weight: '700', size: Math.min(34, rowH * 0.5),
        color: isTop ? t.warn : t.ink, maxWidth: pw - 300,
      });
      K.text(ctx, U.formatScore(player.score), px + pw - 68, y + rowH * 0.64, {
        family: K.FONT_DISPLAY, weight: '400', size: Math.min(36, rowH * 0.52),
        color: isTop ? t.warn : t.ink, align: 'right',
      });
    });

    paintContextLine(ctx, t, [match.titulo, match.lugar]);
    paintCTA(ctx, t, 'FIGURA ELEGIDA POR EL GRUPO');
  }

  function rankLabel(score) {
    if (score >= 9) return 'CRACK TOTAL';
    if (score >= 7) return 'JUGÓ BIEN';
    if (score >= 5) return 'CUMPLIÓ';
    return 'PUSO GANAS';
  }

  /* ============================================================
     4. TARJETAS
     ============================================================ */
  /* Una amarilla es amarilla en cualquier paleta: estos dos no salen del tema. */
  const CARD_Y = '#ffd23f';
  const CARD_R = '#ff4444';

  /** Dibuja tarjetitas en fila y devuelve el ancho ocupado. */
  function paintCardPips(ctx, x, y, reds, yellows, h) {
    const w = h * 0.7;
    const gap = h * 0.24;
    let cx = x;
    const tile = (color) => {
      K.fillRR(ctx, cx, y - h / 2, w, h, w * 0.2, color);
      K.strokeRR(ctx, cx, y - h / 2, w, h, w * 0.2, 'rgba(0,0,0,.4)', 2);
      cx += w + gap;
    };
    for (let i = 0; i < reds; i++) tile(CARD_R);
    for (let i = 0; i < yellows; i++) tile(CARD_Y);
    return Math.max(0, cx - gap - x);
  }

  /** Fila de sancionado: tarjetitas, nombre y las fechas que debe. */
  function paintSanctionRow(ctx, t, row, x, y, w, h) {
    K.fillRR(ctx, x, y, w, h, 22, K.rgba(CARD_R, 0.1));
    K.strokeRR(ctx, x, y, w, h, 22, K.rgba(CARD_R, 0.42), 2);

    const mid = y + h / 2;
    const pipsW = paintCardPips(ctx, x + 28, mid, Math.min(row.reds, 4), 0, Math.min(46, h * 0.44));

    const fechas = row.pending === 1 ? '1 FECHA' : row.pending + ' FECHAS';
    K.setFont(ctx, '800', 26, K.FONT_BODY);
    const chipW = K.measure(ctx, fechas, 3) + 44;

    K.text(ctx, row.name.toUpperCase(), x + 44 + pipsW, mid + 14, {
      family: K.FONT_COND, weight: '700', size: 44, color: t.ink,
      maxWidth: w - pipsW - chipW - 110,
    });

    K.chip(ctx, {
      x: x + w - 28, y: mid - 26, align: 'right', text: fechas,
      size: 26, height: 52, radius: 26, padX: 22, tracking: 3,
      bg: K.rgba(CARD_R, 0.2), fg: '#ffb0b0', border: K.rgba(CARD_R, 0.55),
    });
  }

  /** Fila de ficha: nombre a la izquierda, tarjetas a la derecha. */
  function paintFichaRow(ctx, t, row, x, y, w, h, zebra) {
    if (zebra) K.fillRR(ctx, x, y, w, h, 14, K.rgba(t.ink, 0.045));

    const mid = y + h / 2;
    const size = U.clamp(h * 0.56, 30, 44);
    K.text(ctx, row.name.toUpperCase(), x + 24, mid + size * 0.33, {
      family: K.FONT_COND, weight: '700', size, color: row.pending > 0 ? '#ffb0b0' : t.ink,
      maxWidth: w - 300,
    });

    const cuenta = [];
    if (row.yellows) cuenta.push(row.yellows + 'A');
    if (row.directReds) cuenta.push(row.directReds + 'R');
    K.text(ctx, cuenta.join(' · ') || '—', x + w - 150, mid + 10, {
      family: K.FONT_BODY, weight: '800', size: 24, color: K.rgba(t.sub, 0.7), align: 'right', tracking: 2,
    });

    paintCardPips(ctx, x + w - 130, mid, Math.min(row.reds, 3), row.loose ? 1 : 0, Math.min(38, h * 0.62));
  }

  function renderCards(ctx, data) {
    const { match, t } = data;
    const rows = HF.discipline.rows();
    const suspendidos = rows.filter((r) => r.pending > 0);
    const fechas = suspendidos.reduce((n, r) => n + r.pending, 0);

    paintStage(ctx, t, { accent: CARD_R });
    paintFrame(ctx, t);
    paintBrand(ctx, t, 'Disciplina');
    paintKicker(ctx, t, 'AMARILLAS Y ROJAS', suspendidos.length ? t.warn : t.accent);

    let y = paintTitle(ctx, t, 'PARTE DISCIPLINARIO', 268, 74, t.ink) + 26;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    K.glow(ctx, W / 2, y + 150, 380, suspendidos.length ? CARD_R : t.accent, 0.18);
    ctx.restore();

    /* Titular: cuántos no pueden jugar. */
    if (suspendidos.length) {
      const n = String(suspendidos.length);
      const size = K.fit(ctx, n, INNER - 420, { family: K.FONT_DISPLAY, weight: '400', max: 210, min: 110 });
      K.text(ctx, n, W / 2, y + 190, {
        family: K.FONT_DISPLAY, weight: '400', size, align: 'center',
        color: (c, x, w) => K.lg(c, x, y + 40, x + w, y + 200, [[0, '#ffffff'], [0.6, CARD_R], [1, t.warn]]),
        glow: K.rgba(CARD_R, 0.75), glowBlur: 55,
      });
      K.text(ctx, suspendidos.length === 1 ? 'SUSPENDIDO' : 'SUSPENDIDOS', W / 2, y + 256, {
        family: K.FONT_DISPLAY, weight: '400', size: 62, color: t.ink, align: 'center', tracking: 8,
      });
      K.chip(ctx, {
        x: W / 2, y: y + 306, height: 58, radius: 29, padX: 34, size: 26, tracking: 4,
        text: (fechas === 1 ? '1 FECHA' : fechas + ' FECHAS') + ' EN TOTAL',
        bg: K.rgba(CARD_R, 0.16), fg: '#ffb0b0', border: K.rgba(CARD_R, 0.45),
      });
      y += 356;
    } else {
      K.text(ctx, 'ESTÁN TODOS', W / 2, y + 118, {
        family: K.FONT_DISPLAY, weight: '400', size: 100, color: K.rgba(t.sub, 0.92),
        align: 'center', tracking: 6,
      });
      K.text(ctx, 'HABILITADOS', W / 2, y + 236, {
        family: K.FONT_DISPLAY, weight: '400', size: 128, align: 'center', tracking: 4,
        color: (c, x, w) => K.lg(c, x, y + 140, x + w, y + 250, [[0, '#ffffff'], [0.55, t.accent], [1, t.accent2]]),
        glow: K.rgba(t.accent, 0.8), glowBlur: 55,
      });
      y += 296;
    }

    /*
     * Lo que queda hasta el pie se reparte entre los dos bloques: con pocos
     * jugadores las filas se estiran en vez de dejar medio flyer vacío.
     */
    const bottom = CTA_TOP - 72;
    const HEAD = 52;
    const sancionados = suspendidos.slice(0, 4);
    const extra = suspendidos.length > sancionados.length ? 44 : 0;

    let sancionH = 0;
    let usadoArriba = 0;
    if (sancionados.length) {
      sancionH = U.clamp((bottom - y - HEAD - extra) * 0.42 / sancionados.length - 12, 96, 132);
      usadoArriba = HEAD + sancionados.length * (sancionH + 12) + extra;
    }

    const fichasLibres = bottom - y - usadoArriba - HEAD;
    const cabe = Math.min(rows.length, Math.max(0, Math.floor(fichasLibres / 56)));
    const fichaH = cabe ? U.clamp(fichasLibres / cabe, 56, 88) : 0;

    /* Sin sanciones arriba, el sobrante centra la tabla en vez de irse al pie. */
    const muestraFichas = cabe >= Math.min(3, rows.length);
    const sobra = Math.max(0, fichasLibres - cabe * fichaH);
    const aire = muestraFichas ? sobra / 2 : 0;

    if (sancionados.length) {
      K.text(ctx, 'NO PUEDEN JUGAR', M + 6, y + 26, {
        family: K.FONT_BODY, weight: '800', size: 24, color: K.rgba(t.sub, 0.6), tracking: 5,
      });
      y += HEAD;
      sancionados.forEach((row) => {
        paintSanctionRow(ctx, t, row, M, y, INNER, sancionH);
        y += sancionH + 12;
      });
      if (extra) {
        K.text(ctx, '+' + (suspendidos.length - sancionados.length) + ' MÁS', W / 2, y + 26, {
          family: K.FONT_BODY, weight: '800', size: 24, color: K.rgba(t.sub, 0.55), align: 'center', tracking: 4,
        });
        y += extra;
      }
    }

    if (muestraFichas) {
      y += aire;
      K.text(ctx, 'FICHAS DEL GRUPO', M + 6, y + 26, {
        family: K.FONT_BODY, weight: '800', size: 24, color: K.rgba(t.sub, 0.6), tracking: 5,
      });
      y += HEAD;
      rows.slice(0, cabe).forEach((row, i) => {
        paintFichaRow(ctx, t, row, M, y, INNER, fichaH, i % 2 === 0);
        y += fichaH;
      });
    }

    paintContextLine(ctx, t, [match.titulo, 'Cada dos amarillas, una roja']);
    paintCTA(ctx, t, suspendidos.length ? 'FECHAS QUE SE CUMPLEN SIN JUGAR' : 'EL GRUPO ESTÁ AL DÍA');
  }

  /* ============================================================
     5. LA TARJETA DE UNO
     ============================================================ */
  /**
   * El anuncio de una tarjeta puntual. `data.card` es la tarjeta y
   * `data.row` la ficha del jugador tal como quedó después de ponerla.
   */
  function renderCard(ctx, data) {
    const { t, card, row } = data;
    if (!card) throw new Error('Falta la tarjeta a dibujar');

    const esRoja = card.type === 'red';
    const tono = esRoja ? CARD_R : CARD_Y;
    const nombre = (card.name || '').toUpperCase();
    const veredicto = cardVerdict(row, esRoja);

    paintStage(ctx, t, { accent: tono });
    paintFrame(ctx, t);
    paintBrand(ctx, t, U.formatDateShort(card.date));
    paintKicker(ctx, t, esRoja ? 'ROJA' : 'AMARILLA', tono);

    /*
     * Se miden los bloques antes de dibujar y el conjunto se centra entre el
     * kicker y el pie: con un nombre corto y sin motivo, si no, queda medio
     * flyer vacío.
     */
    const LABEL = 84;
    const nameSize = K.fit(ctx, nombre, INNER - 60, {
      family: K.FONT_DISPLAY, weight: '400', max: 210, min: 48,
    });
    const razon = card.reason ? wrapText(ctx, card.reason, INNER - 130, { family: K.FONT_COND, weight: '700', size: 46 }) : [];
    const razonH = razon.length ? 40 + razon.length * 58 : 0;
    const headSize = K.fit(ctx, veredicto.headline, INNER - 120, {
      family: K.FONT_DISPLAY, weight: '400', max: 116, min: 42,
    });

    const alto =
      LABEL + 34 +
      nameSize + (razonH ? 74 : 56) +
      (razonH ? razonH + 60 : 0) +
      38 + 26 +
      headSize + 22 +
      (veredicto.sub ? 50 : 0);

    const top = 300;
    const bottom = CTA_TOP - 92;
    let y = top + Math.max(0, (bottom - top - alto) / 2);

    /* La tarjeta inclinada va de fondo del nombre, no en una Y fija. */
    const cardCy = y + LABEL + 34 + nameSize * 0.42;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    K.glow(ctx, W / 2, cardCy, 520, tono, 0.22);
    ctx.restore();

    ctx.save();
    ctx.translate(W / 2, cardCy);
    ctx.rotate(-0.14);
    K.fillRR(ctx, -238, -330, 476, 660, 40, K.rgba(tono, 0.16));
    K.strokeRR(ctx, -238, -330, 476, 660, 40, K.rgba(tono, 0.5), 5);
    ctx.restore();

    K.text(ctx, esRoja ? 'ROJA PARA' : 'AMARILLA PARA', W / 2, y + LABEL * 0.78, {
      family: K.FONT_DISPLAY, weight: '400', size: LABEL, color: K.rgba(t.sub, 0.92),
      align: 'center', tracking: 8,
    });
    y += LABEL + 34;

    const baseline = y + nameSize * 0.78;
    K.text(ctx, nombre, W / 2, baseline, {
      family: K.FONT_DISPLAY, weight: '400', size: nameSize, align: 'center', tracking: 2,
      color: (c, x, w) => K.lg(c, x, baseline - nameSize, x + w, baseline, [
        [0, '#ffffff'], [0.55, tono], [1, esRoja ? t.warn : '#ffffff'],
      ]),
      glow: K.rgba(tono, 0.8), glowBlur: 55,
      stroke: K.rgba(tono, 0.3), strokeWidth: 5,
    });
    y += nameSize + (razonH ? 74 : 56);

    /* El motivo, que es el punto de la tarjeta. */
    if (razonH) {
      K.fillRR(ctx, M, y, INNER, razonH, 28, K.rgba(t.ink, 0.07));
      K.strokeRR(ctx, M, y, INNER, razonH, 28, K.rgba(tono, 0.32), 2);
      razon.forEach((line, i) => {
        K.text(ctx, line, W / 2, y + 62 + i * 58, {
          family: K.FONT_COND, weight: '700', size: 46, color: t.ink, align: 'center',
        });
      });
      y += razonH + 60;
    }

    /* Y lo que la tarjeta significa. */
    K.text(ctx, veredicto.kicker, W / 2, y + 28, {
      family: K.FONT_BODY, weight: '800', size: 27, color: K.rgba(t.sub, 0.6),
      align: 'center', tracking: 5,
    });
    y += 38 + 26;

    K.text(ctx, veredicto.headline, W / 2, y + headSize * 0.78, {
      family: K.FONT_DISPLAY, weight: '400', size: headSize, align: 'center', tracking: 3,
      color: veredicto.grave ? tono : t.ink,
      glow: veredicto.grave ? K.rgba(tono, 0.6) : null, glowBlur: 34,
    });
    y += headSize + 22;

    if (veredicto.sub) {
      K.text(ctx, veredicto.sub, W / 2, y + 34, {
        family: K.FONT_COND, weight: '700', size: 42, color: K.rgba(t.sub, 0.85),
        align: 'center', maxWidth: INNER - 60,
      });
    }

    paintContextLine(ctx, t, [data.match.titulo, 'Cada dos amarillas, una roja']);
    paintCTA(ctx, t, esRoja ? 'ROJA DIRECTA' : 'AMARILLA DEL GRUPO');
  }

  /** Parte el texto en líneas que entren en el ancho pedido. */
  function wrapText(ctx, str, maxWidth, font) {
    K.setFont(ctx, font.weight, font.size, font.family);
    const palabras = String(str).split(/\s+/).filter(Boolean);
    const lines = [];
    let actual = '';
    palabras.forEach((p) => {
      const prueba = actual ? actual + ' ' + p : p;
      if (ctx.measureText(prueba).width > maxWidth && actual) {
        lines.push(actual);
        actual = p;
      } else {
        actual = prueba;
      }
    });
    if (actual) lines.push(actual);
    return lines.slice(0, 3);
  }

  /** Qué le pasa al jugador con esta tarjeta encima. */
  function cardVerdict(row, esRoja) {
    if (!row) return { kicker: 'QUEDA', headline: 'ANOTADA', sub: '', grave: esRoja };

    if (row.pending > 0) {
      return {
        kicker: esRoja ? 'ROJA DIRECTA' : 'DOBLE AMARILLA',
        headline: 'SUSPENDIDO',
        sub: (row.pending === 1 ? '1 fecha' : row.pending + ' fechas') + ' sin jugar',
        grave: true,
      };
    }
    if (row.loose) {
      return {
        kicker: 'LE QUEDA',
        headline: 'UNA AMARILLA',
        sub: 'Con la próxima es roja',
        grave: false,
      };
    }
    return {
      kicker: 'FICHA',
      headline: row.yellows === 1 ? '1 AMARILLA' : row.yellows + ' AMARILLAS',
      sub: 'Sin fechas pendientes',
      grave: false,
    };
  }

  /* ============================================================
     API
     ============================================================ */
  const RENDERERS = {
    call: { fn: renderCall, title: 'Flyer de convocatoria', file: 'convocatoria' },
    teams: { fn: renderTeams, title: 'Flyer de formaciones', file: 'formaciones' },
    mvp: { fn: renderMvp, title: 'Flyer de la figura', file: 'figura' },
    cards: { fn: renderCards, title: 'Flyer de tarjetas', file: 'tarjetas' },
    card: { fn: renderCard, title: 'Flyer de la tarjeta', file: 'tarjeta' },
  };

  /**
   * Dibuja un flyer en un canvas de 1080x1920.
   * @param {string} kind call | teams | mvp | cards | card
   * @param {object} [extra] datos propios del flyer, como la tarjeta a mostrar
   */
  async function render(kind, canvas, store, themeId, extra) {
    const spec = RENDERERS[kind];
    if (!spec) throw new Error('Flyer desconocido: ' + kind);

    await K.loadFonts();
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    spec.fn(ctx, Object.assign(
      { match: store.match, store: store, t: HF.themes.byId(themeId) },
      extra || {}
    ));
    return canvas;
  }

  function meta(kind) {
    return RENDERERS[kind] || RENDERERS.call;
  }

  function filename(kind, match, extra) {
    const spec = meta(kind);
    const base = kind === 'card' && extra && extra.card
      ? extra.card.name
      : match.titulo || match.lugar || 'partido';
    const slug = U.normalize(base)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28) || 'partido';
    return 'hayfulbo-' + spec.file + '-' + slug + '.png';
  }

  HF.flyers = { render, meta, filename, W, H, rankLabel, formationRows };
})(window);
