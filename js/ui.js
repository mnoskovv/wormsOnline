// DOM-интерфейс: панель оружия (меню и результат добавляются ниже).
(function (W) {
  const A = W.Art;
  const UI = W.UI = W.UI || {};

  // Иконки оружия, нарисованные кодом.
  const ICONS = {
    bazooka(c) {
      c.rotate(-0.5);
      A.shape(c, x => x.roundRect(-20, -6, 40, 12, 4), '#5f7d3a', '#1d1d1d', 3);
      A.shape(c, x => x.rect(-4, 6, 6, 9), '#5a3a16', '#1d1d1d', 2);
      A.shape(c, x => { x.moveTo(20, -6); x.lineTo(26, -9); x.lineTo(26, 9); x.lineTo(20, 6); x.closePath(); }, '#d23b3b', '#1d1d1d', 2);
    },
    grenade(c) {
      A.shape(c, x => x.ellipse(0, 4, 13, 15, 0, 0, Math.PI * 2), '#4f7f2a', '#1f330f', 3);
      A.shape(c, x => x.rect(-5, -16, 10, 7), '#999', '#222', 2);
      A.shape(c, x => { x.moveTo(5, -13); x.quadraticCurveTo(16, -18, 14, -6); }, 'rgba(0,0,0,0)', '#999', 3);
    },
    mortar(c) {
      c.rotate(-0.8);
      A.shape(c, x => x.roundRect(-16, -8, 34, 16, 5), '#555a66', '#111', 3);
      A.shape(c, x => x.ellipse(-16, 0, 5, 8, 0, 0, Math.PI * 2), '#333', '#111', 2);
      A.shape(c, x => A.circles(x, [[24, 0, 5]]), '#3a3a44', '#111', 2);
    },
    shotgun(c) {
      c.rotate(-0.3);
      A.shape(c, x => x.roundRect(-22, -4, 44, 7, 3), '#3d3d44', '#111', 2.5);
      A.shape(c, x => { x.moveTo(-22, -3); x.lineTo(-10, -3); x.lineTo(-14, 12); x.lineTo(-24, 12); x.closePath(); }, '#8a5a2b', '#111', 2.5);
    },
    sniper(c) {
      c.rotate(-0.25);
      A.shape(c, x => x.roundRect(-24, -3, 50, 6, 3), '#2f3a2f', '#111', 2.5);
      A.shape(c, x => x.roundRect(-8, -12, 18, 7, 3), '#222', '#111', 2);
      A.shape(c, x => { x.moveTo(-24, -2); x.lineTo(-12, -2); x.lineTo(-16, 11); x.lineTo(-26, 11); x.closePath(); }, '#6b4a2a', '#111', 2.5);
    },
    dynamite(c) {
      for (const dx of [-9, 0, 9]) A.shape(c, x => x.roundRect(dx - 5, -10, 10, 26, 3), '#d8312c', '#4a0e0c', 2.5);
      A.shape(c, x => x.rect(-15, 0, 30, 5), '#3a2a1a', null);
      A.shape(c, x => { x.moveTo(0, -10); x.quadraticCurveTo(8, -18, 4, -22); }, 'rgba(0,0,0,0)', '#3a2a1a', 2.5);
      A.shape(c, x => A.circles(x, [[4, -23, 4]]), '#ffd23f', '#e8731a', 1.5);
    },
    airstrike(c) {
      A.shape(c, x => { x.moveTo(-22, 0); x.quadraticCurveTo(-10, -8, 20, -4); x.quadraticCurveTo(26, 0, 20, 4); x.quadraticCurveTo(-10, 8, -22, 0); }, '#8fa3b8', '#1d2a38', 2.5);
      A.shape(c, x => { x.moveTo(-2, -4); x.lineTo(-10, -18); x.lineTo(-4, -18); x.lineTo(8, -4); x.closePath(); x.moveTo(-2, 4); x.lineTo(-10, 18); x.lineTo(-4, 18); x.lineTo(8, 4); x.closePath(); }, '#7189a3', '#1d2a38', 2);
      A.shape(c, x => { x.moveTo(-22, 0); x.lineTo(-26, -9); x.lineTo(-18, -2); x.closePath(); }, '#d23b3b', '#1d2a38', 2);
    },
    teleport(c) {
      A.shape(c, x => A.circles(x, [[0, 0, 16]]), '#b46bff', '#4a1d7a', 3);
      c.strokeStyle = '#fff';
      c.lineWidth = 3;
      c.beginPath();
      for (let t = 0; t < 12; t += 0.2) {
        const r = t * 1.1;
        const px = Math.cos(t) * r, py = Math.sin(t) * r;
        t === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
    },
  };

  UI.drawWeaponIcon = function (canvas, id) {
    const c = canvas.getContext('2d');
    const s = canvas.width / 56;
    c.setTransform(s, 0, 0, s, canvas.width / 2, canvas.height / 2);
    ICONS[id](c);
  };

  let panel = null, current = null;

  const ammoText = (id, n) => (n === Infinity ? '∞' : `${n}/${W.WEAPONS[id].ammo}`);

  // Окно оружия: сетка плиток, как в Вормиксе, плюс таймер гранаты и пропуск хода.
  function build() {
    panel = document.createElement('div');
    panel.className = 'weapon-panel hidden';
    panel.innerHTML = `
      <div class="wp-card">
        <div class="wp-title">Оружие <span class="wp-close" title="Закрыть">×</span></div>
        <div class="wp-grid"></div>
        <div class="wp-fuse">Таймер гранаты: ${[1, 2, 3, 4, 5].map(n => `<button data-s="${n}">${n} с</button>`).join('')}</div>
        <div class="wp-bottom"><button class="wp-skip">Пропустить ход</button><span class="wp-hint">Tab / ПКМ / Esc — закрыть</span></div>
      </div>`;
    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('contextmenu', e => { e.preventDefault(); UI.weaponPanel.close(); });
    panel.addEventListener('click', e => { if (e.target === panel) UI.weaponPanel.close(); });
    panel.querySelector('.wp-close').addEventListener('click', () => UI.weaponPanel.close());
    for (const id of W.WEAPON_ORDER) {
      const cell = document.createElement('button');
      cell.className = 'wp-cell';
      cell.dataset.id = id;
      const cv = document.createElement('canvas');
      cv.width = cv.height = 56 * 2;
      UI.drawWeaponIcon(cv, id);
      cell.append(cv);
      cell.insertAdjacentHTML('beforeend', `<span class="wp-ammo"></span><span class="wp-name">${W.WEAPONS[id].name}</span>`);
      cell.addEventListener('click', () => {
        if (!current || cell.disabled) return;
        current.input.send({ type: 'select', weapon: id });
        if (W.Sfx) W.Sfx.play('click');
        UI.weaponPanel.close();
      });
      panel.querySelector('.wp-grid').append(cell);
    }
    for (const b of panel.querySelectorAll('.wp-fuse button')) {
      b.addEventListener('click', () => {
        if (!current) return;
        current.input.send({ type: 'fuse', seconds: Number(b.dataset.s) });
        UI.weaponPanel.refresh();
      });
    }
    panel.querySelector('.wp-skip').addEventListener('click', () => {
      if (current) current.input.send({ type: 'skip' });
      UI.weaponPanel.close();
    });
    document.getElementById('ui').append(panel);
  }

  UI.weaponPanel = {
    open(m) {
      if (!panel) build();
      current = m;
      UI.weaponPanel.refresh();
      panel.classList.remove('hidden');
    },
    refresh() {
      if (!panel || !current) return;
      const g = current.game;
      const ammo = g.ammo[g.current];
      for (const cell of panel.querySelectorAll('.wp-cell')) {
        const id = cell.dataset.id;
        cell.querySelector('.wp-ammo').textContent = ammoText(id, ammo[id]);
        cell.disabled = ammo[id] <= 0;
        cell.classList.toggle('selected', g.weapon[g.current] === id);
      }
      for (const b of panel.querySelectorAll('.wp-fuse button')) b.classList.toggle('selected', Number(b.dataset.s) === g.fuse[g.current]);
      panel.style.setProperty('--player', W.PLAYER_COLORS[g.current]);
    },
    close() { if (panel) panel.classList.add('hidden'); },
    isOpen() { return !!panel && !panel.classList.contains('hidden'); },
  };

  // Ящик с текущим оружием в правом верхнем углу: видно, что выбрано, клик — открыть окно.
  let btn = null, shown = '';
  UI.weaponButton = {
    update(m) {
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'weapon-btn hidden';
        btn.innerHTML = '<canvas width="96" height="96"></canvas><span class="wb-text"><b></b><i></i></span><span class="wb-key">Tab / ПКМ</span>';
        btn.addEventListener('mousedown', e => e.stopPropagation());
        btn.addEventListener('click', () => {
          const mm = W.match;
          if (mm && mm.running) { mm.input.togglePanel(); btn.blur(); }
        });
        document.getElementById('ui').append(btn);
      }
      const g = m.game;
      const mine = m.isLocal(g.current) && (g.phase === 'turn' || g.phase === 'retreat');
      const id = g.weapon[g.current];
      const n = g.ammo[g.current][id];
      const key = mine ? `${id}|${n}|${g.fuse[g.current]}|${g.current}` : '';
      if (key === shown) return;
      shown = key;
      btn.classList.toggle('hidden', !mine);
      if (!mine) return;
      const cv = btn.querySelector('canvas');
      cv.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
      cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
      UI.drawWeaponIcon(cv, id);
      btn.querySelector('b').textContent = W.WEAPONS[id].name;
      btn.querySelector('i').textContent = id === 'grenade' ? `таймер ${g.fuse[g.current]} с · ${ammoText(id, n)}` : ammoText(id, n);
      btn.style.setProperty('--player', W.PLAYER_COLORS[g.current]);
    },
    hide() { if (btn) { btn.classList.add('hidden'); shown = ''; } },
  };
})(window.W = window.W || {});

// Главное меню и экран результата.
(function (W) {
  const C = W.CFG;
  const UI = W.UI;
  const MAP_ORDER = ['polyanka', 'halloween', 'pirates', 'mine', 'wildwest'];

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('worms.' + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('worms.' + k, JSON.stringify(v)); } catch (e) { /* без сохранения */ } },
  };

  function preview(map) {
    const cv = document.createElement('canvas');
    cv.width = 320;
    cv.height = 160;
    const ctx = cv.getContext('2d');
    const s = cv.width / C.WORLD_W;
    ctx.scale(s, s);
    map.drawSky(ctx, C.WORLD_W, C.WORLD_H);
    map.drawBackdrop(ctx, C.WORLD_W, C.WORLD_H);
    const art = new W.TerrainArt(map);
    ctx.drawImage(art.canvas, 0, 0);
    ctx.fillStyle = map.waterColor[0];
    ctx.fillRect(0, C.WATER_Y, C.WORLD_W, C.WORLD_H - C.WATER_Y);
    return cv;
  }

  let menu = null, result = null, screen = null;
  UI.store = store;
  UI.MAP_ORDER = MAP_ORDER;

  UI.showMenu = function (onStart, onHost, onJoinCode) {
    UI.hideResult();
    if (screen) screen.classList.add('hidden');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'menu';
      menu.innerHTML = `
        <div class="menu-card">
          <h1 class="logo">Червячки</h1>
          <div class="names">
            <label class="p1">Игрок 1<input maxlength="14" data-i="0"></label>
            <label class="p2">Игрок 2<input maxlength="14" data-i="1"></label>
          </div>
          <div class="menu-sub">Карта</div>
          <div class="maps"></div>
          <div class="modes">
            <button class="btn-start btn-bot">Против компьютера</button>
            <button class="btn-start btn-hotseat">Вдвоём за одним компом</button>
          </div>
          <div class="online">
            <span>По сети:</span>
            <button class="btn-host">Создать игру</button>
            <button class="btn-join">Подключиться</button>
            <input class="code hidden" maxlength="300" placeholder="код или ссылка">
          </div>
          <div class="help">← → ходить · Enter прыжок · Backspace прыжок назад · мышь — прицел · пробел/ЛКМ — выстрел · Tab/ПКМ — оружие · 1–5 — таймер гранаты</div>
        </div>`;
      const maps = menu.querySelector('.maps');
      for (const id of [...MAP_ORDER, 'random']) {
        const card = document.createElement('button');
        card.className = 'map-card';
        card.dataset.id = id;
        if (id === 'random') card.innerHTML = '<div class="map-random">?</div>';
        else card.append(preview(W.MAPS[id]));
        card.insertAdjacentHTML('beforeend', `<span>${id === 'random' ? 'Случайная' : W.MAPS[id].name}</span>`);
        card.addEventListener('click', () => select(id));
        maps.append(card);
      }
      document.getElementById('ui').append(menu);
    }
    const inputs = menu.querySelectorAll('.names input');
    const names = store.get('names', ['Игрок 1', 'Игрок 2']);
    inputs.forEach((inp, i) => { inp.value = names[i]; });
    let chosen = store.get('map', 'random');
    if (chosen !== 'random' && !W.MAPS[chosen]) chosen = 'random';
    function select(id) {
      chosen = id;
      for (const c of menu.querySelectorAll('.map-card')) c.classList.toggle('selected', c.dataset.id === id);
    }
    select(chosen);
    const readNames = () => {
      const n = [...inputs].map((inp, i) => inp.value.trim() || `Игрок ${i + 1}`);
      store.set('names', n);
      store.set('map', chosen);
      return n;
    };
    menu.querySelector('.btn-host').onclick = () => onHost({ mapId: chosen, name: readNames()[0] });
    const code = menu.querySelector('.code');
    code.classList.add('hidden');
    code.value = '';
    const submitCode = () => {
      const v = code.value.trim();
      const m = v.match(/room=([a-z0-9]+)/i);
      const c = (m ? m[1] : v).toLowerCase();
      if (c) { readNames(); onJoinCode(c); }
    };
    menu.querySelector('.btn-join').onclick = () => {
      if (code.classList.contains('hidden')) { code.classList.remove('hidden'); code.focus(); } else submitCode();
    };
    code.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') submitCode(); };
    const start = (bot) => {
      const n = readNames();
      menu.classList.add('hidden');
      const mapId = chosen === 'random' ? MAP_ORDER[Math.floor(Math.random() * MAP_ORDER.length)] : chosen;
      onStart({ mapId, names: bot ? [n[0], 'Компьютер'] : n, bot });
    };
    menu.querySelector('.btn-hotseat').onclick = () => start(false);
    menu.querySelector('.btn-bot').onclick = () => start(true);
    menu.classList.remove('hidden');
  };

  UI.showResult = function (winnerName, color, onAgain, onMenu) {
    if (!result) {
      result = document.createElement('div');
      result.className = 'result';
      result.innerHTML = '<div class="result-card"><div class="result-title"></div><button class="btn-again">Ещё раз</button><button class="btn-menu">В меню</button></div>';
      document.getElementById('ui').append(result);
    }
    const title = result.querySelector('.result-title');
    title.textContent = winnerName ? `Победил ${winnerName}!` : 'Ничья!';
    title.style.color = color;
    result.querySelector('.btn-again').onclick = () => { UI.hideResult(); onAgain(); };
    result.querySelector('.btn-menu').onclick = () => { UI.hideResult(); onMenu(); };
    result.classList.remove('hidden');
  };

  UI.hideResult = function () { if (result) result.classList.add('hidden'); };

  // Экран-карточка поверх неба: лобби, вход по ссылке, сообщения.
  function showScreen(build) {
    UI.hideResult();
    if (menu) menu.classList.add('hidden');
    if (!screen) {
      screen = document.createElement('div');
      screen.className = 'menu screen';
      document.getElementById('ui').append(screen);
    }
    screen.innerHTML = '<div class="menu-card screen-card"><h1 class="logo">Червячки</h1></div>';
    build(screen.firstChild);
    screen.classList.remove('hidden');
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  UI.hideScreens = function () {
    UI.hideResult();
    if (screen) screen.classList.add('hidden');
    if (menu) menu.classList.add('hidden');
  };

  UI.showLobby = function (link, onCancel) {
    showScreen(card => {
      card.append(el('div', 'screen-text', 'Отправь ссылку сопернику:'));
      const inp = el('input', 'link');
      inp.value = link;
      inp.readOnly = true;
      inp.onclick = () => inp.select();
      const copy = el('button', 'btn-start', 'Скопировать ссылку');
      copy.onclick = () => {
        navigator.clipboard.writeText(link).then(() => { copy.textContent = 'Скопировано!'; },
          () => { inp.focus(); inp.select(); });
      };
      const cancel = el('button', 'btn-menu', 'Отмена');
      cancel.onclick = onCancel;
      card.append(inp, el('div', 'screen-wait', 'Ждём соперника…'), copy, cancel);
    });
  };

  UI.showJoin = function (code, defaultName, onConnect, onMenu) {
    showScreen(card => {
      card.append(el('div', 'screen-text', `Комната ${code}. Как тебя зовут?`));
      const inp = el('input', 'link');
      inp.maxLength = 14;
      inp.value = defaultName;
      const go = el('button', 'btn-start', 'В бой!');
      const submit = () => onConnect(inp.value.trim() || 'Игрок 2');
      go.onclick = submit;
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') submit(); };
      const back = el('button', 'btn-menu', 'В меню');
      back.onclick = onMenu;
      card.append(inp, el('br'), go, back);
      setTimeout(() => inp.focus(), 0);
    });
  };

  // onMenu = null — без кнопки (ждём чего-то от соперника).
  UI.showNotice = function (text, onMenu, buttonText = 'В меню') {
    showScreen(card => {
      card.append(el('div', 'screen-wait', text));
      if (onMenu) {
        const b = el('button', 'btn-menu', buttonText);
        b.onclick = onMenu;
        card.append(b);
      }
    });
  };
})(window.W = window.W || {});

// Кнопка звука в углу.
(function (W) {
  const btn = document.createElement('button');
  btn.className = 'mute';
  const sync = () => { btn.textContent = W.Sfx.isMuted() ? '🔇' : '🔊'; };
  btn.addEventListener('mousedown', e => e.stopPropagation());
  btn.addEventListener('click', () => { W.Sfx.setMuted(!W.Sfx.isMuted()); sync(); btn.blur(); });
  sync();
  document.getElementById('ui').append(btn);
})(window.W = window.W || {});
