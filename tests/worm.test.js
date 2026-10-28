const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js');
const DT = W.CFG.DT;

function ground() {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  return t;
}

function run(worm, t, seconds, dir = 0) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) events.push(...W.stepWorm(worm, t, dir, DT));
  return events;
}

function settled(x, t) {
  const w = W.makeWorm(0, 'A', x, 489);
  run(w, t, 0.5);
  assert.ok(w.grounded);
  return w;
}

test('worm falls onto ground and takes capped fall damage', () => {
  const t = ground();
  const w = W.makeWorm(0, 'A', 800, 300);
  const ev = run(w, t, 3);
  assert.ok(w.grounded);
  assert.ok(Math.abs(w.y - 490) <= 1, `y=${w.y}`);
  const dmg = ev.filter(e => e.type === 'fallDamage');
  assert.strictEqual(dmg.length, 1);
  assert.strictEqual(dmg[0].amount, 30);
  assert.strictEqual(w.hp, 70);
});

test('short fall does no damage', () => {
  const t = ground();
  const w = W.makeWorm(0, 'A', 800, 440);
  const ev = run(w, t, 2);
  assert.ok(w.grounded);
  assert.strictEqual(ev.filter(e => e.type === 'fallDamage').length, 0);
  assert.strictEqual(w.hp, 100);
});

test('walking right for 1s moves about WALK_SPEED', () => {
  const t = ground();
  const w = settled(800, t);
  run(w, t, 1, 1);
  assert.ok(Math.abs(w.x - 800 - W.CFG.WALK_SPEED) <= 3, `x=${w.x}`);
  assert.strictEqual(w.facing, 1);
});

test('a 20px wall blocks walking', () => {
  const t = ground();
  t.fillRect(820, 480, 20, 20);
  const w = settled(800, t);
  run(w, t, 2, 1);
  assert.ok(w.x <= 810.5, `x=${w.x}`);
});

test('a 4px step can be climbed', () => {
  const t = ground();
  t.fillRect(820, 496, 200, 4);
  const w = settled(800, t);
  run(w, t, 1, 1);
  assert.ok(w.x > 830, `x=${w.x}`);
});

test('jump goes up and lands again', () => {
  const t = ground();
  const w = settled(800, t);
  W.jumpWorm(w, false);
  run(w, t, 0.1);
  assert.ok(w.y < 490);
  run(w, t, 3);
  assert.ok(w.grounded);
  assert.strictEqual(w.hp, 100);
});

test('worm over the void drowns', () => {
  const t = new W.Terrain(1600, 800);
  const w = W.makeWorm(0, 'A', 100, 300);
  const ev = run(w, t, 3);
  assert.ok(w.dead && w.drowned);
  assert.strictEqual(ev.filter(e => e.type === 'drown').length, 1);
});

test('a dead worm keeps falling until its grave lands', () => {
  const t = ground();
  const w = W.makeWorm(0, 'A', 800, 300);
  w.hp = 0;
  w.dead = true;
  assert.strictEqual(W.isWormResting(w), false);
  const ev = run(w, t, 3);
  assert.ok(w.grounded);
  assert.ok(Math.abs(w.y - 490) <= 1, `y=${w.y}`);
  assert.strictEqual(ev.filter(e => e.type === 'fallDamage').length, 0);
  assert.strictEqual(W.isWormResting(w), true);
});

// Прыжок до приземления: высота подъёма и смещение по x.
function jumpArc(back) {
  const t = ground();
  const w = settled(800, t);
  const y0 = w.y;
  let top = 0;
  W.jumpWorm(w, back);
  const ev = [];
  for (let i = 0; i < 300 && (i === 0 || !w.grounded); i++) {
    ev.push(...W.stepWorm(w, t, 0, DT));
    top = Math.max(top, y0 - w.y);
  }
  return { w, top, dx: w.x - 800, ev };
}

test('forward jump is long and low', () => {
  const { top, dx, w } = jumpArc(false);
  assert.ok(dx >= 85, `dx=${dx}`);
  assert.ok(top <= 40, `top=${top}`);
  assert.strictEqual(w.hp, 100);
});

test('back flip is high with a small backward shift and no fall damage', () => {
  const { top, dx, w, ev } = jumpArc(true);
  assert.ok(top >= 70, `top=${top}`);
  assert.ok(dx < 0 && dx >= -40, `dx=${dx}`);
  assert.strictEqual(ev.filter(e => e.type === 'fallDamage').length, 0);
  assert.strictEqual(w.hp, 100);
});

test('jumping down from a high ledge still hurts', () => {
  const t = ground();
  t.fillRect(700, 380, 110, 120); // уступ 120 px
  const w = W.makeWorm(0, 'A', 790, 360);
  run(w, t, 0.5);
  assert.ok(w.grounded);
  W.jumpWorm(w, false);
  run(w, t, 3);
  assert.ok(w.grounded && w.y > 480, `y=${w.y}`);
  assert.ok(w.hp < 100, `hp=${w.hp}`);
});

test('walking is brisker than a crawl', () => {
  assert.ok(W.CFG.WALK_SPEED >= 65 && W.CFG.WALK_SPEED <= 75);
});

test('back flip turns the worm one full somersault backwards', () => {
  const t = ground();
  const w = settled(800, t);
  w.facing = 1;
  W.jumpWorm(w, true);
  const angles = [];
  for (let i = 0; i < 300 && (i === 0 || !w.grounded); i++) {
    W.stepWorm(w, t, 0, DT);
    angles.push(W.flipAngle(w));
  }
  const min = Math.min(...angles);
  assert.ok(min < -Math.PI * 1.7, `turned to ${min}`);
  assert.ok(angles.every((a, i) => i === 0 || a <= angles[i - 1] + 1e-9 || a === 0), 'turns one way');
  assert.strictEqual(W.flipAngle(w), 0, 'upright after landing');
});

test('forward jump does not somersault', () => {
  const t = ground();
  const w = settled(800, t);
  W.jumpWorm(w, false);
  W.stepWorm(w, t, 0, DT);
  assert.strictEqual(W.flipAngle(w), 0);
});
