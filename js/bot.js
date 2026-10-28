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

  // Быстрая прикидка полёта снаряда без отскоков, шаги по 3 px.
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
        // Снаряд — шарик: проверяем центр и четыре края, как цепляет гребни в игре.
        const r = p.r;
        if (t.isSolid(p.x, p.y) || t.isSolid(p.x + r, p.y) || t.isSolid(p.x - r, p.y) || t.isSolid(p.x, p.y + r) || t.isSolid(p.x, p.y - r)) {
          return { x: p.x, y: p.y };
        }
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
    g.current = me;
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
    const error = opts.error ?? 0.02;
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
    for (const shot of found.slice(0, 8)) {
      shot.score = yield* simulate(game, me, shot);
      if (!best || shot.score > best.score) best = shot;
    }
    if (!best) best = { weapon: 'bazooka', angle: dir === 1 ? -0.8 : Math.PI + 0.8, power: 0.6, score: 0 };
    return Object.assign({}, best, {
      angle: best.angle + (rand() * 2 - 1) * error,
      power: W.clamp(best.power + (rand() * 2 - 1) * error * 0.5, 0.05, 1),
    });
  };

  // Есть ли впереди земля, а не обрыв в воду.
  function safeAhead(game, worm, dir) {
    const x = worm.x + dir * 18;
    if (x < R || x > C.WORLD_W - R) return false;
    for (let y = worm.y - 30; y < Math.min(worm.y + 120, C.WATER_Y); y++) if (game.terrain.isSolid(x, y)) return true;
    return false;
  }

  // Шаг маршрута, выполняемый по тикам. Один и тот же код крутит и копию игры, и настоящую:
  // физика детерминирована, поэтому вживую выходит ровно то, что бот увидел на копии.
  // kind: 'walk' — идти к цели до 2.5 с; 'jump' — прыжок к цели; 'high' — высокий прыжок назад к цели.
  class Move {
    constructor(kind, dir) {
      this.kind = kind;
      this.dir = dir;
      this.t = 0;
      this.phase = 'start';
    }

    // Возвращает true, когда шаг закончен.
    tick(game, me) {
      const w = game.worms[me];
      this.t++;
      if (this.phase === 'start') {
        if (this.kind === 'walk') {
          W.applyCommand(game, me, { type: 'walk', dir: this.dir });
          this.phase = 'walking';
          this.lastX = w.x;
          this.still = 0;
        } else {
          // Повернуться: к цели для прыжка вперёд, спиной — для прыжка назад.
          const face = this.kind === 'jump' ? this.dir : -this.dir;
          W.applyCommand(game, me, { type: 'aim', angle: face === 1 ? -0.3 : Math.PI + 0.3 });
          W.applyCommand(game, me, { type: 'jump', back: this.kind === 'high' });
          this.phase = 'settle';
          this.t = 0;
        }
        return false;
      }
      if (this.phase === 'walking') {
        this.still = Math.abs(w.x - this.lastX) < 0.01 ? this.still + 1 : 0;
        this.lastX = w.x;
        if (this.t > 150 || this.still > 10 || (w.grounded && !safeAhead(game, w, this.dir))) {
          W.applyCommand(game, me, { type: 'walk', dir: 0 });
          this.phase = 'settle';
          this.t = 0;
        }
        return false;
      }
      // settle: ждём, пока червяк встанет.
      return (W.isWormResting(w) && this.t > 3) || this.t > 150;
    }
  }

  // Лучший выстрел с текущего места по быстрой прикидке (грубая сетка).
  function* quickShot(game, me) {
    const worm = game.worms[me];
    const enemy = game.worms.find(w => w.id !== me && !w.dead);
    if (!enemy) return 0;
    const dir = enemy.x >= worm.x ? 1 : -1;
    let best = -Infinity;
    for (let a = -1.4; a <= 0.3; a += 0.12) {
      for (let power = 0.3; power <= 1.001; power += 0.1) {
        const at = flight(game, worm, 'bazooka', dir === 1 ? a : Math.PI - a, power);
        const sc = at ? estimate(game, me, 'bazooka', at) : -Infinity;
        if (sc > best) best = sc;
      }
      yield null;
    }
    return best;
  }

  // Поиск маршрута: перебор цепочек шагов до глубины 3 на копиях игры.
  W.planBotMove = function* (game, me) {
    const enemy = game.worms.find(w => w.id !== me && !w.dead);
    if (!enemy) return { moves: [], score: 0 };
    const dir = enemy.x >= game.worms[me].x ? 1 : -1;
    const hp0 = game.worms[me].hp;
    function* value(g) {
      const w = g.worms[me];
      const shot = yield* quickShot(g, me);
      // Подходить ближе имеет смысл, только пока выстрела нет.
      return Math.max(0, shot) * 3 - 2 * (hp0 - w.hp) - (shot > 0 ? 0 : Math.abs(w.x - enemy.x) * 0.01);
    }
    const root = { g: game, moves: [], score: yield* value(game) };
    if (root.score >= 60) return { moves: [], score: root.score }; // и так хорошо стреляем
    let best = root;
    let layer = [root];
    const seen = new Set([Math.round(game.worms[me].x / 8) + ':' + Math.round(game.worms[me].y / 8)]);
    for (let depth = 0; depth < 3; depth++) {
      const next = [];
      for (const node of layer) {
        for (const kind of ['walk', 'jump', 'high']) {
          const g = W.cloneGame(node.g);
          g.events = [];
          const mv = new Move(kind, dir);
          let ok = true;
          for (let i = 0; i < 400; i++) {
            if (mv.tick(g, me)) break;
            W.stepGame(g, C.DT);
            g.events.length = 0;
            if (g.phase !== 'turn') { ok = false; break; }
            if (i % 5 === 4) yield null;
          }
          const w = g.worms[me];
          if (!ok || w.dead || w.drowned) continue;
          const key = Math.round(w.x / 8) + ':' + Math.round(w.y / 8);
          if (seen.has(key)) continue;
          seen.add(key);
          const child = { g, moves: node.moves.concat([[kind, dir]]), score: yield* value(g) };
          if (child.score > best.score) best = child;
          next.push(child);
          yield null;
        }
      }
      next.sort((p, q) => q.score - p.score);
      layer = next.slice(0, 3);
    }
    return { moves: best.moves, score: best.score };
  };

  // Бот за столом: выбирает, куда пройти, идёт, думает над выстрелом, наводится, заряжает, стреляет.
  // update() зовётся каждый тик игры (C.DT), чтобы маршрут повторялся в точности.
  class BotPlayer {
    constructor(player, opts = {}) {
      this.player = player;
      this.opts = opts;
      this.state = 'idle';
      this.turn = null;
      this.charge = null;
    }

    // Немного работы генератора за тик, чтобы не подвешивать кадр.
    work(gen) {
      const until = Date.now() + 8;
      while (Date.now() < until) {
        const r = gen.next();
        if (r.done) return r.value;
      }
      return undefined;
    }

    update(game, dt) {
      if (game.current !== this.player || game.phase !== 'turn') {
        this.charge = null;
        if (game.current !== this.player) this.state = 'idle';
        return;
      }
      const me = this.player;
      if (this.turn !== game.turnNumber) {
        this.turn = game.turnNumber;
        this.state = 'route';
        this.timer = 0;
        this.cycles = 0;
        this.lastMoved = false;
        this.gen = W.planBotMove(game, me);
      }
      this.timer += dt;
      if (this.state === 'route') {
        const plan = this.work(this.gen);
        if (plan) {
          this.moves = plan.moves.map(([kind, dir]) => new Move(kind, dir));
          this.cycles++; // пройти некуда — второй раз искать не будем
          this.state = this.moves.length ? 'move' : 'think';
          if (this.state === 'think') this.gen = W.planBotShot(game, me, this.opts);
        }
      } else if (this.state === 'move') {
        if (this.moves[0].tick(game, me)) this.moves.shift();
        this.lastMoved = true;
        if (!this.moves.length) {
          this.state = 'think';
          this.gen = W.planBotShot(game, me, this.opts);
        }
      } else if (this.state === 'think') {
        const shot = this.work(this.gen);
        if (shot) {
          this.shot = shot;
          // Всё ещё не достаёт — ещё один заход маршрута (если есть время).
          if (shot.score <= 0 && this.cycles < 2 && this.moves.length === 0 && this.lastMoved && game.turnTime > 12) {
            this.state = 'route';
            this.lastMoved = false;
            this.gen = W.planBotMove(game, me);
            return;
          }
          W.applyCommand(game, me, { type: 'select', weapon: shot.weapon });
          this.from = W.absoluteAim(game.worms[me]);
          this.state = 'aim';
          this.timer = 0;
        }
      } else if (this.state === 'aim') {
        if (this.timer < 0.3) return; // короткая пауза «подумал»
        const k = Math.min(1, (this.timer - 0.3) / 0.6);
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

    get thinking() { return this.state === 'route' || this.state === 'think'; }
  }

  W.BotPlayer = BotPlayer;
})(window.W = window.W || {});
