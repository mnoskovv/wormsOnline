// Реплики червяков по событиям игры. Только решает, что сказать; озвучка — в audio.js.
(function (W) {
  W.PHRASES = {
    jump: 'Прыжок!',
    waiting: 'Жду приказа!',
    miss: 'Не попал!',
    traitor: 'Предатель!',
  };

  // Оружие, после которого «Не попал» не говорят.
  const NO_MISS = ['teleport'];

  class Commentary {
    // isLocal(player) — сидит ли этот игрок за этим экраном (ему говорят «Жду приказа»).
    constructor(isLocal) {
      this.isLocal = isLocal;
      this.reset();
    }

    reset() {
      this.fired = false;
      this.shooter = null;
      this.enemyDmg = 0;
      this.selfDmg = 0;
    }

    verdict() {
      const out = [];
      if (this.fired) {
        if (this.selfDmg > 0) out.push('traitor');
        else if (this.enemyDmg === 0) out.push('miss');
      }
      this.reset();
      return out;
    }

    feed(e, game) {
      switch (e.type) {
        case 'jump': return ['jump'];
        case 'shot':
          if (!NO_MISS.includes(e.weapon)) {
            this.fired = true;
            this.shooter = game.current;
          }
          return [];
        case 'damage':
        case 'fallDamage': {
          if (!this.fired || !e.worm) return [];
          if (e.worm.id === this.shooter) this.selfDmg += e.dmg ?? e.amount ?? 0;
          else this.enemyDmg += e.dmg ?? e.amount ?? 0;
          return [];
        }
        case 'turnStart': {
          const out = this.verdict();
          if (this.isLocal(e.player)) out.push('waiting');
          return out;
        }
        case 'gameover': return this.verdict();
      }
      return [];
    }
  }

  W.Commentary = Commentary;
})(window.W = window.W || {});
