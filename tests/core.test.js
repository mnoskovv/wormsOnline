const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');

test('rng is deterministic per seed and in [0,1)', () => {
  const W = load('core.js');
  const a = W.rng(42), b = W.rng(42);
  for (let i = 0; i < 5; i++) {
    const x = a();
    assert.strictEqual(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notStrictEqual(W.rng(43)(), W.rng(42)());
});

test('CFG has spec values', () => {
  const W = load('core.js');
  assert.strictEqual(W.CFG.WORLD_W, 1600);
  assert.strictEqual(W.CFG.HP, 100);
  assert.strictEqual(W.CFG.TURN_TIME, 30);
});

test('clamp and dist', () => {
  const W = load('core.js');
  assert.strictEqual(W.clamp(5, 0, 3), 3);
  assert.strictEqual(W.dist(0, 0, 3, 4), 5);
});

test('next map is always a different one from the list', () => {
  const W = load('core.js');
  const order = ['a', 'b', 'c'];
  for (const r of [0, 0.4, 0.99]) {
    const next = W.nextMap(order, 'b', () => r);
    assert.ok(order.includes(next) && next !== 'b', `got ${next}`);
  }
  const seen = new Set([0, 0.5, 0.99].map(r => W.nextMap(order, 'a', () => r)));
  assert.deepStrictEqual([...seen].sort(), ['b', 'c']);
  assert.strictEqual(W.nextMap(['a'], 'a', () => 0.5), 'a');
});
