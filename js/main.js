// Сборка: игра + карта + рендер + ввод + эффекты, игровой цикл.
(function (W) {
  const C = W.CFG;
  let match = null;

  function spawnEffects(m, e) {
    const fx = m.effects;
    const map = m.map;
    switch (e.type) {
      case 'explosion':
        m.art.carve(e.x, e.y, e.r);
        if (e.bullet) {
          for (let i = 0; i < 4; i++) fx.push(particle(e.x, e.y, map.dirtColors, 60, 2));
          fx.push({ type: 'smoke', x: e.x, y: e.y, size: 5, t: 0, life: 0.5 });
          break;
        }
        fx.push({ type: 'blast', x: e.x, y: e.y, r: e.r, t: 0, life: 0.35 });
        fx.push({ type: 'ring', x: e.x, y: e.y, r: e.r * 1.4, color: '#fff', t: 0, life: 0.3 });
        for (let i = 0; i < 6; i++) fx.push({ type: 'smoke', x: e.x + rnd(-e.r, e.r) / 2, y: e.y + rnd(-e.r, e.r) / 2, size: e.r / 3, t: 0, life: 1 + Math.random() });
        for (let i = 0; i < e.r / 2; i++) fx.push(particle(e.x, e.y, map.dirtColors, e.r * 6, 3 + Math.random() * 3));
        break;
      case 'shot':
        if (e.weapon === 'airstrike') fx.push({ type: 'plane', x: 0, y: 70, dir: e.target.x < C.WORLD_W / 2 ? 1 : -1, t: 0, life: 2.2 });
        break;
      case 'tracer':
        fx.push({ type: 'tracer', x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, life: 0.15 });
        break;
      case 'damage':
        fx.push({ type: 'number', x: e.worm.x, y: e.worm.y - 60, text: `-${e.dmg}`, t: 0, life: 1.4 });
        break;
      case 'fallDamage':
        fx.push({ type: 'number', x: e.worm.x, y: e.worm.y - 60, text: `-${e.amount}`, t: 0, life: 1.4 });
        break;
      case 'teleport':
        for (const p of [e.from, e.to]) {
          fx.push({ type: 'ring', x: p.x, y: p.y, r: 30, color: '#b46bff', t: 0, life: 0.5 });
          for (let i = 0; i < 10; i++) fx.push(particle(p.x, p.y, ['#d9b3ff', '#fff'], 150, 2.5));
        }
        break;
      case 'drown':
      case 'splashProjectile':
        if (e.type === 'splashProjectile' && e.gone) break;
        for (let i = 0; i < 14; i++) {
          const p = particle(e.worm ? e.worm.x : e.x, C.WATER_Y, ['#bfe9ff', '#ffffff'], 200, 3);
          p.vy = -Math.abs(p.vy) - 100;
          fx.push(p);
        }
        break;
      case 'turnStart': {
        const w = m.game.worms[e.player];
        fx.push({ type: 'banner', text: `Ход: ${w.name}`, color: W.PLAYER_COLORS[e.player], t: 0, life: 1.4 });
        m.input.resetHeld();
        break;
      }
      case 'gameover':
        if (W.onGameOver) W.onGameOver(m);
        break;
    }
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function particle(x, y, colors, speed, size) {
    const a = rnd(-Math.PI, 0), s = rnd(speed * 0.3, speed);
    return { type: 'particle', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size,
      color: colors[Math.floor(Math.random() * colors.length)], t: 0, life: rnd(0.6, 1.2), gravity: true };
  }

  function updateEffects(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      e.t += dt;
      if (e.vx !== undefined) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.gravity) e.vy += C.GRAVITY * dt;
      }
      if (e.type === 'smoke') e.y -= 20 * dt;
      if (e.t >= e.life) list.splice(i, 1);
    }
  }

  W.startMatch = function ({ mapId, names }) {
    W.stopMatch();
    const map = W.MAPS[mapId];
    const canvas = document.getElementById('game');
    const renderer = W.renderer || (W.renderer = new W.Renderer(canvas));
    const art = new W.TerrainArt(map);
    const game = W.createGame({ terrain: art.buildTerrain(), spawnXs: map.spawnXs, names,
      seed: Math.floor(Math.random() * 1e9) });
    const m = { map, art, game, renderer, effects: [], mapId, names, running: true };
    m.panel = W.UI && W.UI.weaponPanel;
    // Панель создаётся лениво при первом открытии.
    m.input = new W.Input(canvas, renderer, {
      getGame: () => m.game,
      canControl: () => true, // хотсит: управляет тот, чей ход
      send: (player, cmd) => {
        const ok = W.applyCommand(m.game, player, cmd);
        if (ok && cmd.type === 'fire' && m.panel) m.panel.close();
        return ok;
      },
      onTogglePanel: () => m.panel && (m.panel.isOpen() ? m.panel.close() : m.panel.open(m)),
      isPanelOpen: () => !!(m.panel && m.panel.isOpen()),
    });
    let acc = 0, last = performance.now();
    function frame(now) {
      if (!m.running) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += dt;
      while (acc >= C.DT) {
        W.stepGame(m.game, C.DT);
        acc -= C.DT;
      }
      const events = m.game.events.splice(0);
      for (const e of events) {
        spawnEffects(m, e);
        if (W.onGameEvent) W.onGameEvent(m, e);
      }
      m.input.update(dt);
      if (m.game.phase !== 'turn' && m.panel && m.panel.isOpen()) m.panel.close();
      updateEffects(m.effects, dt);
      renderer.draw(m.game, map, art, { charge: m.input.charge, hoverTarget: m.input.hover, effects: m.effects, hideGameOver: m.resultShown });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    match = m;
    W.match = m;
    return m;
  };

  W.showMenu = function () {
    W.stopMatch();
    W.UI.showMenu(opts => W.startMatch(opts));
  };

  W.onGameOver = function (m) {
    setTimeout(() => {
      if (!m.running) return;
      m.resultShown = true;
      const g = m.game;
      const draw = g.winner === 'draw';
      W.UI.showResult(draw ? null : g.worms[g.winner].name, draw ? '#5a6b8c' : W.PLAYER_COLORS[g.winner],
        () => W.startMatch({ mapId: m.mapId, names: m.names }),
        () => W.showMenu());
    }, 1500);
  };

  W.stopMatch = function () {
    if (!match) return;
    match.running = false;
    match.input.destroy();
    if (match.panel) match.panel.close();
    match = null;
  };
})(window.W = window.W || {});
