// Хэллоуин: тёмная площадка, светящиеся тыквы, шляпа ведьмы, кривые деревья, свечи.
(function (W) {
  const A = W.Art;
  const OUT = '#2a1020';

  const SLAB = [[200, 800], [188, 700], [228, 642], [400, 624], [600, 634], [800, 628], [1000, 638], [1200, 626], [1380, 636], [1420, 690], [1412, 800]];

  function slab(ctx) {
    A.shape(ctx, c => A.smooth(c, SLAB), A.vgrad(ctx, 610, 800, ['#6a4a64', '#4a2f48', '#341f34']), OUT, 5);
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, SLAB);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const [x, y] of [[320, 690], [520, 720], [760, 680], [980, 730], [1220, 690], [640, 760], [1100, 770]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    A.grass(ctx, [[260, 636], [700, 632], [930, 636], [1330, 632]], '#3f8a2a', 12);
  }

  function crookedTree(ctx, x, dir) {
    A.shape(ctx, c => {
      c.moveTo(x - 30, 632);
      c.quadraticCurveTo(x - 10, 520, x - 22, 420);
      c.quadraticCurveTo(x - 30, 360, x - 10, 300);
      c.lineTo(x - 4, 250);
      c.lineTo(x + 8, 300);
      c.quadraticCurveTo(x + 24, 380, x + 18, 440);
      c.quadraticCurveTo(x + 14, 540, x + 34, 632);
      c.closePath();
    }, A.vgrad(ctx, 250, 632, ['#6b4430', '#4a2c1e']), OUT, 4);
    // Ветви: одна в сторону сцены, одна вверх-наружу.
    A.shape(ctx, c => {
      c.moveTo(x - 4, 380);
      c.quadraticCurveTo(x + dir * 60, 350, x + dir * 110, 300);
      c.lineTo(x + dir * 118, 312);
      c.quadraticCurveTo(x + dir * 70, 372, x + 10, 404);
      c.closePath();
      c.moveTo(x - 6, 330);
      c.quadraticCurveTo(x - dir * 40, 300, x - dir * 70, 250);
      c.lineTo(x - dir * 60, 246);
      c.quadraticCurveTo(x - dir * 30, 290, x + 2, 312);
      c.closePath();
    }, '#5a3626', OUT, 4);
    // Дупло-глаза.
    A.shape(ctx, c => c.ellipse(x, 470, 16, 22, 0, 0, Math.PI * 2), '#1a0a12', null);
    for (const ex of [-6, 6]) {
      A.shape(ctx, c => { c.moveTo(x + ex - 5, 466); c.lineTo(x + ex + 5, 462); c.lineTo(x + ex, 472); c.closePath(); }, '#ff9a1f', null);
    }
    candle(ctx, x + dir * 104, 298);
    candle(ctx, x - dir * 64, 246);
  }

  function candle(ctx, x, y) {
    A.shape(ctx, c => c.roundRect(x - 6, y - 22, 12, 22, 3), '#f3ead2', '#5a4a3a', 2.5);
    A.shape(ctx, c => { c.moveTo(x, y - 38); c.quadraticCurveTo(x + 6, y - 28, x, y - 22); c.quadraticCurveTo(x - 6, y - 28, x, y - 38); }, '#ffcf3a', '#e8731a', 2);
  }

  function pumpkin(ctx, x, y, rx, ry, face) {
    A.shape(ctx, c => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), A.vgrad(ctx, y - ry, y + ry, ['#ffb43b', '#f07a12', '#c0500a']), '#5a2406', 4);
    ctx.strokeStyle = 'rgba(120,40,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const k of [-0.55, 0, 0.55]) {
      ctx.moveTo(x + rx * k, y - ry + 6);
      ctx.quadraticCurveTo(x + rx * k * 1.5, y, x + rx * k, y + ry - 6);
    }
    ctx.stroke();
    A.shape(ctx, c => { c.moveTo(x - 6, y - ry + 4); c.quadraticCurveTo(x, y - ry - 22, x + 14, y - ry - 26); c.lineTo(x + 10, y - ry + 4); c.closePath(); }, '#5a8a2a', '#22330f', 3);
    if (!face) return;
    const glow = '#ffe36a';
    A.shape(ctx, c => {
      c.moveTo(x - rx * 0.5, y - ry * 0.25); c.lineTo(x - rx * 0.15, y - ry * 0.05); c.lineTo(x - rx * 0.5, y + ry * 0.02); c.closePath();
      c.moveTo(x + rx * 0.5, y - ry * 0.25); c.lineTo(x + rx * 0.15, y - ry * 0.05); c.lineTo(x + rx * 0.5, y + ry * 0.02); c.closePath();
      c.moveTo(x - rx * 0.6, y + ry * 0.2);
      c.quadraticCurveTo(x, y + ry * 0.75, x + rx * 0.6, y + ry * 0.2);
      c.lineTo(x + rx * 0.3, y + ry * 0.32); c.lineTo(x + rx * 0.15, y + ry * 0.2); c.lineTo(x, y + ry * 0.36);
      c.lineTo(x - rx * 0.15, y + ry * 0.2); c.lineTo(x - rx * 0.3, y + ry * 0.32); c.closePath();
    }, glow, '#7a2a06', 2.5);
  }

  function witchHat(ctx, x, y) {
    A.shape(ctx, c => c.ellipse(x, y, 62, 14, -0.1, 0, Math.PI * 2), '#a2286e', '#3a0a26', 4);
    A.shape(ctx, c => { c.moveTo(x - 34, y - 4); c.quadraticCurveTo(x - 14, y - 70, x + 4, y - 96); c.quadraticCurveTo(x + 44, y - 110, x + 50, y - 82); c.quadraticCurveTo(x + 22, y - 74, x + 32, y - 4); c.closePath(); }, '#b8327c', '#3a0a26', 4);
    A.shape(ctx, c => c.rect(x - 30, y - 22, 60, 12), '#4a1a3a', '#3a0a26', 2.5);
    A.shape(ctx, c => c.rect(x - 8, y - 24, 16, 16), '#ffcf3a', '#5a3a06', 2.5);
  }

  function cauldron(ctx, x, y) {
    A.shape(ctx, c => { c.moveTo(x - 60, y - 50); c.lineTo(x + 60, y - 50); c.quadraticCurveTo(x + 72, y + 10, x + 40, y + 44); c.lineTo(x - 40, y + 44); c.quadraticCurveTo(x - 72, y + 10, x - 60, y - 50); }, A.vgrad(ctx, y - 50, y + 44, ['#5c5864', '#2e2a34']), '#141018', 4);
    A.shape(ctx, c => c.ellipse(x, y - 50, 66, 14, 0, 0, Math.PI * 2), '#6e6a78', '#141018', 4);
    A.shape(ctx, c => c.ellipse(x, y - 50, 52, 8, 0, 0, Math.PI * 2), '#7bd35a', null);
    A.shape(ctx, c => A.circles(c, [[x - 18, y - 60, 7], [x + 12, y - 64, 5], [x + 26, y - 56, 4]]), '#a6ef7f', '#3e7a2a', 2);
  }

  function candies(ctx) {
    for (const [x, y, col] of [[600, 626, '#ff5a8a'], [860, 628, '#5ad1ff'], [1170, 624, '#ffd23f']]) {
      A.shape(ctx, c => { c.moveTo(x - 16, y - 6); c.lineTo(x - 8, y); c.lineTo(x - 16, y + 6); c.closePath(); c.moveTo(x + 16, y - 6); c.lineTo(x + 8, y); c.lineTo(x + 16, y + 6); c.closePath(); }, col, '#3a1020', 2);
      A.shape(ctx, c => c.ellipse(x, y, 9, 7, 0, 0, Math.PI * 2), col, '#3a1020', 2);
    }
    // Леденец-спираль.
    A.shape(ctx, c => c.rect(1340, 560, 5, 70), '#f3ead2', '#3a1020', 1.5);
    A.shape(ctx, c => A.circles(c, [[1342, 552, 20]]), '#ffe46a', '#3a1020', 3);
    ctx.strokeStyle = '#d23b8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let t = 0; t < 11; t += 0.2) {
      const r = t * 1.6;
      const px = 1342 + Math.cos(t) * r, py = 552 + Math.sin(t) * r;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function broom(ctx) {
    A.shape(ctx, c => { c.moveTo(352, 640); c.lineTo(400, 470); c.lineTo(408, 472); c.lineTo(362, 642); c.closePath(); }, '#8a5a2b', OUT, 3);
    A.shape(ctx, c => { c.moveTo(338, 630); c.lineTo(366, 580); c.lineTo(382, 586); c.lineTo(372, 640); c.closePath(); }, '#d9a94a', '#5a3a06', 3);
  }

  W.MAPS = W.MAPS || {};
  W.MAPS.halloween = {
    id: 'halloween',
    name: 'Хэллоуин',
    spawnXs: [620, 1200],
    waterColor: ['#6a3c8a', '#2a1440'],
    burnColor: 'rgba(20, 8, 14, 0.9)',
    dirtColors: ['#4a2f48', '#6a4a64', '#f07a12'],
    drawSky(ctx, w, h) {
      ctx.fillStyle = A.vgrad(ctx, 0, h, ['#2e0f26', '#6a2648', '#a8486a', '#c86a7a']);
      ctx.fillRect(0, 0, w, h);
      A.shape(ctx, c => A.circles(c, [[1380, 140, 60]]), 'rgba(255,240,200,0.9)', null);
      A.shape(ctx, c => A.circles(c, [[1400, 128, 54]]), '#6a2648', null);
      A.cloud(ctx, 300, 110, 1.3, '#9a5a7a', '#5e2e48');
      A.cloud(ctx, 900, 70, 1.0, '#9a5a7a', '#5e2e48');
      A.cloud(ctx, 1150, 210, 0.8, '#9a5a7a', '#5e2e48');
    },
    drawBackdrop(ctx) {
      ctx.fillStyle = 'rgba(110, 40, 80, 0.55)';
      ctx.beginPath();
      A.smooth(ctx, [[0, 800], [0, 640], [200, 600], [500, 650], [800, 600], [1100, 640], [1400, 610], [1600, 640], [1600, 800]]);
      ctx.fill();
      // Замок.
      ctx.beginPath();
      ctx.rect(700, 330, 200, 300);
      ctx.rect(660, 260, 60, 370);
      ctx.rect(880, 280, 60, 350);
      ctx.moveTo(650, 262); ctx.lineTo(690, 190); ctx.lineTo(730, 262);
      ctx.moveTo(870, 282); ctx.lineTo(910, 210); ctx.lineTo(950, 282);
      ctx.moveTo(760, 332); ctx.lineTo(800, 260); ctx.lineTo(840, 332);
      ctx.fill();
      // Кресты.
      for (const [x, y] of [[120, 560], [210, 590], [1480, 560], [1540, 600]]) {
        ctx.fillRect(x - 5, y - 50, 10, 70);
        ctx.fillRect(x - 20, y - 35, 40, 10);
      }
    },
    drawTerrain(ctx) {
      crookedTree(ctx, 300, -1);
      crookedTree(ctx, 1310, 1);
      slab(ctx);
      broom(ctx);
      pumpkin(ctx, 470, 572, 82, 62, true);
      witchHat(ctx, 466, 512);
      cauldron(ctx, 760, 586);
      pumpkin(ctx, 930, 598, 46, 34, true);
      pumpkin(ctx, 1080, 566, 88, 68, true);
      candies(ctx);
    },
  };
})(window.W = window.W || {});
