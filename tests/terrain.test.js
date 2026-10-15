const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js');

function ground() {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  return t;
}

test('isSolid inside, above and out of bounds', () => {
  const t = ground();
  assert.strictEqual(t.isSolid(10, 600), true);
  assert.strictEqual(t.isSolid(10, 400), false);
  assert.strictEqual(t.isSolid(-1, 600), false);
  assert.strictEqual(t.isSolid(1600, 600), false);
});

test('carve removes a circle and records the hole', () => {
  const t = ground();
  t.carve(800, 500, 40);
  assert.strictEqual(t.isSolid(800, 520), false);
  assert.strictEqual(t.isSolid(800, 560), true);
  assert.deepStrictEqual(Array.from(t.holes, h => ({ ...h })), [{ x: 800, y: 500, r: 40 }]);
});

test('applyHoles reproduces the same mask', () => {
  const a = ground();
  a.carve(800, 500, 40);
  a.carve(300, 520, 25);
  const b = ground();
  b.applyHoles(a.holes);
  assert.strictEqual(Buffer.compare(Buffer.from(b.mask), Buffer.from(a.mask)), 0);
});

test('circleHitsSolid', () => {
  const t = new W.Terrain(1600, 800);
  assert.strictEqual(t.circleHitsSolid(800, 490, 5), false);
  t.fillCircle(800, 490, 3);
  assert.strictEqual(t.circleHitsSolid(800, 490, 5), true);
});

test('fromAlpha builds mask from alpha channel', () => {
  const t = W.Terrain.fromAlpha(2, 1, new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]));
  assert.strictEqual(t.isSolid(0, 0), true);
  assert.strictEqual(t.isSolid(1, 0), false);
});

test('applyHoles applied repeatedly does not duplicate holes', () => {
  const a = ground();
  a.carve(800, 500, 40);
  a.carve(300, 520, 25);
  const b = ground();
  b.applyHoles(a.holes);
  b.applyHoles(a.holes);
  assert.strictEqual(b.holes.length, 2);
  a.carve(1200, 510, 30);
  b.applyHoles(a.holes);
  assert.strictEqual(b.holes.length, 3);
  assert.strictEqual(Buffer.compare(Buffer.from(b.mask), Buffer.from(a.mask)), 0);
});
