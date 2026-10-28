// net.js с поддельным PeerJS: проверяем, как хост переживает сбои.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
  emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); }
}

class FakeConn extends Emitter {
  constructor() { super(); this.open = false; this.sent = []; this.closed = false; }
  send(m) { this.sent.push(m); }
  close() { this.closed = true; }
  doOpen() { this.open = true; this.emit('open'); }
}

function setup() {
  const peers = [];
  class FakePeer extends Emitter {
    constructor(id) { super(); this.id = id; this.destroyed = false; this.reconnects = 0; peers.push(this); }
    destroy() { this.destroyed = true; }
    reconnect() { this.reconnects++; }
  }
  const timers = [];
  const ctx = {
    console, Date, Math,
    setInterval: () => 0, clearInterval: () => {},
    setTimeout: (f) => { timers.push(f); return 0; }, clearTimeout: () => {},
    Peer: FakePeer,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const file = path.join(__dirname, '..', 'js', 'net.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const log = [];
  const s = ctx.W.Net.host({
    onRoom: c => log.push('room'), onOpen: () => log.push('open'), onMessage: m => log.push('msg'),
    onClose: () => log.push('close'), onError: e => log.push('error ' + e),
  });
  return { s, peers, log, timers };
}

function joinGuest(t) {
  const conn = new FakeConn();
  t.peers[t.peers.length - 1].emit('connection', conn);
  return conn;
}

test('broker reconnect mid-match does not show the lobby again', () => {
  const t = setup();
  t.peers[0].emit('open');
  joinGuest(t).doOpen();
  t.peers[0].emit('disconnected');
  t.peers[0].emit('open');
  assert.deepStrictEqual(t.log, ['room', 'open']);
});

test('unavailable-id after the guest connected does not destroy the peer', () => {
  const t = setup();
  t.peers[0].emit('open');
  joinGuest(t).doOpen();
  t.peers[0].emit('error', { type: 'unavailable-id' });
  assert.strictEqual(t.peers[0].destroyed, false);
  assert.strictEqual(t.peers.length, 1);
  assert.deepStrictEqual(t.log, ['room', 'open']);
});

test('guest that never connected frees the room', () => {
  const t = setup();
  t.peers[0].emit('open');
  joinGuest(t).emit('close');
  assert.deepStrictEqual(t.log, ['room']);
  const c2 = joinGuest(t);
  c2.doOpen();
  assert.deepStrictEqual(t.log, ['room', 'open']);
  assert.ok(!c2.sent.some(m => m.t === 'reject'));
});

test('rejected guest frees the room', () => {
  const t = setup();
  t.peers[0].emit('open');
  const c1 = joinGuest(t);
  c1.doOpen();
  t.s.reject('version');
  assert.strictEqual(JSON.stringify(c1.sent.at(-1)), JSON.stringify({ t: 'reject', reason: 'version' }));
  t.timers.forEach(f => f());
  assert.ok(c1.closed);
  c1.emit('close');
  const c2 = joinGuest(t);
  c2.doOpen();
  assert.ok(!c2.sent.some(m => m.t === 'reject'));
  assert.deepStrictEqual(t.log, ['room', 'open', 'open']);
});
