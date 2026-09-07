/* ============================================================
   HAY FULBO — state.js
   Estado único de la app, persistencia y codec de links.
   Expone: window.HF.store
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const U = HF.util;

  const KEY_MATCH = 'hayfulbo:match:v2';
  const KEY_HISTORY = 'hayfulbo:history:v2';
  const KEY_PREFS = 'hayfulbo:prefs:v2';

  const POSITIONS = ['COM', 'ARQ', 'DEF', 'MED', 'DEL'];
  const POS_LABEL = { COM: 'Campo', ARQ: 'Arquero', DEF: 'Defensor', MED: 'Medio', DEL: 'Delantero' };

  const FORMATS = {
    10: 'Fútbol 5', 12: 'Fútbol 6', 14: 'Fútbol 7', 16: 'Fútbol 8', 22: 'Fútbol 11',
  };

  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 40;
  const DEFAULT_LEVEL = 7;

  /* ---------------- fábricas ---------------- */
  function makeMatch(patch) {
    return Object.assign(
      {
        v: 2,
        titulo: '',
        lugar: '',
        fecha: U.todayISO(),
        hora: '',
        totalPlayers: 10,
        precio: 0,
        players: [],
        teamNames: { a: 'Claritos', b: 'Oscuritos' },
        teams: null,
        mvpId: null,
        createdAt: Date.now(),
      },
      patch || {}
    );
  }

  function makePlayer(name, pos, level) {
    return {
      id: U.uid('p'),
      name: U.titleCase(name).slice(0, 22),
      pos: POSITIONS.includes(pos) ? pos : 'COM',
      level: U.clamp(U.toInt(level, DEFAULT_LEVEL), 1, 10),
      paid: false,
      score: 7,
      goals: 0,
    };
  }

  /* ---------------- saneamiento ---------------- */
  function sanitizeMatch(raw) {
    if (!raw || typeof raw !== 'object') return makeMatch();
    const m = makeMatch();
    m.titulo = String(raw.titulo || '').slice(0, 34);
    m.lugar = String(raw.lugar || '').slice(0, 40);
    m.fecha = /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha) ? raw.fecha : U.todayISO();
    m.hora = /^\d{2}:\d{2}$/.test(raw.hora) ? raw.hora : '';
    m.totalPlayers = U.clamp(U.toInt(raw.totalPlayers, 10), MIN_PLAYERS, MAX_PLAYERS);
    m.precio = Math.max(0, U.toInt(raw.precio, 0));
    m.createdAt = U.toInt(raw.createdAt, Date.now());

    m.players = Array.isArray(raw.players)
      ? raw.players.slice(0, MAX_PLAYERS + 20).map((p) => {
          const player = makePlayer(p && p.name, p && p.pos, p && p.level);
          if (p && typeof p.id === 'string') player.id = p.id;
          player.paid = !!(p && p.paid);
          player.score = U.clamp(U.toInt(p && p.score, 7), 1, 10);
          player.goals = U.clamp(U.toInt(p && p.goals, 0), 0, 99);
          return player;
        }).filter((p) => p.name)
      : [];

    if (raw.teamNames) {
      m.teamNames = {
        a: String(raw.teamNames.a || 'Claritos').slice(0, 16) || 'Claritos',
        b: String(raw.teamNames.b || 'Oscuritos').slice(0, 16) || 'Oscuritos',
      };
    }

    const ids = new Set(m.players.map((p) => p.id));
    if (raw.teams && Array.isArray(raw.teams.a) && Array.isArray(raw.teams.b)) {
      m.teams = {
        a: raw.teams.a.filter((id) => ids.has(id)),
        b: raw.teams.b.filter((id) => ids.has(id)),
      };
      if (!m.teams.a.length && !m.teams.b.length) m.teams = null;
    }

    m.mvpId = ids.has(raw.mvpId) ? raw.mvpId : null;
    return m;
  }

  /* ---------------- store ---------------- */
  const listeners = new Set();

  const store = {
    match: makeMatch(),
    history: [],
    prefs: { theme: 'noche', step: 1 },

    /* --- ciclo de vida --- */
    load() {
      const shared = readShareLink();
      this.history = normalizeHistory(U.storage.get(KEY_HISTORY, []));
      this.prefs = Object.assign({ theme: 'noche', step: 1 }, U.storage.get(KEY_PREFS, {}));
      this.match = sanitizeMatch(shared || U.storage.get(KEY_MATCH, null));
      return { fromLink: !!shared };
    },

    save() {
      U.storage.set(KEY_MATCH, this.match);
      U.storage.set(KEY_PREFS, this.prefs);
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Aplica un cambio, persiste y notifica. */
    commit(mutator, meta) {
      if (typeof mutator === 'function') mutator(this.match);
      this.save();
      listeners.forEach((fn) => fn(this.match, meta || {}));
    },

    /* --- derivados --- */
    get starters() {
      return this.match.players.slice(0, this.match.totalPlayers);
    },
    get subs() {
      return this.match.players.slice(this.match.totalPlayers);
    },
    get missing() {
      return this.match.totalPlayers - this.match.players.length;
    },
    get formatLabel() {
      const n = this.match.totalPlayers;
      return (FORMATS[n] || 'Formato libre') + ' · ' + n + ' jugadores';
    },
    playerById(id) {
      return this.match.players.find((p) => p.id === id) || null;
    },
    get mvp() {
      const explicit = this.playerById(this.match.mvpId);
      if (explicit) return explicit;
      if (!this.match.players.length) return null;
      return [...this.match.players].sort(
        (a, b) => b.score - a.score || b.goals - a.goals || a.name.localeCompare(b.name)
      )[0];
    },

    /* --- jugadores --- */
    addPlayer(name, pos) {
      const clean = U.titleCase(name);
      if (!clean) return { ok: false, reason: 'empty' };
      if (this.match.players.length >= MAX_PLAYERS + 10) return { ok: false, reason: 'max' };
      const exists = this.match.players.some((p) => U.normalize(p.name) === U.normalize(clean));
      if (exists) return { ok: false, reason: 'dup' };

      const player = makePlayer(clean, pos, this.suggestLevel(clean));
      this.commit((m) => {
        m.players.push(player);
        m.teams = null;
      });
      return { ok: true, player, isSub: this.match.players.length > this.match.totalPlayers };
    },

    removePlayer(id) {
      this.commit((m) => {
        m.players = m.players.filter((p) => p.id !== id);
        if (m.mvpId === id) m.mvpId = null;
        m.teams = null;
      });
    },

    updatePlayer(id, patch) {
      this.commit((m) => {
        const p = m.players.find((x) => x.id === id);
        if (!p) return;
        Object.assign(p, patch);
        if ('level' in patch || 'pos' in patch) m.teams = null;
      });
    },

    clearPlayers() {
      this.commit((m) => {
        m.players = [];
        m.teams = null;
        m.mvpId = null;
      });
    },

    /** Nivel sugerido a partir del promedio histórico del jugador. */
    suggestLevel(name) {
      const key = U.normalize(name);
      const rows = this.rankingHistorico();
      const found = rows.find((r) => r.key === key);
      return found ? U.clamp(Math.round(found.avg), 1, 10) : DEFAULT_LEVEL;
    },

    /* --- historial --- */
    pushHistory(entry) {
      this.history.unshift(entry);
      this.history = this.history.slice(0, 60);
      U.storage.set(KEY_HISTORY, this.history);
    },
    clearHistory() {
      this.history = [];
      U.storage.set(KEY_HISTORY, this.history);
    },

    /**
     * Los jugadores que ya pasaron por el grupo, del más habitual al menos.
     * El último partido pesa doble para que el plantel de esta semana venga primero.
     */
    knownPlayers() {
      const map = new Map();
      const add = (name, pos, weight) => {
        const key = U.normalize(name);
        if (!key) return;
        if (!map.has(key)) map.set(key, { key, name, pos: pos || 'COM', count: 0 });
        const row = map.get(key);
        row.count += weight;
        row.name = name;
        if (pos && pos !== 'COM') row.pos = pos;
      };

      this.history.forEach((match, i) => {
        (match.players || []).forEach((p) => add(p.name, p.pos, i === 0 ? 2 : 1));
      });
      this.match.players.forEach((p) => add(p.name, p.pos, 0));

      return Array.from(map.values()).sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name)
      );
    },

    /** Agrega el historial en una tabla de posiciones por jugador. */
    rankingHistorico() {
      const map = new Map();
      this.history.forEach((match) => {
        (match.players || []).forEach((p) => {
          const key = U.normalize(p.name);
          if (!key) return;
          if (!map.has(key)) map.set(key, { key, name: p.name, games: 0, sum: 0, goals: 0, mvps: 0 });
          const row = map.get(key);
          row.games += 1;
          row.sum += U.toInt(p.score, 7);
          row.goals += U.toInt(p.goals, 0);
          if (p.mvp) row.mvps += 1;
          row.name = p.name;
        });
      });
      return Array.from(map.values())
        .map((r) => Object.assign(r, { avg: r.games ? r.sum / r.games : 0 }))
        .sort((a, b) => b.avg - a.avg || b.mvps - a.mvps || b.goals - a.goals);
    },

    /* --- reset --- */
    reset(keepConfig) {
      const prev = this.match;
      this.match = makeMatch(
        keepConfig
          ? {
              titulo: prev.titulo,
              lugar: prev.lugar,
              hora: prev.hora,
              totalPlayers: prev.totalPlayers,
              precio: prev.precio,
              teamNames: prev.teamNames,
            }
          : null
      );
      this.commit(null, { reset: true });
    },
  };

  function normalizeHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((h) => h && typeof h === 'object')
      .map((h) => ({
        id: String(h.id || U.uid('h')),
        date: String(h.date || ''),
        titulo: String(h.titulo || ''),
        lugar: String(h.lugar || ''),
        teamNames: h.teamNames || { a: 'Equipo A', b: 'Equipo B' },
        mvpName: String(h.mvpName || ''),
        players: Array.isArray(h.players) ? h.players : [],
        savedAt: U.toInt(h.savedAt, 0),
      }));
  }

  /* ---------------- links compartibles ---------------- */
  /** Payload corto: claves de una letra para que el link entre en un mensaje. */
  function toSharePayload(m) {
    return {
      v: 2,
      t: m.titulo,
      l: m.lugar,
      f: m.fecha,
      h: m.hora,
      n: m.totalPlayers,
      c: m.precio,
      p: m.players.map((p) => [p.name, p.pos, p.level, p.paid ? 1 : 0]),
    };
  }

  function fromSharePayload(d) {
    if (!d || typeof d !== 'object') return null;
    return sanitizeMatch({
      titulo: d.t,
      lugar: d.l,
      fecha: d.f,
      hora: d.h,
      totalPlayers: d.n,
      precio: d.c,
      players: (Array.isArray(d.p) ? d.p : []).map((row) =>
        Array.isArray(row)
          ? { name: row[0], pos: row[1], level: row[2], paid: !!row[3] }
          : { name: String(row) }
      ),
    });
  }

  function buildShareLink(match) {
    const code = U.encodeB64Url(JSON.stringify(toSharePayload(match)));
    const base = location.origin + location.pathname;
    return base + '#m=' + code;
  }

  function readShareLink() {
    const hash = location.hash || '';
    const match = hash.match(/[#&]m=([A-Za-z0-9\-_]+)/);
    if (!match) return null;
    try {
      const data = JSON.parse(U.decodeB64Url(match[1]));
      const parsed = fromSharePayload(data);
      history.replaceState(null, '', location.pathname + location.search);
      return parsed;
    } catch (_) {
      return null;
    }
  }

  /* ---------------- exports ---------------- */
  HF.store = store;
  HF.model = {
    POSITIONS, POS_LABEL, FORMATS, MIN_PLAYERS, MAX_PLAYERS, DEFAULT_LEVEL,
    makeMatch, makePlayer, sanitizeMatch, buildShareLink,
  };
})(window);
