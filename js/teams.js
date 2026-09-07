/* ============================================================
   HAY FULBO — teams.js
   Balanceador de equipos: reparto inicial + optimización local.
   Expone: window.HF.teams
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const U = HF.util;

  /* Peso de cada criterio dentro del costo total de un reparto. */
  const W_LEVEL = 1.0;   // diferencia de nivel acumulado
  const W_POS = 0.7;     // desbalance por puesto
  const W_SIZE = 6.0;    // diferencia de cantidad de jugadores
  const MAX_PASSES = 40;

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const sumLevel = (list) => list.reduce((acc, p) => acc + p.level, 0);

  function positionGap(a, b) {
    const count = (list, pos) => list.filter((p) => p.pos === pos).length;
    return ['ARQ', 'DEF', 'MED', 'DEL'].reduce(
      (acc, pos) => acc + Math.abs(count(a, pos) - count(b, pos)),
      0
    );
  }

  function cost(a, b) {
    return (
      W_LEVEL * Math.abs(sumLevel(a) - sumLevel(b)) +
      W_POS * positionGap(a, b) +
      W_SIZE * Math.abs(a.length - b.length)
    );
  }

  /** Reparto inicial tipo serpiente sobre los jugadores ordenados por nivel. */
  function snakeDraft(pool) {
    const sorted = shuffle(pool).sort((x, y) => y.level - x.level);
    const a = [];
    const b = [];
    sorted.forEach((player, i) => {
      const turn = Math.floor(i / 2) % 2 === 0 ? i % 2 : 1 - (i % 2);
      (turn === 0 ? a : b).push(player);
    });
    return [a, b];
  }

  /** Mejora el reparto probando intercambios y movimientos de a uno. */
  function optimize(a, b) {
    let best = cost(a, b);
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let improved = false;

      for (let i = 0; i < a.length && !improved; i++) {
        for (let j = 0; j < b.length; j++) {
          [a[i], b[j]] = [b[j], a[i]];
          const next = cost(a, b);
          if (next < best - 1e-9) {
            best = next;
            improved = true;
            break;
          }
          [a[i], b[j]] = [b[j], a[i]];
        }
      }

      if (!improved && Math.abs(a.length - b.length) > 1) {
        const from = a.length > b.length ? a : b;
        const to = from === a ? b : a;
        for (let i = 0; i < from.length; i++) {
          to.push(from[i]);
          from.splice(i, 1);
          const next = cost(a, b);
          if (next < best - 1e-9) {
            best = next;
            improved = true;
            break;
          }
          from.splice(i, 0, to.pop());
        }
      }

      if (!improved) break;
    }
    return best;
  }

  /**
   * Balancea los titulares en dos equipos.
   * @param {Array} players lista de titulares
   * @returns {{a:string[], b:string[], sumA:number, sumB:number, diff:number}}
   */
  function balance(players) {
    const list = (players || []).filter(Boolean);
    if (list.length < 2) return { a: list.map((p) => p.id), b: [], sumA: sumLevel(list), sumB: 0, diff: sumLevel(list) };

    /* 1. Los arqueros se reparten primero: uno por equipo si hay al menos dos. */
    const keepers = list.filter((p) => p.pos === 'ARQ');
    const field = list.filter((p) => p.pos !== 'ARQ');
    const a = [];
    const b = [];

    if (keepers.length >= 2) {
      const pair = shuffle(keepers).sort((x, y) => y.level - x.level);
      a.push(pair[0]);
      b.push(pair[1]);
      field.push(...pair.slice(2));
    } else {
      field.push(...keepers);
    }

    /* 2. Reparto serpiente del resto y fusión con los arqueros ya asignados. */
    const [draftA, draftB] = snakeDraft(field);
    a.push(...draftA);
    b.push(...draftB);

    /* 3. Optimización local. */
    optimize(a, b);

    const sumA = sumLevel(a);
    const sumB = sumLevel(b);
    return {
      a: a.map((p) => p.id),
      b: b.map((p) => p.id),
      sumA,
      sumB,
      diff: Math.abs(sumA - sumB),
    };
  }

  /** Mueve un jugador al otro equipo respetando la estructura guardada. */
  function movePlayer(teams, id) {
    if (!teams) return teams;
    const inA = teams.a.includes(id);
    const from = inA ? 'a' : 'b';
    const to = inA ? 'b' : 'a';
    if (!teams[from].includes(id)) return teams;
    return {
      a: from === 'a' ? teams.a.filter((x) => x !== id) : teams.a.concat(id),
      b: from === 'b' ? teams.b.filter((x) => x !== id) : teams.b.concat(id),
    };
  }

  /** Texto de calidad del reparto para mostrar en la UI. */
  function qualityLabel(diff) {
    if (diff === 0) return 'Reparto perfecto';
    if (diff <= 1) return 'Muy parejo';
    if (diff <= 3) return 'Parejo';
    if (diff <= 5) return 'Aceptable';
    return 'Desparejo';
  }

  HF.teams = { balance, movePlayer, qualityLabel, sumLevel, cost };
})(window);
