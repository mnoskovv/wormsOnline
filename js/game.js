// Матч: ходы, таймеры, команды, победа. Управляется только командами.
(function (W) {
  const C = W.CFG;
  const SETTLE_LIMIT = 15;

  function placeOnSurface(terrain, x) {
    for (let y = C.WORM_R; y < C.WATER_Y; y++) {
      if (!terrain.circleHitsSolid(x, y, C.WORM_R) && terrain.circleHitsSolid(x, y + 1, C.WORM_R)) return y;
    }
    return C.WORM_R;
  }

  function rollWind(game) {
    return Math.floor(game.rng() * (2 * C.WIND_MAX + 1)) - C.WIND_MAX;
  }

  W.createGame = function ({ terrain, spawnXs, names, seed }) {
    const worms = spawnXs.map((x, i) => {
      const y = placeOnSurface(terrain, x);
      const w = W.makeWorm(i, names[i], x, y);
      w.grounded = terrain.circleHitsSolid(x, y + 1, C.WORM_R);
      w.facing = x < C.WORLD_W / 2 ? 1 : -1;
      return w;
    });
    const game = {
      terrain, worms, projectiles: [], events: [], rng: W.rng(seed), seed,
      current: 0, phase: 'turn', turnTime: C.TURN_TIME, retreatTime: C.RETREAT_TIME,
      settleTime: 0, wind: 0, ammo: [W.initialAmmo(), W.initialAmmo()],
      weapon: ['bazooka', 'bazooka'], fuse: [3, 3], walkDir: 0, winner: null, turnNumber: 1,
    };
    game.current = game.rng() < 0.5 ? 0 : 1;
    game.wind = rollWind(game);
    game.events.push({ type: 'turnStart', player: game.current });
    return game;
  };

  // Угол прицела относительно взгляда ↔ абсолютный угол.
  W.absoluteAim = (worm) => (worm.facing === 1 ? worm.aim : Math.PI - worm.aim);

  // Прицел стрелками: dir −1 — выше, +1 — ниже. Возвращает новый абсолютный угол для команды 'aim'.
  // Чуть не доходим до вертикали, чтобы червяк не развернулся.
  const AIM_LIMIT = Math.PI / 2 - 1e-7;
  W.aimStep = function (worm, dir, dt) {
    const rel = W.clamp(worm.aim + dir * C.AIM_SPEED * dt, -AIM_LIMIT, AIM_LIMIT);
    return worm.facing === 1 ? rel : Math.PI - rel;
  };

  function setAim(worm, angle) {
    const facing = Math.cos(angle) >= 0 ? 1 : -1;
    let rel = facing === 1 ? angle : Math.PI - angle;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    worm.facing = facing;
    worm.aim = W.clamp(rel, -Math.PI / 2, Math.PI / 2);
  }

  function endTurn(game) {
    game.phase = 'settling';
    game.walkDir = 0;
    game.settleTime = 0;
  }

  W.applyCommand = function (game, player, cmd) {
    if (player !== game.current) return false;
    const inTurn = game.phase === 'turn';
    const inRetreat = game.phase === 'retreat';
    if (!inTurn && !inRetreat) return false;
    const worm = game.worms[player];
    if (worm.dead) return false;
    switch (cmd.type) {
      case 'walk':
        if (![-1, 0, 1].includes(cmd.dir)) return false;
        game.walkDir = cmd.dir;
        return true;
      case 'jump':
        if (worm.grounded) game.events.push({ type: 'jump', worm });
        W.jumpWorm(worm, !!cmd.back);
        return true;
      case 'aim':
        if (typeof cmd.angle !== 'number' || !isFinite(cmd.angle)) return false;
        setAim(worm, cmd.angle);
        return true;
      case 'select':
        if (!inTurn || !W.WEAPONS[cmd.weapon]) return false;
        game.weapon[player] = cmd.weapon;
        return true;
      case 'fuse':
        if (!inTurn || ![1, 2, 3, 4, 5].includes(cmd.seconds)) return false;
        game.fuse[player] = cmd.seconds;
        return true;
      case 'fire': {
        if (!inTurn) return false;
        const ok = W.fireWeapon(game, worm, {
          weapon: game.weapon[player], angle: W.absoluteAim(worm),
          power: W.clamp(cmd.power || 0, 0, 1), target: cmd.target,
        });
        if (!ok) return false;
        game.phase = 'retreat';
        game.retreatTime = C.RETREAT_TIME;
        return true;
      }
      case 'skip':
        if (!inTurn) return false;
        endTurn(game);
        return true;
    }
    return false;
  };

  function allResting(game) {
    return game.projectiles.length === 0 && game.worms.every(W.isWormResting);
  }

  function resolve(game) {
    const alive = game.worms.filter(w => !w.dead);
    if (alive.length === 0) game.winner = 'draw';
    else if (alive.length === 1) game.winner = alive[0].id;
    if (game.winner !== null) {
      game.phase = 'gameover';
      game.events.push({ type: 'gameover', winner: game.winner });
      return;
    }
    game.current = 1 - game.current;
    game.wind = rollWind(game);
    game.turnTime = C.TURN_TIME;
    game.retreatTime = C.RETREAT_TIME;
    game.walkDir = 0;
    game.phase = 'turn';
    game.turnNumber++;
    game.events.push({ type: 'turnStart', player: game.current });
  }

  // Снимок для сети: только данные, без ссылок на объекты. Infinity в запасе → -1.
  const GAME_FIELDS = ['current', 'phase', 'turnTime', 'retreatTime', 'settleTime', 'wind', 'weapon', 'fuse',
    'walkDir', 'winner', 'turnNumber'];

  W.snapshot = function (game, holesFrom = 0) {
    const s = {};
    for (const k of GAME_FIELDS) s[k] = Array.isArray(game[k]) ? game[k].slice() : game[k];
    s.ammo = game.ammo.map(a => {
      const o = {};
      for (const id in a) o[id] = a[id] === Infinity ? -1 : a[id];
      return o;
    });
    s.rng = game.rng.getState();
    s.worms = game.worms.map(w => Object.assign({}, w));
    s.projectiles = game.projectiles.map(p => Object.assign({}, p, { owner: p.owner ? p.owner.id : null }));
    s.holesFrom = holesFrom;
    s.holes = game.terrain.holes.slice(holesFrom).map(h => ({ x: h.x, y: h.y, r: h.r }));
    return s;
  };

  W.applySnapshot = function (game, s) {
    for (const k of GAME_FIELDS) game[k] = Array.isArray(s[k]) ? s[k].slice() : s[k];
    game.ammo = s.ammo.map(a => {
      const o = {};
      for (const id in a) o[id] = a[id] === -1 ? Infinity : a[id];
      return o;
    });
    game.rng.setState(s.rng);
    s.worms.forEach((w, i) => Object.assign(game.worms[i], w));
    game.projectiles = s.projectiles.map(p => Object.assign({}, p, { owner: p.owner === null ? null : game.worms[p.owner] }));
    const t = game.terrain;
    s.holes.forEach((h, i) => {
      if (s.holesFrom + i >= t.holes.length) t.carve(h.x, h.y, h.r);
    });
  };

  // В событиях поле worm — объект червяка; по сети передаём его id.
  W.encodeEvent = (e) => (e.worm && typeof e.worm === 'object' ? Object.assign({}, e, { worm: e.worm.id }) : e);
  W.decodeEvent = (game, e) => (typeof e.worm === 'number' ? Object.assign({}, e, { worm: game.worms[e.worm] }) : e);

  W.stepGame = function (game, dt) {
    if (game.phase === 'gameover') return;
    const acting = game.phase === 'turn' || game.phase === 'retreat';
    const active = game.worms[game.current];
    for (const w of game.worms) {
      const dir = acting && w === active ? game.walkDir : 0;
      // Урон от падения просто снимает хп — ход не отнимает.
      for (const e of W.stepWorm(w, game.terrain, dir, dt)) game.events.push(e);
    }
    W.updateProjectiles(game, dt);
    if ((game.phase === 'turn' || game.phase === 'retreat') && game.worms.some(w => w.dead)) endTurn(game);

    const flying = game.projectiles.length > 0;
    if (game.phase === 'turn' && !flying) {
      game.turnTime -= dt;
      if (game.turnTime <= 0) { game.turnTime = 0; endTurn(game); }
    } else if (game.phase === 'retreat' && !flying) {
      game.retreatTime -= dt;
      if (game.retreatTime <= 0) { game.retreatTime = 0; endTurn(game); }
    } else if (game.phase === 'settling') {
      game.settleTime += dt;
      if (allResting(game) || game.settleTime > SETTLE_LIMIT) {
        game.projectiles.length = 0;
        resolve(game);
      }
    }
  };
})(window.W = window.W || {});
