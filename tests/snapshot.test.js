const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js', 'explosion.js', 'weapons.js', 'game.js');
const DT = W.CFG.DT;

function flat() {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  return t;
}

function newGame(seed = 7) {
  return W.createGame({ terrain: flat(), spawnXs: [400, 1200], names: ['A', 'B'], seed });
}

function run(g, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) W.stepGame(g, DT);
}

const json = (o) => JSON.parse(JSON.stringify(o));
const roundTrip = (from, to, holesFrom) => W.applySnapshot(to, json(W.snapshot(from, holesFrom)));

function fireBazooka(g) {
  const p = g.current;
  run(g, 1);
  W.applyCommand(g, p, { type: 'aim', angle: p === 0 ? -0.5 : Math.PI + 0.5 });
  assert.ok(W.applyCommand(g, p, { type: 'fire', power: 0.7 }));
}

test('rng state round-trips', () => {
  const r = W.rng(5);
  r();
  r();
  const s = r.getState();
  const a = r();
  r.setState(s);
  assert.strictEqual(r(), a);
});

test('snapshot survives JSON and recreates the same game', () => {
  const g1 = newGame();
  fireBazooka(g1);
  run(g1, 0.3);
  assert.strictEqual(g1.projectiles.length, 1);
  const g2 = newGame();
  roundTrip(g1, g2);
  assert.deepStrictEqual(json(W.snapshot(g2)), json(W.snapshot(g1)));
  run(g1, 3);
  run(g2, 3);
  assert.ok(g1.terrain.holes.length > 0);
  assert.deepStrictEqual(json(W.snapshot(g2)), json(W.snapshot(g1)));
});

test('infinite ammo stays infinite', () => {
  const g1 = newGame();
  const g2 = newGame();
  roundTrip(g1, g2);
  assert.strictEqual(g2.ammo[0].bazooka, Infinity);
  assert.strictEqual(g2.ammo[0].mortar, 3);
});

test("projectile owner becomes the receiving game's worm", () => {
  const g1 = newGame();
  fireBazooka(g1);
  run(g1, 0.1);
  const g2 = newGame();
  roundTrip(g1, g2);
  assert.strictEqual(g2.projectiles[0].owner, g2.worms[g2.current]);
});

test('holes apply incrementally without duplicates', () => {
  const g1 = newGame();
  const g2 = newGame();
  g1.terrain.carve(300, 500, 20);
  g1.terrain.carve(600, 510, 30);
  g1.terrain.carve(900, 520, 25);
  roundTrip(g1, g2, 0);
  g1.terrain.carve(1000, 500, 40);
  roundTrip(g1, g2, 3);
  assert.strictEqual(g2.terrain.holes.length, 4);
  roundTrip(g1, g2, 3);
  assert.strictEqual(g2.terrain.holes.length, 4);
  assert.strictEqual(Buffer.compare(Buffer.from(g1.terrain.mask), Buffer.from(g2.terrain.mask)), 0);
});

test('worm objects are updated in place', () => {
  const g1 = newGame();
  g1.worms[0].x = 432.5;
  const g2 = newGame();
  const w = g2.worms[0];
  roundTrip(g1, g2);
  assert.strictEqual(g2.worms[0], w);
  assert.strictEqual(w.x, 432.5);
});

test('events encode worm as id', () => {
  const g1 = newGame();
  const g2 = newGame();
  const e = { type: 'damage', worm: g1.worms[1], dmg: 7 };
  const enc = W.encodeEvent(e);
  assert.strictEqual(enc.worm, 1);
  assert.strictEqual(e.worm, g1.worms[1]);
  assert.strictEqual(W.decodeEvent(g2, json(enc)).worm, g2.worms[1]);
  const plain = { type: 'explosion', x: 1, y: 2, r: 3 };
  assert.deepStrictEqual(W.decodeEvent(g2, json(W.encodeEvent(plain))), plain);
});
