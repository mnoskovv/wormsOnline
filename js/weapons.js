// Оружие: таблица, выстрелы и обработчики попаданий.
(function (W) {
  const C = W.CFG;
  const R = C.WORM_R;
  const DEG = Math.PI / 180;

  W.WEAPON_ORDER = ['bazooka', 'grenade', 'mortar', 'shotgun', 'sniper', 'dynamite', 'airstrike', 'teleport'];
  W.WEAPONS = {
    bazooka:   { id: 'bazooka',   name: 'Базука',    ammo: Infinity, aim: 'charge' },
    grenade:   { id: 'grenade',   name: 'Граната',   ammo: Infinity, aim: 'charge' },
    mortar:    { id: 'mortar',    name: 'Мортира',   ammo: 3,        aim: 'charge' },
    shotgun:   { id: 'shotgun',   name: 'Дробовик',  ammo: Infinity, aim: 'instant' },
    sniper:    { id: 'sniper',    name: 'Снайперка', ammo: Infinity, aim: 'instant' },
    dynamite:  { id: 'dynamite',  name: 'Динамит',   ammo: 2,        aim: 'drop' },
    airstrike: { id: 'airstrike', name: 'Авиаудар',  ammo: 1,        aim: 'target' },
    teleport:  { id: 'teleport',  name: 'Телепорт',  ammo: 2,        aim: 'target' },
  };

  W.initialAmmo = function () {
    const a = {};
    for (const id of W.WEAPON_ORDER) a[id] = W.WEAPONS[id].ammo;
    return a;
  };

  function projectile(o) {
    return Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 4, windAffected: false,
      bounce: null, fuse: null, owner: null, age: 0 }, o);
  }

  function explodeAt(game, x, y, r, dmg) {
    game.events.push({ type: 'explosion', x, y, r });
    for (const h of W.explode(game.terrain, game.worms, x, y, r, dmg)) {
      game.events.push({ type: 'damage', worm: h.worm, dmg: h.dmg });
    }
  }

  W.IMPACT = {
    bazooka: (g, p) => explodeAt(g, p.x, p.y, 40, 50),
    grenade: (g, p) => explodeAt(g, p.x, p.y, 40, 45),
    dynamite: (g, p) => explodeAt(g, p.x, p.y, 60, 75),
    airstrike: (g, p) => explodeAt(g, p.x, p.y, 30, 25),
    fragment: (g, p) => explodeAt(g, p.x, p.y, 20, 25),
    mortar: (g, p) => {
      explodeAt(g, p.x, p.y, 30, 35);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (g.rng() * 2 - 1) * (Math.PI / 3);
        const speed = 250 + g.rng() * 150;
        g.projectiles.push(projectile({ kind: 'fragment', x: p.x, y: p.y, r: 3,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, windAffected: true, onImpact: 'fragment' }));
      }
    },
  };

  // Луч от червяка шагами по 2 px до червяка или земли.
  function ray(game, shooter, angle, range) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    for (let d = 0; d <= range; d += 2) {
      const x = shooter.x + dx * d, y = shooter.y + dy * d;
      for (const w of game.worms) {
        if (w === shooter || w.dead) continue;
        if (W.dist(x, y, w.x, w.y) < R) return { x, y, d, worm: w };
      }
      if (game.terrain.isSolid(x, y)) return { x, y, d, worm: null };
      if (x < 0 || x > C.WORLD_W || y > C.WATER_Y) break;
    }
    return { x: shooter.x + dx * range, y: shooter.y + dy * range, d: range, worm: null };
  }

  function bulletHit(game, hit, angle, dmg, holeR) {
    if (hit.worm) {
      const w = hit.worm;
      w.hp -= dmg;
      w.vx += Math.cos(angle) * dmg * 6;
      w.vy -= dmg * 4;
      w.grounded = false;
      w.fallStartY = w.y;
      game.events.push({ type: 'damage', worm: w, dmg });
    } else if (game.terrain.isSolid(hit.x, hit.y)) {
      game.terrain.carve(hit.x, hit.y, holeR);
      game.events.push({ type: 'explosion', x: hit.x, y: hit.y, r: holeR, bullet: true });
    }
  }

  function launch(worm, angle, power, o) {
    const speed = power * C.MAX_SHOT_SPEED;
    return projectile(Object.assign({
      x: worm.x + Math.cos(angle) * (R + 4), y: worm.y + Math.sin(angle) * (R + 4),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner: worm,
    }, o));
  }

  const FIRE = {
    bazooka: (g, w, c) => g.projectiles.push(launch(w, c.angle, c.power, { kind: 'bazooka', windAffected: true, onImpact: 'bazooka' })),
    grenade: (g, w, c) => g.projectiles.push(launch(w, c.angle, c.power, { kind: 'grenade', r: 5, bounce: 0.5, fuse: g.fuse[g.current], onImpact: 'grenade' })),
    mortar: (g, w, c) => g.projectiles.push(launch(w, c.angle, c.power, { kind: 'mortar', r: 5, windAffected: true, onImpact: 'mortar' })),
    dynamite: (g, w) => g.projectiles.push(projectile({ kind: 'dynamite', x: w.x, y: w.y, r: 5, bounce: 0.2, fuse: 4, owner: w, onImpact: 'dynamite' })),
    shotgun: (g, w, c) => {
      for (let i = 0; i < 7; i++) {
        const a = c.angle + (i / 6 * 2 - 1) * 8 * DEG;
        const hit = ray(g, w, a, 600);
        g.events.push({ type: 'tracer', x1: w.x, y1: w.y, x2: hit.x, y2: hit.y });
        bulletHit(g, hit, a, 6, 6);
      }
    },
    sniper: (g, w, c) => {
      const hit = ray(g, w, c.angle, 1600);
      g.events.push({ type: 'tracer', x1: w.x, y1: w.y, x2: hit.x, y2: hit.y });
      bulletHit(g, hit, c.angle, Math.round(20 + 30 * W.clamp(hit.d / 800, 0, 1)), 4);
    },
    airstrike: (g, w, c) => {
      for (let i = 0; i < 5; i++) {
        g.projectiles.push(projectile({ kind: 'airstrike', x: c.target.x + (i - 2) * 30, y: -50, vy: 300,
          r: 4, windAffected: true, onImpact: 'airstrike' }));
      }
    },
    teleport: (g, w, c) => {
      const from = { x: w.x, y: w.y };
      w.x = c.target.x;
      w.y = c.target.y;
      w.vx = w.vy = 0;
      w.grounded = false;
      w.fallStartY = w.y;
      g.events.push({ type: 'teleport', worm: w, from, to: { x: w.x, y: w.y } });
    },
  };

  function validTarget(game, weapon, target) {
    if (!target) return false;
    if (weapon === 'airstrike') return target.x >= 0 && target.x <= C.WORLD_W;
    const { x, y } = target;
    if (x < R || x > C.WORLD_W - R || y < R || y > C.WATER_Y - R) return false;
    return !game.terrain.circleHitsSolid(x, y, R);
  }

  W.fireWeapon = function (game, worm, cmd) {
    const def = W.WEAPONS[cmd.weapon];
    const ammo = game.ammo[game.current];
    if (!def || !(ammo[cmd.weapon] > 0)) return false;
    if (def.aim === 'target' && !validTarget(game, cmd.weapon, cmd.target)) return false;
    ammo[cmd.weapon] -= 1;
    game.events.push({ type: 'shot', weapon: cmd.weapon, x: worm.x, y: worm.y, target: cmd.target || null });
    FIRE[cmd.weapon](game, worm, cmd);
    return true;
  };

  W.updateProjectiles = function (game, dt) {
    const list = game.projectiles.slice();
    for (const p of list) {
      const s = W.stepProjectile(p, game.terrain, game.worms, game.wind, dt, game.events);
      if (s === 'flying') continue;
      game.projectiles.splice(game.projectiles.indexOf(p), 1);
      if (s === 'explode') W.IMPACT[p.onImpact](game, p);
      else game.events.push({ type: 'splashProjectile', x: p.x, y: p.y, gone: p.y <= C.WATER_Y });
    }
  };
})(window.W = window.W || {});
