/* ============================================================
   HAY FULBO — discipline.js
   Registro de amarillas y rojas del grupo, con las fechas de
   suspensión que salen de ellas.

   Lo único que se guarda son las tarjetas: un log plano de hechos.
   Rojas, fechas debidas y fechas pendientes se calculan cada vez.
   Guardar el total lleva a que un borrado deje números que ya no
   cierran con lo que muestra la lista.

   La regla: cada dos amarillas sale una roja; la primera roja pesa
   una fecha, la segunda dos, la tercera tres, y así.
   Expone: window.HF.discipline
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const U = HF.util;

  const KEY = 'hayfulbo:discipline:v1';
  const TYPES = ['yellow', 'red'];
  const MAX_CARDS = 400;
  const MAX_REASON = 140;

  /* ---------------- saneamiento ---------------- */
  function sanitizeCard(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = U.titleCase(String(raw.name || '')).slice(0, 22);
    if (!name) return null;
    return {
      id: String(raw.id || U.uid('c')),
      key: U.normalize(name),
      name,
      type: TYPES.includes(raw.type) ? raw.type : 'yellow',
      reason: String(raw.reason || '').slice(0, MAX_REASON),
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : U.todayISO(),
      at: U.toInt(raw.at, Date.now()),
    };
  }

  function sanitizeServed(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach((key) => {
      const n = U.toInt(raw[key], 0);
      if (key && n > 0) out[key] = n;
    });
    return out;
  }

  /* ---------------- registro ---------------- */
  const discipline = {
    cards: [],
    served: {},

    load() {
      const raw = U.storage.get(KEY, null) || {};
      this.cards = (Array.isArray(raw.cards) ? raw.cards : [])
        .map(sanitizeCard)
        .filter(Boolean)
        .slice(0, MAX_CARDS);
      this.served = sanitizeServed(raw.served);
      return this;
    },

    save() {
      U.storage.set(KEY, { v: 1, cards: this.cards, served: this.served });
    },

    /* --- alta y baja de tarjetas --- */
    add(name, type, reason, date) {
      const card = sanitizeCard({ name, type, reason, date, at: Date.now() });
      if (!card) return null;
      this.cards.unshift(card);
      this.cards = this.cards.slice(0, MAX_CARDS);
      this.save();
      return card;
    },

    remove(id) {
      const before = this.cards.length;
      this.cards = this.cards.filter((c) => c.id !== id);
      if (this.cards.length !== before) this.save();
    },

    clear() {
      this.cards = [];
      this.served = {};
      this.save();
    },

    /* --- fechas cumplidas --- */
    serve(key, n) {
      const total = U.toInt(this.served[key], 0) + U.toInt(n, 1);
      if (total > 0) this.served[key] = total;
      else delete this.served[key];
      this.save();
    },

    /**
     * Descuenta una fecha a todo el que deba y no haya estado en la lista.
     * El que igual jugó no cumple nada: si aparece en la nómina, la fecha
     * sigue debiéndose.
     * @returns {Array<{name:string, left:number}>} los que cumplieron
     */
    serveMatch(playedKeys) {
      const jugaron = new Set(playedKeys || []);
      const cumplieron = [];
      this.rows().forEach((row) => {
        if (row.pending <= 0 || jugaron.has(row.key)) return;
        this.served[row.key] = U.toInt(this.served[row.key], 0) + 1;
        cumplieron.push({ name: row.name, left: row.pending - 1 });
      });
      if (cumplieron.length) this.save();
      return cumplieron;
    },

    /* --- lectura --- */
    cardsOf(key) {
      return this.cards.filter((c) => c.key === key);
    },

    /**
     * Una fila por jugador con tarjetas, de la deuda más grande a la más
     * chica. `owed` es el total histórico de fechas y `pending` lo que
     * todavía no cumplió.
     */
    rows() {
      const map = new Map();

      this.cards.forEach((card) => {
        if (!map.has(card.key)) {
          map.set(card.key, { key: card.key, name: card.name, yellows: 0, directReds: 0, cards: [] });
        }
        const row = map.get(card.key);
        row.cards.push(card);
        if (card.type === 'red') row.directReds += 1;
        else row.yellows += 1;
      });

      return Array.from(map.values())
        .map((row) => {
          const reds = Math.floor(row.yellows / 2) + row.directReds;
          const owed = (reds * (reds + 1)) / 2;
          const served = Math.min(owed, U.toInt(this.served[row.key], 0));
          return Object.assign(row, {
            reds,
            owed,
            served,
            pending: owed - served,
            /* La amarilla suelta que todavía no completó una roja. */
            loose: row.yellows % 2,
          });
        })
        .sort((a, b) => b.pending - a.pending || b.reds - a.reds || b.yellows - a.yellows || a.name.localeCompare(b.name));
    },

    rowOf(name) {
      const key = U.normalize(name);
      return this.rows().find((r) => r.key === key) || null;
    },

    /** Las fechas que le quedan por cumplir a un nombre. 0 si está limpio. */
    pendingFor(name) {
      const row = this.rowOf(name);
      return row ? row.pending : 0;
    },

    /** Todos los que deben fechas, para avisar al armar la lista. */
    suspended() {
      return this.rows().filter((r) => r.pending > 0);
    },
  };

  HF.discipline = discipline;
  HF.disciplineModel = { KEY, TYPES, MAX_REASON };
})(window);
