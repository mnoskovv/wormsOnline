const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js', 'explosion.js', 'weapons.js', 'game.js', 'bot.js');
const DT = W.CFG.DT;

function flat() {
  const t = new W.Terrain(1600, 800);
  t.fillRect(0, 500, 1600, 300);
  return t;
}

// Игра, где первым ходит нужный игрок.
function gameWithFirst(player, spawnXs = [400, 900]) {
  for (let seed = 1; ; seed++) {
    const g = W.createGame({ terrain: flat(), spawnXs, names: ['A', 'B'], seed });
    if (g.current === player) return g;
  }
}

function run(g, seconds, each) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (each) each();
    W.stepGame(g, DT);
  }
}

function plan(g, me, opts) {
  const it = W.planBotShot(g, me, opts);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

test('cloneGame is independent of the original', () => {
  const g = gameWithFirst(0);
  const c = W.cloneGame(g);
  c.terrain.carve(400, 500, 50);
  c.worms[0].x = 10;
  assert.ok(g.terrain.isSolid(400, 505));
  assert.notStrictEqual(g.worms[0].x, 10);
  assert.notStrictEqual(c.worms[0], g.worms[0]);
  assert.strictEqual(c.current, g.current);
});

test('planned shot hits the enemy on flat ground without wind', () => {
  const g = gameWithFirst(1);
  run(g, 1);
  g.wind = 0;
  const shot = plan(g, 1, { rand: () => 0.5, error: 0 });
  assert.ok(['bazooka', 'mortar'].includes(shot.weapon));
  assert.ok(shot.score > 0);
  W.applyCommand(g, 1, { type: 'select', weapon: shot.weapon });
  W.applyCommand(g, 1, { type: 'aim', angle: shot.angle });
  assert.ok(W.applyCommand(g, 1, { type: 'fire', power: shot.power }));
  run(g, 8);
  assert.ok(g.worms[0].hp < 100, `enemy hp ${g.worms[0].hp}`);
  assert.strictEqual(g.worms[1].hp, 100);
});

test('bot player takes its turn by itself and hurts the enemy', () => {
  const g = gameWithFirst(1);
  const bot = new W.BotPlayer(1, { rand: () => 0.5, error: 0 });
  run(g, 15, () => bot.update(g, DT));
  assert.ok(g.turnNumber >= 2, 'turn passed');
  assert.ok(g.worms[0].hp < 100, `enemy hp ${g.worms[0].hp}`);
});

test('bot does nothing on the other player turn', () => {
  const g = gameWithFirst(0);
  const bot = new W.BotPlayer(1, { rand: () => 0.5, error: 0 });
  const x = g.worms[1].x;
  run(g, 3, () => bot.update(g, DT));
  assert.strictEqual(g.turnNumber, 1);
  assert.strictEqual(g.projectiles.length, 0);
  assert.strictEqual(g.worms[1].x, x);
});
