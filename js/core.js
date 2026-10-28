// Общие константы и утилиты. Логика игры не трогает DOM.
(function (W) {
  W.CFG = {
    WORLD_W: 1600, WORLD_H: 800, WATER_Y: 760, DT: 1 / 60,
    GRAVITY: 900, WIND_MAX: 10, WIND_ACCEL: 15,
    TURN_TIME: 30, RETREAT_TIME: 3, HP: 100,
    WORM_R: 10, WALK_SPEED: 70, MAX_CLIMB: 6,
    JUMP_VX: 180, JUMP_VY: -230, BACKJUMP_VX: -40, BACKJUMP_VY: -370,
    AIM_SPEED: 1.2, FALL_SAFE: 60, FALL_DIV: 4, FALL_MAX: 30,
    MAX_SHOT_SPEED: 900, CHARGE_TIME: 1.5, OFFWORLD_MARGIN: 200,
  };

  // Флаги фич: выключенное есть в коде, но не работает.
  W.FEATURES = {
    voice: false, // голос червяков («Прыжок!», «Жду приказа!»…)
  };

  // mulberry32
  W.rng = function (seed) {
    let a = seed >>> 0;
    const next = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Состояние — число, чтобы его можно было положить в снимок.
    next.getState = () => a;
    next.setState = (s) => { a = s >>> 0; };
    return next;
  };

  W.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  W.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
})(window.W = window.W || {});
