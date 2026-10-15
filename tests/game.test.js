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

function newGame(terrain = flat(), spawnXs = [400, 1200], seed = 7) {
  return W.createGame({ terrain, spawnXs, names: ['A', 'B'], seed });
}

function run(g, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) W.stepGame(g, DT);
}

test('worms spawn on the ground without fall damage', () => {
  const g = newGame();
  run(g, 2);
  for (const w of g.worms) {
    assert.ok(w.grounded);
    assert.strictEqual(w.hp, 100);
  }
});

test('first player and wind are deterministic per seed', () => {
  const a = newGame(), b = newGame();
  assert.strictEqual(a.current, b.current);
  assert.strictEqual(a.wind, b.wind);
  assert.ok(Number.isInteger(a.wind) && a.wind >= -10 && a.wind <= 10);
  assert.strictEqual(a.phase, 'turn');
});

test('commands from the other player are rejected', () => {
  const g = newGame();
  assert.strictEqual(W.applyCommand(g, 1 - g.current, { type: 'walk', dir: 1 }), false);
  assert.strictEqual(W.applyCommand(g, g.current, { type: 'walk', dir: 1 }), true);
});

test('turn passes after the 30s timer runs out', () => {
  const g = newGame();
  const first = g.current;
  g.events.length = 0;
  run(g, 31);
  assert.strictEqual(g.current, 1 - first);
  assert.ok(g.turnTime > 29);
  assert.ok(g.events.some(e => e.type === 'turnStart' && e.player === 1 - first));
});

test('after firing: retreat phase, timer frozen while projectile flies, no second shot', () => {
  const g = newGame();
  const p = g.current;
  W.applyCommand(g, p, { type: 'aim', angle: -Math.PI / 2 + 0.3 });
  assert.ok(W.applyCommand(g, p, { type: 'fire', power: 1 }));
  assert.strictEqual(g.phase, 'retreat');
  run(g, 0.3);
  assert.strictEqual(g.projectiles.length, 1);
  assert.strictEqual(g.retreatTime, W.CFG.RETREAT_TIME);
  assert.strictEqual(W.applyCommand(g, p, { type: 'fire', power: 1 }), false);
  assert.strictEqual(W.applyCommand(g, p, { type: 'walk', dir: -1 }), true);
});

test('skip passes the turn once everything rests', () => {
  const g = newGame();
  const first = g.current;
  assert.ok(W.applyCommand(g, first, { type: 'skip' }));
  run(g, 1);
  assert.strictEqual(g.current, 1 - first);
  assert.strictEqual(g.phase, 'turn');
});

test('fall damage on own turn ends the turn', () => {
  const t = flat();
  t.fillRect(300, 250, 200, 20);
  const g = newGame(t, [400, 1200]);
  g.current = 0;
  assert.ok(Math.abs(g.worms[0].y - 240) <= 1);
  W.applyCommand(g, 0, { type: 'walk', dir: 1 });
  let sawSettling = false;
  for (let i = 0; i < 600 && g.worms[0].hp === 100; i++) W.stepGame(g, DT);
  sawSettling = g.phase === 'settling' || g.current === 1;
  assert.ok(g.worms[0].hp < 100);
  assert.ok(sawSettling, `phase=${g.phase}`);
});

test('drowning ends the match with the other player winning', () => {
  const t = new W.Terrain(1600, 800);
  t.fillRect(200, 500, 1200, 300);
  const g = newGame(t, [220, 1200]);
  g.current = 0;
  W.applyCommand(g, 0, { type: 'walk', dir: -1 });
  run(g, 5);
  assert.strictEqual(g.phase, 'gameover');
  assert.strictEqual(g.winner, 1);
});

test('both worms dying in one turn is a draw', () => {
  const g = newGame(flat(), [800, 800]);
  for (const w of g.worms) w.hp = 10;
  W.applyCommand(g, g.current, { type: 'select', weapon: 'dynamite' });
  assert.ok(W.applyCommand(g, g.current, { type: 'fire', power: 0 }));
  run(g, 10);
  assert.strictEqual(g.phase, 'gameover');
  assert.strictEqual(g.winner, 'draw');
});

test('straight-up bazooka shot does not hang the game', () => {
  const g = newGame();
  W.applyCommand(g, g.current, { type: 'aim', angle: -Math.PI / 2 });
  assert.ok(W.applyCommand(g, g.current, { type: 'fire', power: 1 }));
  run(g, 60);
  assert.ok(g.turnNumber >= 2 || g.phase === 'gameover', `phase=${g.phase} turn=${g.turnNumber}`);
});

test('jumping from the ground emits a jump event', () => {
  const g = newGame();
  run(g, 0.5);
  g.events.length = 0;
  assert.ok(W.applyCommand(g, g.current, { type: 'jump', back: false }));
  assert.ok(g.events.some(e => e.type === 'jump'));
});
