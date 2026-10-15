const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js', 'explosion.js');

function setup(dx) {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  const w = W.makeWorm(0, 'A', 800 + dx, 490);
  w.grounded = true;
  return { t, w };
}

test('worm at the centre takes full damage', () => {
  const { t, w } = setup(0);
  const hits = W.explode(t, [w], 800, 490, 40, 50);
  assert.strictEqual(hits[0].dmg, 50);
  assert.strictEqual(w.hp, 50);
});

test('damage falls off linearly', () => {
  const { t, w } = setup(25);
  const hits = W.explode(t, [w], 800, 490, 40, 50);
  assert.strictEqual(hits[0].dmg, 25);
});

test('worm outside the radius is untouched', () => {
  const { t, w } = setup(60);
  const hits = W.explode(t, [w], 800, 490, 40, 50);
  assert.strictEqual(hits.length, 0);
  assert.strictEqual(w.hp, 100);
});

test('hit worm is knocked away and airborne', () => {
  const { t, w } = setup(20);
  W.explode(t, [w], 800, 490, 40, 50);
  assert.strictEqual(w.grounded, false);
  assert.ok(w.vx > 0);
});

test('explosion carves a hole', () => {
  const { t, w } = setup(0);
  W.explode(t, [w], 800, 500, 40, 50);
  assert.strictEqual(t.holes.length, 1);
  assert.strictEqual(t.isSolid(800, 520), false);
});
