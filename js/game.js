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

  W.stepGame = function (game, dt) {
    if (game.phase === 'gameover') return;
    const acting = game.phase === 'turn' || game.phase === 'retreat';
    const active = game.worms[game.current];
    for (const w of game.worms) {
      const dir = acting && w === active ? game.walkDir : 0;
      for (const e of W.stepWorm(w, game.terrain, dir, dt)) {
        game.events.push(e);
        if (e.type === 'fallDamage' && w === active && acting) endTurn(game);
      }
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
