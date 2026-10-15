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
  assert.ok(Math.abs(w.x - 850) <= 2, `x=${w.x}`);
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
