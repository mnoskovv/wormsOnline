// Физика червяка и снарядов. Только логика, без отрисовки.
(function (W) {
  const C = W.CFG;
  const R = C.WORM_R;

  W.makeWorm = function (id, name, x, y) {
    return {
      id, name, x, y, vx: 0, vy: 0, hp: C.HP, facing: 1, aim: 0,
      grounded: false, fallStartY: y, dead: false, drowned: false,
    };
  };

  const free = (t, x, y) => !t.circleHitsSolid(x, y, R);
  const supported = (t, x, y) => t.circleHitsSolid(x, y + 1, R);

  function startFalling(w) {
    w.grounded = false;
    w.fallStartY = w.y;
    w.jumped = false;
  }

  function land(w, events) {
    w.grounded = true;
    w.vx = 0;
    w.vy = 0;
    const fall = w.y - w.fallStartY;
    events.push({ type: 'land', worm: w, fall });
    if (fall > C.FALL_SAFE && !w.dead) {
      const amount = Math.floor(Math.min(C.FALL_MAX, (fall - C.FALL_SAFE) / C.FALL_DIV));
      if (amount > 0) {
        w.hp -= amount;
        events.push({ type: 'fallDamage', worm: w, amount });
      }
    }
  }

  function walk(w, t, dir, dt) {
    w.facing = dir;
    const nx = w.x + dir * C.WALK_SPEED * dt;
    if (nx < R || nx > t.w - R) return;
    // Ищем самую высокую свободную позицию с опорой в пределах ступеньки.
    for (let dy = -C.MAX_CLIMB; dy <= C.MAX_CLIMB; dy++) {
      const ny = w.y + dy;
      if (!free(t, nx, ny)) continue;
      if (supported(t, nx, ny)) {
        w.x = nx;
        w.y = ny;
        return;
      }
      if (dy >= 0) {
        // Под ногами обрыв: шагаем и начинаем падать.
        w.x = nx;
        w.y = ny;
        startFalling(w);
        return;
      }
    }
  }

  function fly(w, t, dt, events) {
    w.vy += C.GRAVITY * dt;
    const dist = Math.hypot(w.vx, w.vy) * dt;
    const n = Math.max(1, Math.ceil(dist / 2));
    const sx = (w.vx * dt) / n, sy = (w.vy * dt) / n;
    for (let i = 0; i < n; i++) {
      if (sx !== 0) {
        const nx = w.x + sx;
        if (free(t, nx, w.y)) w.x = nx;
        else {
          let lifted = false;
          for (let up = 1; up <= C.MAX_CLIMB; up++) {
            if (free(t, nx, w.y - up)) { w.x = nx; w.y -= up; lifted = true; break; }
          }
          if (!lifted) w.vx = 0;
        }
      }
      const ny = w.y + sy;
      if (free(t, w.x, ny)) {
        w.y = ny;
        // Высота своего прыжка не считается падением: урон только ниже точки толчка.
        if (w.y < w.fallStartY && !w.jumped) w.fallStartY = w.y;
      } else if (sy > 0) {
        land(w, events);
        return;
      } else {
        w.vy = 0;
        return;
      }
      if (w.y > C.WATER_Y) return;
    }
  }

  W.stepWorm = function (w, t, walkDir, dt) {
    const events = [];
    if (w.drowned) return events;
    if (w.dead) {
      // Надгробие падает, пока не ляжет на землю или не утонет.
      if (w.grounded && !supported(t, w.x, w.y)) startFalling(w);
      if (!w.grounded) fly(w, t, dt, events);
      if (w.y > C.WATER_Y) {
        w.drowned = true;
        events.push({ type: 'drown', worm: w });
      }
      return events;
    }
    if (w.grounded) {
      if (walkDir) walk(w, t, walkDir, dt);
      if (w.grounded && !supported(t, w.x, w.y)) startFalling(w);
    }
    if (!w.grounded) fly(w, t, dt, events);
    if (w.y > C.WATER_Y) {
      w.hp = 0;
      w.dead = w.drowned = true;
      events.push({ type: 'drown', worm: w });
    }
    if (w.hp <= 0) {
      w.hp = Math.max(0, w.hp);
      w.dead = true;
    }
    return events;
  };

  W.jumpWorm = function (w, back) {
    if (!w.grounded || w.dead) return;
    w.vx = (back ? C.BACKJUMP_VX : C.JUMP_VX) * w.facing;
    w.vy = back ? C.BACKJUMP_VY : C.JUMP_VY;
    startFalling(w);
    w.jumped = true;
  };

  // Нормаль поверхности в точке: от центра масс твёрдых пикселей вокруг.
  function surfaceNormal(t, x, y) {
    let nx = 0, ny = 0;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++)
        if (dx * dx + dy * dy <= 16 && t.isSolid(x + dx, y + dy)) { nx -= dx; ny -= dy; }
    const len = Math.hypot(nx, ny);
    return len ? { x: nx / len, y: ny / len } : { x: 0, y: -1 };
  }

  function hitsWorm(p, worms) {
    for (const w of worms) {
      if (w.dead) continue;
      if (w === p.owner && p.age < 0.1) continue;
      if (W.dist(p.x, p.y, w.x, w.y) < p.r + R) return true;
    }
    return false;
  }

  W.stepProjectile = function (p, t, worms, wind, dt, events) {
    p.age = (p.age || 0) + dt;
    if (t.circleHitsSolid(p.x, p.y, p.r) && !p.bounce) return 'explode';
    const ax = p.windAffected ? wind * C.WIND_ACCEL : 0;
    const ay = C.GRAVITY;
    // Точное интегрирование при постоянном ускорении, по подшагам ≤ 2 px.
    const dx = p.vx * dt + 0.5 * ax * dt * dt;
    const dy = p.vy * dt + 0.5 * ay * dt * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const px = p.x, py = p.y;
      p.x += p.vx * h + 0.5 * ax * h * h;
      p.y += p.vy * h + 0.5 * ay * h * h;
      p.vx += ax * h;
      p.vy += ay * h;
      if (hitsWorm(p, worms) && !p.bounce) return 'explode';
      if (t.circleHitsSolid(p.x, p.y, p.r)) {
        if (!p.bounce) return 'explode';
        const nrm = surfaceNormal(t, p.x, p.y);
        p.x = px;
        p.y = py;
        const vn = p.vx * nrm.x + p.vy * nrm.y;
        if (vn < 0) {
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = (p.vx - vn * nrm.x) * 0.8 - vn * nrm.x * p.bounce;
          p.vy = (p.vy - vn * nrm.y) * 0.8 - vn * nrm.y * p.bounce;
          if (events && speed > 60) events.push({ type: 'bounce', x: p.x, y: p.y });
          if (Math.hypot(p.vx, p.vy) < 15) { p.vx = 0; p.vy = 0; }
        }
        break;
      }
    }
    if (p.fuse !== null) {
      p.fuse -= dt;
      if (p.fuse <= 1e-9) return 'explode';
    }
    if (p.x < -C.OFFWORLD_MARGIN || p.x > C.WORLD_W + C.OFFWORLD_MARGIN || p.y > C.WATER_Y) return 'gone';
    return 'flying';
  };

  W.isWormResting = (w) => w.drowned || (w.grounded && w.vx === 0 && w.vy === 0);
})(window.W = window.W || {});
