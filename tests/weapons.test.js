const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');
const W = load('core.js', 'terrain.js', 'physics.js', 'explosion.js', 'weapons.js');
const DT = W.CFG.DT;

function makeGame(bx = 800, seed = 1) {
  const terrain = new W.Terrain(1600, 800);
  terrain.fillRect(0, 500, 1600, 300);
  const a = W.makeWorm(0, 'A', 400, 490);
  const b = W.makeWorm(1, 'B', bx, 490);
  a.grounded = b.grounded = true;
  return {
    terrain, worms: [a, b], projectiles: [], events: [], rng: W.rng(seed),
    ammo: [W.initialAmmo(), W.initialAmmo()], current: 0, fuse: [3, 3], wind: 0,
  };
}

function simulate(game, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) W.updateProjectiles(game, DT);
}

test('weapon order and table match the spec', () => {
  assert.deepStrictEqual(Array.from(W.WEAPON_ORDER),
    ['bazooka', 'grenade', 'mortar', 'shotgun', 'sniper', 'dynamite', 'airstrike', 'teleport']);
  const ammo = W.initialAmmo();
  assert.deepStrictEqual(Array.from(W.WEAPON_ORDER, id => ammo[id]), [Infinity, Infinity, 3, Infinity, Infinity, 2, 1, 2]);
  assert.strictEqual(W.WEAPONS.bazooka.name, 'Базука');
});

test('bazooka shot reaches B and hurts it', () => {
  const g = makeGame();
  assert.ok(W.fireWeapon(g, g.worms[0], { weapon: 'bazooka', angle: -0.23, power: 1 }));
  simulate(g, 2);
  assert.ok(g.worms[1].hp < 100, `hp=${g.worms[1].hp}`);
  assert.ok(g.events.some(e => e.type === 'explosion' && e.r === 40));
});

test('sniper damage grows with distance', () => {
  const g = makeGame();
  W.fireWeapon(g, g.worms[0], { weapon: 'sniper', angle: 0, power: 1 });
  assert.strictEqual(g.worms[1].hp, 100 - 35);
});

test('shotgun at point blank deals a multiple of 6 up to 42', () => {
  const g = makeGame(430);
  W.fireWeapon(g, g.worms[0], { weapon: 'shotgun', angle: 0, power: 1 });
  const dmg = 100 - g.worms[1].hp;
  assert.ok(dmg >= 6 && dmg <= 42 && dmg % 6 === 0, `dmg=${dmg}`);
});

test('mortar ammo runs out after 3 shots', () => {
  const g = makeGame();
  for (let i = 0; i < 3; i++) assert.ok(W.fireWeapon(g, g.worms[0], { weapon: 'mortar', angle: -1, power: 0.5 }));
  assert.strictEqual(g.ammo[0].mortar, 0);
  assert.strictEqual(W.fireWeapon(g, g.worms[0], { weapon: 'mortar', angle: -1, power: 0.5 }), false);
});

test('mortar impact spawns exactly 5 fragments, deterministic per seed', () => {
  const positions = [];
  for (let run = 0; run < 2; run++) {
    const g = makeGame(800, 99);
    W.IMPACT.mortar(g, { x: 600, y: 495, owner: g.worms[0] });
    const frags = g.projectiles.filter(p => p.onImpact === 'fragment');
    assert.strictEqual(frags.length, 5);
    positions.push(JSON.stringify(frags.map(p => [p.vx, p.vy])));
  }
  assert.strictEqual(positions[0], positions[1]);
});

test('airstrike drops 5 rockets 30px apart around the target', () => {
  const g = makeGame();
  assert.ok(W.fireWeapon(g, g.worms[0], { weapon: 'airstrike', target: { x: 1000, y: 300 } }));
  const xs = g.projectiles.map(p => p.x).sort((a, b) => a - b);
  assert.deepStrictEqual(xs, [940, 970, 1000, 1030, 1060]);
});

test('teleport rejects solid or off-map targets without spending ammo', () => {
  const g = makeGame();
  const a = g.worms[0];
  assert.strictEqual(W.fireWeapon(g, a, { weapon: 'teleport', target: { x: 800, y: 600 } }), false);
  assert.strictEqual(W.fireWeapon(g, a, { weapon: 'teleport', target: { x: -50, y: 100 } }), false);
  assert.strictEqual(W.fireWeapon(g, a, { weapon: 'teleport', target: { x: NaN, y: NaN } }), false);
  assert.strictEqual(W.fireWeapon(g, a, { weapon: 'airstrike', target: { x: NaN, y: 0 } }), false);
  assert.strictEqual(g.ammo[0].airstrike, 1);
  assert.strictEqual(g.ammo[0].teleport, 2);
  assert.strictEqual(W.fireWeapon(g, a, { weapon: 'teleport', target: { x: 1000, y: 300 } }), true);
  assert.deepStrictEqual([a.x, a.y], [1000, 300]);
  assert.strictEqual(g.ammo[0].teleport, 1);
});

test('dynamite explodes after 4 seconds with radius 60', () => {
  const g = makeGame();
  W.fireWeapon(g, g.worms[0], { weapon: 'dynamite', angle: 0, power: 0 });
  let time = 0;
  while (!g.events.some(e => e.type === 'explosion') && time < 6) {
    W.updateProjectiles(g, DT);
    time += DT;
  }
  const ex = g.events.find(e => e.type === 'explosion');
  assert.ok(ex && ex.r === 60);
  assert.ok(Math.abs(time - 4) <= 0.05, `time=${time}`);
});
