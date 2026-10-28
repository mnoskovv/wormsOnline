const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js', 'explosion.js', 'weapons.js', 'game.js', 'sync.js');
const DT = W.CFG.DT;

function flat() {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  return t;
}

const json = (o) => JSON.parse(JSON.stringify(o));
const make = (seed, spawnXs) => W.createGame({ terrain: flat(), spawnXs, names: ['A', 'B'], seed });

// Пара клиентов, где первым ходит игрок 0, и «провод» между ними.
function pair(spawnXs = [400, 1200]) {
  let seed = 1;
  while (make(seed, spawnXs).current !== 0) seed++;
  const gA = make(seed, spawnXs), gB = make(seed, spawnXs);
  const toA = [], toB = [];
  const sA = new W.Sync(gA, 0, m => toB.push(json(m)));
  const sB = new W.Sync(gB, 1, m => toA.push(json(m)));
  const got = [];
  function deliver() {
    for (const m of toB.splice(0)) { const r = sB.receive(m); if (r) got.push(...r.events); }
    for (const m of toA.splice(0)) { const r = sA.receive(m); if (r) got.push(...r.events); }
  }
  function pump() {
    for (const [s, g] of [[sA, gA], [sB, gB]]) {
      if (!s.authority) continue;
      W.stepGame(g, DT);
      s.publish(g.events.splice(0), null);
      break;
    }
    deliver();
  }
  return { gA, gB, sA, sB, toA, toB, pump, got };
}

const same = (a, b) => assert.deepStrictEqual(json(W.snapshot(b.gB)), json(W.snapshot(a.gA)));

test('observer mirrors the authority', () => {
  const c = pair();
  assert.strictEqual(c.gA.current, 0);
  for (let i = 0; i < 60; i++) c.pump();
  W.applyCommand(c.gA, 0, { type: 'aim', angle: -0.5 });
  assert.ok(W.applyCommand(c.gA, 0, { type: 'fire', power: 0.7 }));
  for (let i = 0; i < 120; i++) c.pump();
  same(c, c);
});

function handOver(c) {
  for (let i = 0; i < 60; i++) c.pump();
  assert.ok(W.applyCommand(c.gA, 0, { type: 'skip' }));
  for (let i = 0; i < 20 / DT && c.gA.current !== 1; i++) c.pump();
  assert.strictEqual(c.gA.current, 1);
}

test('turn hands over to the other client', () => {
  const c = pair();
  handOver(c);
  assert.strictEqual(c.sB.authority, true);
  assert.strictEqual(c.sA.authority, false);
  for (let i = 0; i < 60; i++) c.pump();
  W.applyCommand(c.gB, 1, { type: 'aim', angle: Math.PI + 0.5 });
  assert.ok(W.applyCommand(c.gB, 1, { type: 'fire', power: 0.7 }));
  for (let i = 0; i < 200; i++) c.pump();
  same(c, c);
});

test('stale state after handover is ignored', () => {
  const c = pair();
  for (let i = 0; i < 10; i++) c.pump();
  c.sA.publish([], null);
  const old = c.toB.pop();
  handOver(c);
  W.applyCommand(c.gB, 1, { type: 'walk', dir: -1 });
  for (let i = 0; i < 30; i++) c.pump();
  const x = c.gB.worms[1].x;
  assert.notStrictEqual(x, old.s.worms[1].x);
  assert.strictEqual(c.sB.receive(old), null);
  assert.strictEqual(c.gB.worms[1].x, x);
});

test('events arrive decoded', () => {
  const c = pair([400, 470]);
  for (let i = 0; i < 60; i++) c.pump();
  W.applyCommand(c.gA, 0, { type: 'select', weapon: 'shotgun' });
  W.applyCommand(c.gA, 0, { type: 'aim', angle: 0 });
  assert.ok(W.applyCommand(c.gA, 0, { type: 'fire', power: 1 }));
  for (let i = 0; i < 5; i++) c.pump();
  const dmg = c.got.find(e => e.type === 'damage');
  assert.ok(dmg);
  assert.strictEqual(dmg.worm, c.gB.worms[1]);
});

test('authority ignores incoming state', () => {
  const c = pair();
  assert.strictEqual(c.sA.receive({ t: 'state', s: W.snapshot(c.gB), ev: [], charge: null }), null);
});
