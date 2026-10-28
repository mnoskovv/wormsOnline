// Компьютерный соперник: перебирает выстрелы, прикидывает полёт и бьёт лучшим.
(function (W) {
  const C = W.CFG;
  const R = C.WORM_R;

  // Независимая копия игры для пробных выстрелов.
  W.cloneGame = function (game) {
    const t = new W.Terrain(game.terrain.w, game.terrain.h);
    t.mask.set(game.terrain.mask);
    t.holes = game.terrain.holes.slice();
    const g = { terrain: t, worms: game.worms.map(w => Object.assign({}, w)), projectiles: [], events: [],
      rng: W.rng(0), seed: game.seed };
    W.applySnapshot(g, W.snapshot(game, t.holes.length));
    return g;
  };

  // Быстрая прикидка полёта снаряда без отскоков: точка вместо круга, шаги по 3 px.
  // Те же формулы движения, что в stepProjectile. Возвращает точку взрыва или null.
  function flight(game, worm, weapon, angle, power) {
    const p = W.launchProjectile(worm, weapon, angle, power);
    const t = game.terrain;
    const ax = p.windAffected ? game.wind * C.WIND_ACCEL : 0, ay = C.GRAVITY;
    let age = 0;
    for (let i = 0; i < 8 / C.DT; i++) {
      const dt = C.DT;
      const n = Math.max(1, Math.ceil(Math.hypot(p.vx * dt, p.vy * dt) / 3));
      const h = dt / n;
      age += dt;
      for (let k = 0; k < n; k++) {
        p.x += p.vx * h + 0.5 * ax * h * h;
        p.y += p.vy * h + 0.5 * ay * h * h;
        p.vx += ax * h;
        p.vy += ay * h;
        if (t.isSolid(p.x, p.y)) return { x: p.x, y: p.y };
        for (const w of game.worms) {
          if (w.dead || (w === worm && age < 0.1)) continue;
          if (W.dist(p.x, p.y, w.x, w.y) < p.r + R) return { x: p.x, y: p.y };
        }
      }
      if (p.x < -C.OFFWORLD_MARGIN || p.x > C.WORLD_W + C.OFFWORLD_MARGIN || p.y > C.WATER_Y) return null;
    }
    return null;
  }

  function estimate(game, me, weapon, at) {
    const b = W.BLAST[weapon];
    let enemy = 0, self = 0;
    for (const w of game.worms) {
      if (w.dead) continue;
      const k = W.clamp(1 - W.dist(at.x, at.y, w.x, w.y) / (b.r + R), 0, 1);
      if (w.id === me) self += b.dmg * k;
      else enemy += b.dmg * k;
    }
    return enemy - 2 * self;
  }

  // Честная проверка на копии игры до успокоения; генератор, чтобы резать работу по кадрам.
  function* simulate(game, me, shot) {
    const g = W.cloneGame(game);
    g.phase = 'turn';
    W.applyCommand(g, me, { type: 'select', weapon: shot.weapon });
    W.applyCommand(g, me, { type: 'aim', angle: shot.angle });
    if (!W.applyCommand(g, me, { type: 'fire', power: shot.power })) return -Infinity;
    for (let i = 0; i < 8 / C.DT; i++) {
      W.stepGame(g, C.DT);
      g.events.length = 0;
      if (g.projectiles.length === 0 && g.worms.every(W.isWormResting)) break;
      if (i % 20 === 19) yield null;
    }
    let score = 0;
    g.worms.forEach((w, i) => {
      const lost = w.dead ? game.worms[i].hp : game.worms[i].hp - Math.max(0, w.hp);
      score += i === me ? -2 * lost : lost;
    });
    return score;
  }

  // Генератор: каждый next() — немного работы, чтобы не подвешивать кадр.
  // opts.rand — случайность, opts.error — разброс прицела в радианах.
  W.planBotShot = function* (game, me, opts = {}) {
    const rand = opts.rand || Math.random;
    const error = opts.error ?? 0.05;
    const worm = game.worms[me];
    const enemy = game.worms.find(w => w.id !== me && !w.dead);
    if (!enemy) return { weapon: 'bazooka', angle: -Math.PI / 2, power: 0.5, score: 0 };
    const dir = enemy.x >= worm.x ? 1 : -1;
    const weapons = ['bazooka'];
    if (game.ammo[me].mortar > 0 && rand() < 0.3) weapons.push('mortar');
    const found = [];
    let n = 0;
    for (let a = -1.4; a <= 0.3; a += 0.05) {
      const angle = dir === 1 ? a : Math.PI - a;
      for (let power = 0.3; power <= 1.001; power += 0.04) {
        for (const weapon of weapons) {
          const at = flight(game, worm, weapon, angle, power);
          if (at) found.push({ weapon, angle, power, score: estimate(game, me, weapon, at), miss: W.dist(at.x, at.y, enemy.x, enemy.y) });
        }
      }
      if (++n % 6 === 0) yield null;
    }
    found.sort((p, q) => q.score - p.score || p.miss - q.miss);
    let best = null;
    for (const shot of found.slice(0, 4)) {
      shot.score = yield* simulate(game, me, shot);
      if (!best || shot.score > best.score) best = shot;
    }
    if (!best) best = { weapon: 'bazooka', angle: dir === 1 ? -0.8 : Math.PI + 0.8, power: 0.6, score: 0 };
    return Object.assign({}, best, {
      angle: best.angle + (rand() * 2 - 1) * error,
      power: W.clamp(best.power + (rand() * 2 - 1) * error * 0.5, 0.05, 1),
    });
  };

  // Бот за столом: думает, наводится, заряжает и стреляет — всё видно игроку.
  class BotPlayer {
    constructor(player, opts = {}) {
      this.player = player;
      this.opts = opts;
      this.state = 'idle';
      this.turn = null;
      this.charge = null;
    }

    update(game, dt) {
      if (game.current !== this.player || game.phase !== 'turn') {
        this.charge = null;
        if (game.current !== this.player) this.state = 'idle';
        return;
      }
      if (this.turn !== game.turnNumber) {
        this.turn = game.turnNumber;
        this.state = 'think';
        this.timer = 0;
        this.planner = W.planBotShot(game, this.player, this.opts);
        this.shot = null;
      }
      const me = this.player;
      this.timer += dt;
      if (this.state === 'think') {
        const until = Date.now() + 6;
        while (!this.shot && Date.now() < until) {
          const r = this.planner.next();
          if (r.done) this.shot = r.value;
        }
        if (this.shot && this.timer >= 0.8) {
          W.applyCommand(game, me, { type: 'select', weapon: this.shot.weapon });
          this.from = W.absoluteAim(game.worms[me]);
          this.state = 'aim';
          this.timer = 0;
        }
      } else if (this.state === 'aim') {
        const k = Math.min(1, this.timer / 0.6);
        W.applyCommand(game, me, { type: 'aim', angle: this.from + (this.shot.angle - this.from) * k });
        if (k >= 1) { this.state = 'charge'; this.charge = 0; }
      } else if (this.state === 'charge') {
        this.charge = Math.min(this.shot.power, this.charge + dt / C.CHARGE_TIME);
        if (this.charge >= this.shot.power) {
          W.applyCommand(game, me, { type: 'fire', power: this.shot.power });
          this.charge = null;
          this.state = 'done';
        }
      }
    }
  }

  W.BotPlayer = BotPlayer;
})(window.W = window.W || {});
