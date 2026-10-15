const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js');
const DT = W.CFG.DT;

function proj(o) {
  return Object.assign({ kind: 'test', x: 0, y: 0, vx: 0, vy: 0, r: 4, windAffected: false,
    bounce: null, fuse: null, owner: null, onImpact: 'test' }, o);
}

function runUntilDone(p, t, wind, maxSeconds, events) {
  for (let i = 0; i < Math.round(maxSeconds / DT); i++) {
    const s = W.stepProjectile(p, t, [], wind, DT, events);
    if (s !== 'flying') return { status: s, time: (i + 1) * DT };
  }
  return { status: 'flying', time: maxSeconds };
}

test('ballistic flight follows gravity', () => {
  const t = new W.Terrain(1600, 800);
  const p = proj({ x: 100, y: 100, vx: 100 });
  for (let i = 0; i < 60; i++) W.stepProjectile(p, t, [], 0, DT);
  assert.ok(Math.abs(p.x - 200) <= 1, `x=${p.x}`);
  assert.ok(Math.abs(p.y - 550) <= 2, `y=${p.y}`);
});

test('wind pushes only wind-affected projectiles', () => {
  const t = new W.Terrain(1600, 800);
  const calm = proj({ x: 100, y: 100, vx: 100, windAffected: true });
  const windy = proj({ x: 100, y: 100, vx: 100, windAffected: true });
  const immune = proj({ x: 100, y: 100, vx: 100, windAffected: false });
  for (let i = 0; i < 60; i++) {
    W.stepProjectile(calm, t, [], 0, DT);
    W.stepProjectile(windy, t, [], 10, DT);
    W.stepProjectile(immune, t, [], 10, DT);
  }
  assert.ok(windy.x > calm.x + 10);
  assert.ok(Math.abs(immune.x - calm.x) < 1e-9);
});

test('fast projectile does not tunnel through a 4px wall', () => {
  const t = new W.Terrain(1600, 800);
  t.fillRect(500, 0, 4, 800);
  const p = proj({ x: 400, y: 400, vx: 900 });
  const r = runUntilDone(p, t, 0, 0.5);
  assert.strictEqual(r.status, 'explode');
  assert.ok(p.x < 506, `x=${p.x}`);
});

test('projectile spawned inside terrain explodes on first step', () => {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  const p = proj({ x: 800, y: 600, vx: 500 });
  assert.strictEqual(W.stepProjectile(p, t, [], 0, DT), 'explode');
});

test('projectile leaving the side is gone, going up comes back down', () => {
  const t = new W.Terrain(1600, 800);
  const side = proj({ x: 10, y: 100, vx: -900, vy: -300 });
  const r1 = runUntilDone(side, t, 0, 5);
  assert.strictEqual(r1.status, 'gone');
  assert.ok(side.x < -200);

  const up = proj({ x: 800, y: 50, vy: -900 });
  let minY = Infinity, status = 'flying';
  for (let i = 0; i < 600 && status === 'flying'; i++) {
    status = W.stepProjectile(up, t, [], 0, DT);
    minY = Math.min(minY, up.y);
  }
  assert.ok(minY < 0);
  assert.strictEqual(status, 'gone');
  assert.ok(up.y > W.CFG.WATER_Y);
});

test('grenade bounces off the floor and explodes on its fuse', () => {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  const p = proj({ x: 800, y: 400, vy: 300, bounce: 0.5, fuse: 3 });
  let bounced = false, status = 'flying', time = 0;
  while (status === 'flying' && time < 5) {
    status = W.stepProjectile(p, t, [], 0, DT);
    time += DT;
    if (p.vy < 0) bounced = true;
  }
  assert.ok(bounced);
  assert.strictEqual(status, 'explode');
  assert.ok(Math.abs(time - 3) <= 0.05, `time=${time}`);
});
