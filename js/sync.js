// Сетевая синхронизация: игру считает тот, чей ход, второй только применяет снимки.
(function (W) {
  class Sync {
    constructor(game, me, send) {
      this.game = game;
      this.me = me;
      this.send = send;
      this.sentHoles = 0;
    }

    get authority() { return this.game.current === this.me; }

    // Авторитет: отправить состояние и события кадра.
    publish(events, charge) {
      const g = this.game;
      this.send({ t: 'state', s: W.snapshot(g, this.sentHoles), ev: events.map(W.encodeEvent), charge: charge ?? null });
      this.sentHoles = g.terrain.holes.length;
    }

    // Наблюдатель: применить состояние. null — сообщение не принято.
    receive(msg) {
      const g = this.game;
      if (msg.t !== 'state' || this.authority || msg.s.turnNumber < g.turnNumber) return null;
      W.applySnapshot(g, msg.s);
      this.sentHoles = g.terrain.holes.length;
      return { events: msg.ev.map(e => W.decodeEvent(g, e)), charge: msg.charge };
    }
  }

  W.Sync = Sync;
})(window.W = window.W || {});
