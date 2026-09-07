/* ============================================================
   HAY FULBO — ui.js
   Render de pantallas, eventos y puente con el motor de flyers.
   Expone: window.HF.ui
   ============================================================ */
(function (global) {
  'use strict';

  const HF = (global.HF = global.HF || {});
  const U = HF.util;
  const { $, $$, el, icon, on } = U;

  const store = HF.store;
  const model = HF.model;

  let currentStep = 1;
  let currentFlyer = 'call';

  /**
   * Engancha un listener sin explotar si el elemento no está.
   * Un id que cambió no tiene que dejar sin handlers al resto de la pantalla.
   */
  function bind(selector, type, handler) {
    const node = $(selector);
    if (!node) {
      console.warn('[hayfulbo] no encontré', selector, '— sigo con el resto');
      return null;
    }
    node.addEventListener(type, handler);
    return node;
  }

  /* ============================================================
     Navegación
     ============================================================ */
  function setStep(n, silent) {
    let step = U.clamp(n, 1, 5);

    /* Sin balanceador el paso de equipos no existe: se cae directo en puntajes. */
    if (step === 3 && store.match.skipTeams) step = 4;

    if (step === 3 && store.match.players.length < 2) {
      U.toast('Necesitás al menos 2 jugadores para armar equipos.', 'info');
      return;
    }
    if (step === 4 && store.match.players.length === 0) {
      U.toast('Primero anotá a los jugadores.', 'info');
      return;
    }

    currentStep = step;
    store.prefs.step = step;
    store.save();

    $$('.screen').forEach((s) => s.classList.toggle('is-active', U.toInt(s.dataset.screen, 0) === step));
    $$('.step').forEach((b) => {
      const n2 = U.toInt(b.dataset.step, 0);
      b.classList.toggle('is-active', n2 === step);
      b.classList.toggle('is-done', n2 < step);
      b.setAttribute('aria-selected', n2 === step ? 'true' : 'false');
    });

    if (step === 3) renderTeams();
    if (step === 4) renderRatings();
    if (step === 5) renderHistory();
    if (!silent) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================================
     Colores de la app
     ============================================================ */
  function renderSkinPicker() {
    const box = $('#skins');
    if (!box) return;
    box.textContent = '';

    HF.skins.list.forEach((skin) => {
      const dots = el('span', { class: 'skin__dots' });
      skin.dots.forEach((color) => {
        const dot = el('i');
        dot.style.background = color;
        dots.appendChild(dot);
      });

      const row = el('button', {
        class: 'skin' + (store.prefs.skin === skin.id ? ' is-on' : ''),
        type: 'button', 'data-skin': skin.id,
      }, [
        dots,
        el('span', { class: 'skin__body' }, [
          el('b', { text: skin.name }),
          el('i', { text: skin.hint }),
        ]),
        icon('i-check', 'skin__check'),
      ]);
      row.style.background = skin.bg;
      box.appendChild(row);
    });
  }

  function setSkin(id) {
    store.prefs.skin = HF.skins.apply(id);
    store.save();
    renderSkinPicker();
  }

  function bindSkins() {
    bind('#btn-skin', 'click', () => {
      renderSkinPicker();
      U.openModal('skin-modal');
    });

    const box = $('#skins');
    if (box) on(box, 'click', '.skin', (_, btn) => setSkin(btn.dataset.skin));
  }

  /* ============================================================
     Modo de armado
     ============================================================ */
  /**
   * Refleja el modo "sin armado de equipos" en toda la interfaz.
   * El paso 3 se esconde y la barra se renumera para que los pasos
   * visibles sigan siendo 1, 2, 3, 4 y no queden huecos.
   */
  function renderModeUI() {
    const skip = !!store.match.skipTeams;

    const toggle = $('#f-skip-teams');
    if (toggle) {
      toggle.checked = skip;
      const wrap = toggle.closest('.switch');
      if (wrap) wrap.classList.toggle('is-on', skip);
    }

    let shown = 0;
    $$('.step').forEach((btn) => {
      const off = skip && U.toInt(btn.dataset.step, 0) === 3;
      btn.classList.toggle('is-off', off);
      if (off) return;
      shown += 1;
      const num = btn.querySelector('.step__n');
      if (num) num.textContent = String(shown);
    });

    const goTeams = $('#btn-goto-teams');
    if (goTeams) {
      const use = goTeams.querySelector('use');
      const label = goTeams.querySelector('span');
      if (use) use.setAttribute('href', skip ? '#i-medal' : '#i-shirt');
      if (label) label.textContent = skip ? 'Ir a puntajes' : 'Armar equipos';
    }

    const note = $('#skip-note');
    if (note) note.hidden = !skip;
  }

  function setSkipTeams(skip) {
    store.commit((m) => { m.skipTeams = !!skip; });
    renderModeUI();
  }

  /* ============================================================
     Pantalla 1 — datos del partido
     ============================================================ */
  function syncSetupForm() {
    const m = store.match;
    const put = (sel, value) => { const node = $(sel); if (node) node.value = value; };
    put('#f-titulo', m.titulo);
    put('#f-lugar', m.lugar);
    put('#f-fecha', m.fecha);
    put('#f-hora', m.hora);
    put('#f-total', m.totalPlayers);
    put('#f-precio', m.precio || '');
    put('#f-teamA', m.teamNames.a);
    put('#f-teamB', m.teamNames.b);
    renderFormatUI();
  }

  function renderFormatUI() {
    const total = store.match.totalPlayers;
    const label = $('#format-label');
    if (label) label.textContent = store.formatLabel;
    $$('#presets button').forEach((b) => b.classList.toggle('is-on', U.toInt(b.dataset.total, 0) === total));
  }

  function bindSetup() {
    const bindText = (sel, key) => {
      bind(sel, 'input', (ev) => {
        const value = ev.target.value;
        store.commit((m) => { m[key] = value; });
      });
    };

    bindText('#f-titulo', 'titulo');
    bindText('#f-lugar', 'lugar');
    bindText('#f-fecha', 'fecha');
    bindText('#f-hora', 'hora');

    bind('#f-precio', 'input', (ev) => {
      store.commit((m) => { m.precio = Math.max(0, U.toInt(ev.target.value, 0)); });
      renderStatus();
    });

    const setTotal = (value) => {
      const total = U.clamp(U.toInt(value, 10), model.MIN_PLAYERS, model.MAX_PLAYERS);
      store.commit((m) => { m.totalPlayers = total; m.teams = null; });
      $('#f-total').value = total;
      renderFormatUI();
      renderStatus();
      renderRoster();
    };

    const presets = $('#presets');
    if (presets) on(presets, 'click', 'button', (_, btn) => setTotal(btn.dataset.total));
    bind('#total-minus', 'click', () => setTotal(store.match.totalPlayers - 1));
    bind('#total-plus', 'click', () => setTotal(store.match.totalPlayers + 1));
    bind('#f-total', 'change', (ev) => setTotal(ev.target.value));

    bind('#f-skip-teams', 'change', (ev) => {
      const skip = !!ev.target.checked;
      setSkipTeams(skip);
      if (skip && currentStep === 3) setStep(4, true);
      U.toast(
        skip ? 'Listo: los equipos se arman en la cancha.' : 'Vuelve el paso de armado de equipos.',
        'info'
      );
    });

    bind('#btn-open-call', 'click', () => {
      setStep(2);
      U.toast('Convocatoria abierta. A sumar gente.', 'check');
    });

    bind('#f-teamA', 'input', (ev) => {
      store.commit((m) => { m.teamNames.a = ev.target.value.slice(0, 16) || 'Claritos'; });
      renderTeams();
    });
    bind('#f-teamB', 'input', (ev) => {
      store.commit((m) => { m.teamNames.b = ev.target.value.slice(0, 16) || 'Oscuritos'; });
      renderTeams();
    });
  }

  /* ============================================================
     Pantalla 2 — convocatoria
     ============================================================ */
  function renderStatus() {
    const m = store.match;
    const total = m.totalPlayers;
    const count = m.players.length;
    const missing = store.missing;

    const card = $('#status-card');
    card.classList.toggle('is-full', missing === 0);
    card.classList.toggle('is-over', missing < 0);

    const kicker = $('#status-kicker');
    const headline = $('#status-headline');
    headline.textContent = '';

    if (missing > 0) {
      kicker.textContent = 'Convocatoria abierta';
      headline.append('FALTAN ', el('em', { text: String(missing) }), missing === 1 ? ' JUGADOR' : ' JUGADORES');
    } else if (missing === 0) {
      kicker.textContent = 'Cupo completo';
      headline.append(el('em', { text: '¡ESTAMOS TODOS!' }));
    } else {
      kicker.textContent = 'Con suplentes';
      headline.append('COMPLETO ', el('em', { text: `+${Math.abs(missing)}` }));
    }

    $('#count-in').textContent = count;
    $('#count-total').textContent = total;
    $('#bar-fill').style.width = Math.min(100, Math.round((count / Math.max(1, total)) * 100)) + '%';
    $('#roster-badge').textContent = count === 1 ? '1 anotado' : count + ' anotados';

    const meta = $('#status-meta');
    meta.textContent = '';
    const chips = [];
    if (m.fecha) chips.push(U.formatDateShort(m.fecha));
    if (m.hora) chips.push(U.formatTime(m.hora) + ' hs');
    if (m.lugar) chips.push(m.lugar);
    if (m.precio > 0) chips.push(U.money(m.precio) + ' por persona');
    chips.forEach((c) => meta.appendChild(el('span', { text: c })));
  }

  function posSelect(player) {
    const select = el('select', { class: 'pl__sel', 'data-field': 'pos', 'aria-label': 'Posición' });
    model.POSITIONS.forEach((pos) => {
      const opt = el('option', { value: pos, text: model.POS_LABEL[pos] });
      if (pos === player.pos) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }

  /** Sugerencias del input de nombre, sacadas de los partidos anteriores. */
  function renderKnownNames() {
    const list = $('#known-names');
    if (!list) return;
    list.textContent = '';
    const anotados = new Set(store.match.players.map((p) => U.normalize(p.name)));
    store.knownPlayers()
      .filter((p) => !anotados.has(p.key))
      .slice(0, 60)
      .forEach((p) => list.appendChild(el('option', { value: p.name })));
  }

  /** Suma de un saque a los habituales que falten, hasta llenar el cupo. */
  function addRegulars() {
    const known = store.knownPlayers();
    const anotados = new Set(store.match.players.map((p) => U.normalize(p.name)));
    const pendientes = known.filter((p) => !anotados.has(p.key));

    if (!pendientes.length) {
      U.toast(known.length ? 'Ya están todos los habituales.' : 'Todavía no hay partidos guardados.', 'info');
      return;
    }

    const lugares = store.match.totalPlayers - store.match.players.length;
    if (lugares <= 0) {
      U.toast('No queda cupo libre.', 'info');
      return;
    }

    let added = 0;
    for (const p of pendientes) {
      if (added >= lugares) break;
      if (store.addPlayer(p.name, p.pos).ok) added++;
    }

    refreshAll();
    U.toast(`Se sumaron ${added} de los de siempre.`, 'check');
    if (store.missing === 0) U.confetti();
  }

  function renderRoster() {
    const box = $('#roster');
    box.textContent = '';
    const m = store.match;

    if (!m.players.length) {
      box.appendChild(
        el('div', { class: 'empty' }, [icon('i-users'), el('span', { text: 'Todavía no hay nadie anotado. Sumá al primero.' })])
      );
      return;
    }

    m.players.forEach((player, index) => {
      const isSub = index >= m.totalPlayers;
      const row = el('div', { class: 'pl' + (isSub ? ' is-sub' : ''), 'data-id': player.id }, [
        el('span', { class: 'pl__n', text: String(index + 1) }),
        el('div', { class: 'pl__body' }, [
          el('div', { class: 'pl__name', text: player.name }),
          el('div', { class: 'pl__meta' }, [
            posSelect(player),
            isSub ? el('span', { class: 'pl__tag pl__tag--sub', text: 'SUPLENTE' }) : null,
          ]),
        ]),
        el('button', {
          class: 'pl__pay' + (player.paid ? ' is-paid' : ''),
          'data-act': 'pay',
          title: player.paid ? 'Pagó' : 'Marcar como pagado',
          'aria-label': 'Pago',
        }, [icon('i-money')]),
        el('button', { class: 'pl__del', 'data-act': 'del', 'aria-label': 'Quitar' }, [icon('i-trash')]),
      ]);
      box.appendChild(row);
    });
  }

  function bindRoster() {
    bind('#form-player', 'submit', (ev) => {
      ev.preventDefault();
      const input = $('#f-nombre');
      const result = store.addPlayer(input.value, $('#f-pos').value);

      if (!result.ok) {
        if (result.reason === 'dup') U.toast('Ese nombre ya está en la lista.', 'info');
        else if (result.reason === 'max') U.toast('Llegaste al máximo de jugadores.', 'info');
        return;
      }

      input.value = '';
      input.focus();
      refreshAll();

      if (store.missing === 0) {
        U.confetti();
        U.toast('¡Lista completa! Estamos todos.', 'check');
      } else if (result.isSub) {
        U.toast(`${result.player.name} entra como suplente.`, 'info');
      }
    });

    const roster = $('#roster');
    if (!roster) return;
    on(roster, 'click', '[data-act]', (_, btn) => {
      const id = btn.closest('.pl').dataset.id;
      if (btn.dataset.act === 'del') {
        store.removePlayer(id);
        refreshAll();
      } else if (btn.dataset.act === 'pay') {
        const player = store.playerById(id);
        if (player) store.updatePlayer(id, { paid: !player.paid });
        refreshAll();
      }
    });

    on(roster, 'change', '.pl__sel', (_, select) => {
      const id = select.closest('.pl').dataset.id;
      store.updatePlayer(id, { pos: select.value });
      renderTeams();
    });

    bind('#btn-clear', 'click', () => {
      if (!store.match.players.length) return;
      U.confirmDialog('Vaciar la lista', 'Se van a borrar todos los jugadores anotados de este partido.', () => {
        store.clearPlayers();
        refreshAll();
        U.toast('Lista vaciada.', 'info');
      });
    });

    bind('#btn-regulars', 'click', addRegulars);
    bind('#btn-paste', 'click', () => U.openModal('paste-modal'));
    bind('#btn-paste-ok', 'click', processPaste);
    bind('#btn-copy-wa', 'click', () => copyToClipboard(buildCallText(), 'Texto copiado. Pegalo en el grupo.'));
    bind('#btn-copy-link', 'click', () =>
      copyToClipboard(model.buildShareLink(store.match), 'Link copiado. El que lo abra ve la misma lista.')
    );
    bind('#btn-goto-teams', 'click', () => setStep(3));
    bind('#btn-flyer-call', 'click', () => openFlyer('call'));
  }

  /** Extrae nombres de un mensaje de WhatsApp pegado. */
  function processPaste() {
    const area = $('#paste-text');
    const raw = area.value || '';
    U.closeModal('paste-modal');
    area.value = '';

    const noise = /^(lista|partido|cancha|hora|horario|fecha|faltan|anotados|suplentes|equipo|jugadores|convocatoria|se juega|confirmados?)\b/i;
    let added = 0;
    let skipped = 0;

    raw.split(/\r?\n/).forEach((line) => {
      let name = line
        .replace(/^\s*[\d]{1,2}\s*[.)\-–:]\s*/, '')
        .replace(/^\s*[•*\-–]\s*/, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\d{1,2}:\d{2}\s*(a\.?m\.?|p\.?m\.?)?/gi, '')
        .replace(/[^\p{L}\p{N}\s'.\-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (name.length < 2 || name.length > 22) return;
      if (noise.test(name)) return;

      const result = store.addPlayer(name, 'COM');
      if (result.ok) added++;
      else skipped++;
    });

    refreshAll();
    if (added) {
      U.toast(`Se sumaron ${added} jugador${added === 1 ? '' : 'es'}${skipped ? ` (${skipped} repetidos)` : ''}.`, 'check');
      if (store.missing === 0) U.confetti();
    } else {
      U.toast('No se detectaron nombres nuevos.', 'info');
    }
  }

  /* ============================================================
     Pantalla 3 — equipos
     ============================================================ */
  function renderTeams() {
    const box = $('#teams');
    box.textContent = '';
    const m = store.match;
    const badge = $('#balance-badge');

    const hint = $('#skip-hint');
    if (hint) hint.hidden = !!m.teams;

    if (!m.teams) {
      badge.textContent = 'Sin armar';
      box.appendChild(
        el('div', { class: 'empty' }, [icon('i-shirt'), el('span', { text: 'Todavía no balanceaste los equipos.' })])
      );
      return;
    }

    const teamOf = (ids) => ids.map((id) => store.playerById(id)).filter(Boolean);
    const listA = teamOf(m.teams.a);
    const listB = teamOf(m.teams.b);
    const sumA = HF.teams.sumLevel(listA);
    const sumB = HF.teams.sumLevel(listB);
    badge.textContent = HF.teams.qualityLabel(Math.abs(sumA - sumB));

    box.appendChild(teamCard('a', m.teamNames.a, listA, sumA));
    box.appendChild(teamCard('b', m.teamNames.b, listB, sumB));
  }

  function teamCard(side, name, list, sum) {
    const rows = list.map((player, i) =>
      el('div', { class: 'pl', 'data-id': player.id }, [
        el('span', { class: 'pl__n', text: String(i + 1) }),
        el('span', { class: 'pl__name', text: player.name }),
        el('span', { class: 'pl__tag pl__tag--' + player.pos, text: player.pos }),
        el('span', { class: 'pl__tag', text: 'N' + player.level }),
        el('button', { class: 'pl__del', 'data-act': 'move', 'aria-label': 'Cambiar de equipo' }, [icon('i-swap')]),
      ])
    );

    return el('div', { class: 'team team--' + side }, [
      el('div', { class: 'team__head' }, [
        el('h3', { class: 'team__name', text: name.toUpperCase() }),
        el('div', { class: 'team__stat' }, [el('b', { text: String(sum) }), 'nivel · ' + list.length + ' jug.']),
      ]),
      el('div', { class: 'team__list' }, rows.length ? rows : [el('div', { class: 'empty', text: 'Sin jugadores' })]),
    ]);
  }

  function bindTeams() {
    bind('#btn-balance', 'click', () => {
      const starters = store.starters;
      if (starters.length < 2) {
        U.toast('Necesitás al menos 2 titulares.', 'info');
        return;
      }
      const result = HF.teams.balance(starters);
      store.commit((m) => { m.teams = { a: result.a, b: result.b }; });
      renderTeams();
      U.toast(`Equipos armados · ${HF.teams.qualityLabel(result.diff)} (dif. ${result.diff}).`, 'check');
    });

    on($('#teams'), 'click', '[data-act="move"]', (_, btn) => {
      const id = btn.closest('.pl').dataset.id;
      store.commit((m) => { m.teams = HF.teams.movePlayer(m.teams, id); });
      renderTeams();
    });

    bind('#btn-skip-teams', 'click', () => {
      setSkipTeams(true);
      setStep(4);
      U.toast('Listo: los equipos se arman en la cancha. Lo cambiás desde Partido.', 'check');
    });

    bind('#btn-goto-ratings', 'click', () => setStep(4));

    bind('#btn-flyer-teams', 'click', () => {
      if (!store.match.teams) {
        U.toast('Primero balanceá los equipos.', 'info');
        return;
      }
      openFlyer('teams');
    });

    bind('#btn-copy-teams', 'click', () => {
      if (!store.match.teams) {
        U.toast('Primero balanceá los equipos.', 'info');
        return;
      }
      copyToClipboard(buildTeamsText(), 'Equipos copiados.');
    });
  }

  /* ============================================================
     Pantalla 4 — resultado
     ============================================================ */
  function renderRatings() {
    const box = $('#ratings');
    box.textContent = '';
    const m = store.match;
    const mvp = store.mvp;
    $('#mvp-badge').textContent = mvp ? 'Figura: ' + mvp.name : 'Sin figura';

    if (!m.players.length) {
      box.appendChild(el('div', { class: 'empty' }, [icon('i-users'), el('span', { text: 'No hay jugadores para calificar.' })]));
      return;
    }

    m.players.forEach((player) => {
      const isMvp = m.mvpId === player.id;
      const scoreEl = el('button', {
        class: 'rt__score', type: 'button', 'data-act': 'quarter',
        title: 'Tocá para sumar un cuarto de punto',
        'aria-label': 'Sumar un cuarto de punto a ' + player.name,
        text: U.formatScore(player.score) + '/10',
      });
      const range = el('input', {
        type: 'range', min: 1, max: 10, step: model.SCORE_STEP,
        value: player.score, 'aria-label': 'Puntaje de ' + player.name,
      });

      const paintScore = (value) => {
        scoreEl.textContent = U.formatScore(value) + '/10';
        range.value = value;
        store.updatePlayer(player.id, { score: value });
        $('#mvp-badge').textContent = store.mvp ? 'Figura: ' + store.mvp.name : 'Sin figura';
      };

      range.addEventListener('input', () => {
        paintScore(U.clamp(U.toQuarter(range.value, 7), 1, 10));
      });

      scoreEl.addEventListener('click', () => {
        const actual = store.playerById(player.id);
        if (!actual) return;
        const entero = Math.floor(actual.score);
        const cuarto = (Math.round((actual.score - entero) * 4) + 1) % 4;
        paintScore(U.clamp(entero + cuarto / 4, 1, 10));
      });

      box.appendChild(
        el('div', { class: 'rt' + (isMvp ? ' is-mvp' : ''), 'data-id': player.id }, [
          el('div', { class: 'rt__top' }, [
            el('span', { class: 'rt__name', text: player.name }),
            el('span', { class: 'pl__tag pl__tag--' + player.pos, text: player.pos }),
            scoreEl,
          ]),
          el('div', { class: 'rt__bottom' }, [
            range,
            el('div', { class: 'rt__goals' }, [
              el('button', { type: 'button', 'data-goal': '-1', 'aria-label': 'Menos goles' }, [icon('i-minus')]),
              el('b', { text: String(player.goals) }),
              el('button', { type: 'button', 'data-goal': '1', 'aria-label': 'Más goles' }, [icon('i-plus')]),
            ]),
            el('button', {
              class: 'rt__crown' + (isMvp ? ' is-on' : ''), 'data-act': 'mvp',
              title: 'Elegir como figura', 'aria-label': 'Elegir figura',
            }, [icon('i-medal')]),
          ]),
        ])
      );
    });
  }

  function bindResult() {
    on($('#ratings'), 'click', '[data-goal]', (_, btn) => {
      const id = btn.closest('.rt').dataset.id;
      const player = store.playerById(id);
      if (!player) return;
      store.updatePlayer(id, { goals: U.clamp(player.goals + U.toInt(btn.dataset.goal, 0), 0, 99) });
      btn.parentElement.querySelector('b').textContent = store.playerById(id).goals;
    });

    on($('#ratings'), 'click', '[data-act="mvp"]', (_, btn) => {
      const id = btn.closest('.rt').dataset.id;
      store.commit((m) => { m.mvpId = m.mvpId === id ? null : id; });
      renderRatings();
    });

    bind('#btn-enable-teams', 'click', () => {
      setSkipTeams(false);
      setStep(3);
    });

    bind('#btn-flyer-mvp', 'click', () => {
      if (!store.mvp) {
        U.toast('Cargá jugadores para elegir la figura.', 'info');
        return;
      }
      openFlyer('mvp');
    });
    bind('#btn-save-history', 'click', saveMatchToHistory);
  }

  function saveMatchToHistory() {
    const m = store.match;
    if (!m.players.length) {
      U.toast('No hay nada para guardar.', 'info');
      return;
    }
    const mvp = store.mvp;
    store.pushHistory({
      id: U.uid('h'),
      date: m.fecha,
      titulo: m.titulo || 'Picado',
      lugar: m.lugar,
      teamNames: { a: m.teamNames.a, b: m.teamNames.b },
      mvpName: mvp ? mvp.name : '',
      savedAt: Date.now(),
      players: m.players.map((p) => ({
        name: p.name, pos: p.pos, score: p.score, goals: p.goals, mvp: !!(mvp && mvp.id === p.id),
      })),
    });

    U.confetti();
    U.toast('Partido guardado en el historial.', 'check');
    renderHistory();
    setStep(5);
  }

  /* ============================================================
     Pantalla 5 — historial
     ============================================================ */
  function renderHistory() {
    const rankBox = $('#history-rank');
    const listBox = $('#history-list');
    rankBox.textContent = '';
    listBox.textContent = '';
    $('#history-badge').textContent = store.history.length === 1 ? '1 partido' : store.history.length + ' partidos';

    const ranking = store.rankingHistorico();
    if (!ranking.length) {
      rankBox.appendChild(el('div', { class: 'empty' }, [icon('i-chart'), el('span', { text: 'Guardá tu primer partido para ver el ranking.' })]));
    } else {
      ranking.slice(0, 15).forEach((row, i) => {
        rankBox.appendChild(
          el('div', { class: 'rk' }, [
            el('span', { class: 'rk__pos', text: String(i + 1) }),
            el('span', { class: 'rk__name', text: row.name }),
            el('span', { class: 'rk__meta' }, [
              el('b', { text: U.formatScore(Math.round(row.avg * 100) / 100) }),
              `${row.games} PJ · ${row.goals} G${row.mvps ? ' · ' + row.mvps + ' MVP' : ''}`,
            ]),
          ])
        );
      });
    }

    if (!store.history.length) {
      listBox.appendChild(el('div', { class: 'empty' }, [icon('i-cal'), el('span', { text: 'Sin partidos guardados.' })]));
      return;
    }

    store.history.forEach((match) => {
      listBox.appendChild(
        el('div', { class: 'hs' }, [
          el('div', {}, [
            el('div', { class: 'hs__t', text: match.titulo || 'Picado' }),
            el('div', {
              class: 'hs__s',
              text: [U.formatDateShort(match.date), match.lugar, match.mvpName ? 'Figura: ' + match.mvpName : '']
                .filter(Boolean).join(' · '),
            }),
          ]),
          el('span', { class: 'hs__r', text: `${(match.players || []).length} jug.` }),
        ])
      );
    });
  }

  function bindHistory() {
    bind('#btn-clear-history', 'click', () => {
      if (!store.history.length) return;
      U.confirmDialog('Borrar historial', 'Se pierden todos los partidos guardados y el ranking histórico.', () => {
        store.clearHistory();
        renderHistory();
        U.toast('Historial borrado.', 'info');
      });
    });

    bind('#btn-reset', 'click', () => {
      U.confirmDialog('Nuevo partido', 'Arranca una convocatoria en blanco. Se mantienen la cancha, el formato y el historial.', () => {
        store.reset(true);
        syncSetupForm();
        refreshAll();
        setStep(1);
        U.toast('Partido nuevo listo.', 'check');
      });
    });
  }

  /* ============================================================
     Textos para compartir
     ============================================================ */
  function buildCallText() {
    const m = store.match;
    const missing = store.missing;
    const lines = [];

    lines.push(`⚽ *${(m.titulo || 'PICADO').toUpperCase()}*`);
    if (m.lugar) lines.push(`📍 ${m.lugar}`);
    const when = [U.formatDateLong(m.fecha), m.hora ? U.formatTime(m.hora) + ' hs' : ''].filter(Boolean).join(' · ');
    if (when) lines.push(`🗓️ ${when}`);
    if (m.precio > 0) lines.push(`💵 ${U.money(m.precio)} por persona`);
    lines.push('');
    lines.push(missing > 0 ? `⚠️ *FALTAN ${missing}* para completar los ${m.totalPlayers}` : '🔥 *¡ESTAMOS TODOS!*');
    lines.push('');

    const slots = Math.max(m.totalPlayers, m.players.length);
    for (let i = 0; i < slots; i++) {
      const player = m.players[i];
      const tag = i >= m.totalPlayers ? ' _(suplente)_' : '';
      lines.push(`${i + 1}. ${player ? player.name + tag : '_______'}`);
    }

    lines.push('');
    lines.push('📲 Armado con Hay Fulbo');
    return lines.join('\n');
  }

  function buildTeamsText() {
    const m = store.match;
    const name = (id) => {
      const player = store.playerById(id);
      return player ? player.name : '';
    };
    const lines = [`⚽ *FORMACIONES · ${(m.titulo || 'PICADO').toUpperCase()}*`, ''];

    [['a', m.teamNames.a], ['b', m.teamNames.b]].forEach(([side, label]) => {
      lines.push(`*${label.toUpperCase()}*`);
      m.teams[side].forEach((id, i) => lines.push(`${i + 1}. ${name(id)}`));
      lines.push('');
    });

    if (m.lugar) lines.push(`📍 ${m.lugar}`);
    const when = [U.formatDateLong(m.fecha), m.hora ? U.formatTime(m.hora) + ' hs' : ''].filter(Boolean).join(' · ');
    if (when) lines.push(`🗓️ ${when}`);
    lines.push('📲 Armado con Hay Fulbo');
    return lines.join('\n');
  }

  async function copyToClipboard(text, okMessage) {
    const ok = await U.copyText(text);
    U.toast(ok ? okMessage : 'No se pudo copiar. Copialo a mano.', ok ? 'check' : 'error');
  }

  /* ============================================================
     Modal de flyers
     ============================================================ */
  function renderThemePicker() {
    const box = $('#themes');
    box.textContent = '';
    HF.themes.list.forEach((theme) => {
      const dot = el('span', { class: 'th__dot' });
      dot.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`;
      const btn = el('button', {
        class: 'th' + (store.prefs.theme === theme.id ? ' is-on' : ''),
        'data-theme': theme.id, type: 'button',
      }, [dot, el('span', { text: theme.name })]);
      box.appendChild(btn);
    });
  }

  async function drawFlyer() {
    const canvas = $('#flyer-canvas');
    try {
      await HF.flyers.render(currentFlyer, canvas, store, store.prefs.theme);
    } catch (err) {
      console.error('[hayfulbo] error al dibujar el flyer', err);
      U.toast('No se pudo generar el flyer.', 'error');
    }
  }

  async function openFlyer(kind) {
    currentFlyer = kind;
    $('#flyer-title').textContent = HF.flyers.meta(kind).title;
    renderThemePicker();
    U.openModal('flyer-modal');
    await drawFlyer();
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  function bindFlyerModal() {
    on($('#themes'), 'click', '.th', async (_, btn) => {
      store.prefs.theme = btn.dataset.theme;
      store.save();
      renderThemePicker();
      await drawFlyer();
    });

    bind('#btn-download', 'click', async () => {
      const blob = await canvasToBlob($('#flyer-canvas'));
      if (!blob) {
        U.toast('No se pudo exportar la imagen.', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = el('a', { href: url, download: HF.flyers.filename(currentFlyer, store.match) });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      U.toast('Flyer descargado en 1080×1920.', 'check');
    });

    bind('#btn-share', 'click', async () => {
      const canvas = $('#flyer-canvas');
      const blob = await canvasToBlob(canvas);
      const filename = HF.flyers.filename(currentFlyer, store.match);
      const text = currentFlyer === 'call' ? buildCallText()
        : currentFlyer === 'teams' ? buildTeamsText()
        : store.match.titulo || 'Hay Fulbo';

      if (blob && navigator.canShare) {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text });
            return;
          } catch (err) {
            if (err && err.name === 'AbortError') return;
          }
        }
      }
      $('#btn-download').click();
      U.toast('Tu navegador no comparte imágenes: te la descargamos.', 'info');
    });
  }

  /* ============================================================
     Bootstrap
     ============================================================ */
  function refreshAll() {
    renderModeUI();
    renderStatus();
    renderRoster();
    renderKnownNames();
    renderFormatUI();
    if (currentStep === 3) renderTeams();
    if (currentStep === 4) renderRatings();
  }

  /** Re-sincroniza toda la interfaz con el estado actual del store. */
  function reload(opts) {
    syncSetupForm();
    refreshAll();
    renderHistory();
    setStep(opts && opts.fromLink ? 2 : currentStep, true);
    if (opts && opts.fromLink) U.toast('Convocatoria cargada desde el link.', 'check');
  }

  /** Corre un paso del arranque aislado: si falla, el resto sigue vivo. */
  function step(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[hayfulbo] error en "' + name + '"', err);
    }
  }

  function init(opts) {
    step('modales', () => { U.initModals(); U.initConfirm(); });
    step('partido', bindSetup);
    step('lista', bindRoster);
    step('equipos', bindTeams);
    step('figura', bindResult);
    step('historial', bindHistory);
    step('flyers', bindFlyerModal);
    step('colores', bindSkins);

    step('navegación', () => {
      const steps = $('#steps');
      if (steps) on(steps, 'click', '.step', (_, btn) => setStep(U.toInt(btn.dataset.step, 1)));
    });

    step('colores guardados', () => {
      store.prefs.skin = HF.skins.apply(store.prefs.skin);
    });

    step('render inicial', () => {
      syncSetupForm();
      refreshAll();
      renderHistory();
    });

    const startStep = opts && opts.fromLink ? 2 : U.clamp(U.toInt(store.prefs.step, 1), 1, 5);
    setStep(store.match.players.length ? startStep : 1, true);

    if (opts && opts.fromLink) U.toast('Convocatoria cargada desde el link.', 'check');

    /* Precarga de tipografías para que el primer flyer salga al toque. */
    HF.kit.loadFonts();
  }

  HF.ui = { init, reload, setStep, refreshAll, openFlyer, buildCallText, buildTeamsText };
})(window);
