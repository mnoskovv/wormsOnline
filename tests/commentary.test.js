const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'commentary.js');

const game = { current: 0, worms: [{ id: 0 }, { id: 1 }] };
const say = (c, ...events) => events.flatMap(e => Array.from(c.feed(e, game)));

test('jump says jump', () => {
  const c = new W.Commentary(() => true);
  assert.deepStrictEqual(say(c, { type: 'jump', worm: game.worms[0] }), ['jump']);
});

test('turn start waits for orders only for a local player', () => {
  const c = new W.Commentary(p => p === 0);
  assert.deepStrictEqual(say(c, { type: 'turnStart', player: 0 }), ['waiting']);
  assert.deepStrictEqual(say(c, { type: 'turnStart', player: 1 }), []);
});

test('shot without damage is a miss', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'shot', weapon: 'bazooka' }, { type: 'explosion', x: 1, y: 1, r: 40 },
    { type: 'turnStart', player: 1 }), ['miss']);
});

test('hurting yourself is treason', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'shot', weapon: 'bazooka' }, { type: 'damage', worm: game.worms[0], dmg: 20 },
    { type: 'damage', worm: game.worms[1], dmg: 20 }, { type: 'turnStart', player: 1 }), ['traitor']);
});

test('hitting the enemy says nothing special', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'shot', weapon: 'bazooka' }, { type: 'damage', worm: game.worms[1], dmg: 20 },
    { type: 'turnStart', player: 1 }), []);
});

test('no shot means no miss', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'turnStart', player: 1 }), []);
});

test('the turn verdict also comes at game over', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'shot', weapon: 'dynamite' }, { type: 'damage', worm: game.worms[0], dmg: 75 },
    { type: 'gameover', winner: 1 }), ['traitor']);
});

test('teleport is not a miss', () => {
  const c = new W.Commentary(() => false);
  assert.deepStrictEqual(say(c, { type: 'shot', weapon: 'teleport' }, { type: 'turnStart', player: 1 }), []);
});
