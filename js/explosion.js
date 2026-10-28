// Взрыв: дыра в земле, урон с линейным спадом и отбрасывание.
(function (W) {
  const C = W.CFG;

  W.explode = function (terrain, worms, x, y, radius, damage) {
    terrain.carve(x, y, radius);
    const hits = [];
    for (const w of worms) {
      if (w.dead) continue;
      const d = W.dist(x, y, w.x, w.y);
      const k = W.clamp(1 - d / (radius + C.WORM_R), 0, 1);
      const dmg = Math.round(damage * k);
      if (dmg <= 0) continue;
      w.hp -= dmg;
      const nx = d > 0 ? (w.x - x) / d : 0;
      const ny = d > 0 ? (w.y - y) / d : -1;
      w.vx += nx * dmg * 6;
      w.vy += ny * dmg * 6 - dmg * 3;
      w.grounded = false;
      w.fallStartY = w.y;
      w.jumped = false;
      hits.push({ worm: w, dmg });
    }
    return hits;
  };
})(window.W = window.W || {});
