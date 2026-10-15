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
  }

  function land(w, events) {
    w.grounded = true;
    w.vx = 0;
    w.vy = 0;
    const fall = w.y - w.fallStartY;
    events.push({ type: 'land', worm: w, fall });
    if (fall > C.FALL_SAFE) {
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
        if (w.y < w.fallStartY) w.fallStartY = w.y;
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
    if (w.dead) return events;
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
  };

  W.isWormResting = (w) => w.dead || (w.grounded && w.vx === 0 && w.vy === 0);
})(window.W = window.W || {});
