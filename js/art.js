// Помощники рисования в мультяшном стиле: сглаженные контуры, облака-завитушки.
(function (W) {
  const Art = {};

  // Гладкая замкнутая (или нет) кривая через точки (Catmull-Rom → Безье).
  Art.smooth = function (ctx, pts, closed = true) {
    const n = pts.length;
    const p = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  };

  // Залить и обвести толстым тёмным контуром.
  Art.shape = function (ctx, build, fill, stroke, lw = 4) {
    ctx.beginPath();
    build(ctx);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };

  Art.vgrad = function (ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };

  Art.circles = function (ctx, list) {
    for (const [x, y, r] of list) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  };

  // Набор кругов как одна фигура: общий контур без внутренних линий.
  Art.blob = function (ctx, list, fill, stroke, lw = 4) {
    ctx.beginPath();
    Art.circles(ctx, list.map(([x, y, r]) => [x, y, r + lw / 2]));
    ctx.fillStyle = stroke;
    ctx.fill();
    ctx.beginPath();
    Art.circles(ctx, list.map(([x, y, r]) => [x, y, r - lw / 2]));
    ctx.fillStyle = fill;
    ctx.fill();
  };

  // Облако с фирменной завитушкой.
  Art.cloud = function (ctx, x, y, s, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const parts = [[-38, 6, 22], [-12, -10, 30], [22, -4, 26], [46, 8, 18], [4, 10, 24]];
    ctx.beginPath();
    Art.circles(ctx, parts);
    ctx.fillStyle = stroke;
    ctx.fill();
    ctx.beginPath();
    Art.circles(ctx, parts.map(([a, b, r]) => [a, b, r - 3]));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.lineCap = 'round';
    for (let t = 0; t < 11; t += 0.2) {
      const r = 2 + t * 1.6;
      const px = -12 + Math.cos(t) * r, py = -8 + Math.sin(t) * r;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-58, 26);
    ctx.lineTo(62, 26);
    ctx.stroke();
    ctx.restore();
  };

  // Травинки вдоль кромки.
  Art.grass = function (ctx, pts, color, len = 10) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y] of pts) {
      ctx.moveTo(x - 5, y + 2);
      ctx.quadraticCurveTo(x - 4, y - len * 0.6, x - 8, y - len);
      ctx.moveTo(x, y + 2);
      ctx.quadraticCurveTo(x + 1, y - len * 0.8, x + 2, y - len * 1.2);
      ctx.moveTo(x + 5, y + 2);
      ctx.quadraticCurveTo(x + 6, y - len * 0.5, x + 10, y - len * 0.9);
    }
    ctx.stroke();
  };

  W.Art = Art;
})(window.W = window.W || {});
