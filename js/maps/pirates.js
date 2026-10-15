// Пиратский остров: песчаная горка, сундук с золотом, скелет, пальма, скала.
(function (W) {
  const A = W.Art;
  const OUT = '#6b4414';

  const MOUND = [[250, 800], [292, 700], [380, 640], [520, 600], [690, 556], [800, 520], [930, 530], [1070, 584], [1210, 628], [1320, 690], [1350, 800]];
  const ROCK = [[1390, 800], [1398, 720], [1440, 680], [1500, 668], [1550, 690], [1570, 740], [1566, 800]];

  function mound(ctx) {
    A.shape(ctx, c => A.smooth(c, MOUND), A.vgrad(ctx, 510, 800, ['#ffe69a', '#f2c96a', '#d9a94a']), OUT, 5);
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, MOUND);
    ctx.clip();
    ctx.fillStyle = 'rgba(170,110,30,0.25)';
    for (const [x, y, r] of [[480, 680, 50], [760, 640, 70], [1000, 700, 60], [640, 740, 40], [1180, 720, 40]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    A.shape(ctx, c => A.smooth(c, ROCK), A.vgrad(ctx, 660, 800, ['#a59ab8', '#7a6e92', '#5a4f70']), '#2e2840', 5);
    A.shape(ctx, c => c.ellipse(1480, 700, 26, 10, -0.2, 0, Math.PI * 2), 'rgba(255,255,255,0.18)', null);
  }

  function palm(ctx, x) {
    A.shape(ctx, c => {
      c.moveTo(x - 18, 650);
      c.quadraticCurveTo(x - 30, 480, x + 30, 330);
      c.lineTo(x + 50, 336);
      c.quadraticCurveTo(x - 4, 490, x + 14, 650);
      c.closePath();
    }, A.vgrad(ctx, 330, 650, ['#c99a5a', '#9a6a32']), '#4a2c10', 4);
    ctx.strokeStyle = '#7a4e1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0.1; t < 1; t += 0.09) {
      const px = (1 - t) * (1 - t) * (x - 2) + 2 * (1 - t) * t * (x - 18) + t * t * (x + 40);
      const py = (1 - t) * (1 - t) * 650 + 2 * (1 - t) * t * 480 + t * t * 333;
      ctx.moveTo(px - 14, py + 4);
      ctx.lineTo(px + 14, py - 4);
    }
    ctx.stroke();
    const top = [x + 40, 330];
    const leaves = [[-150, 30], [-110, -40], [-20, -80], [80, -50], [150, 20], [100, 70], [-60, 60]];
    for (const [dx, dy] of leaves) {
      A.shape(ctx, c => {
        c.moveTo(top[0], top[1]);
        c.quadraticCurveTo(top[0] + dx * 0.4 - dy * 0.3, top[1] + dy * 0.4 - 30 + Math.abs(dx) * 0.1, top[0] + dx, top[1] + dy);
        c.quadraticCurveTo(top[0] + dx * 0.5, top[1] + dy * 0.5 + 18, top[0], top[1] + 8);
        c.closePath();
      }, A.vgrad(ctx, top[1] - 80, top[1] + 80, ['#7fd04a', '#3f9a2a']), '#1f4a12', 3.5);
    }
    A.shape(ctx, c => A.circles(c, [[top[0] - 12, top[1] + 10, 11], [top[0] + 8, top[1] + 14, 11]]), '#7a4e1e', '#3a2208', 3);
  }

  function chest(ctx, x, y) {
    // Горка золота сверху.
    const coins = [];
    for (let i = 0; i < 18; i++) coins.push([x - 50 + (i % 6) * 20, y - 74 - Math.floor(i / 6) * 10 + (i % 2) * 4, 11]);
    A.blob(ctx, [[x, y - 70, 48], [x - 30, y - 62, 30], [x + 30, y - 62, 30]], '#ffd23f', '#8a5a06', 4);
    for (const [cx, cy] of coins.slice(0, 10)) {
      A.shape(ctx, c => c.ellipse(cx, cy - 6, 9, 6, 0, 0, Math.PI * 2), '#ffe680', '#a8730c', 2);
    }
    // Открытая крышка.
    A.shape(ctx, c => { c.moveTo(x - 66, y - 60); c.lineTo(x - 50, y - 128); c.quadraticCurveTo(x + 10, y - 150, x + 70, y - 120); c.lineTo(x + 66, y - 60); c.closePath(); }, '#8a4f22', '#3a1e08', 4);
    A.shape(ctx, c => { c.moveTo(x - 50, y - 128); c.quadraticCurveTo(x + 10, y - 150, x + 70, y - 120); c.lineTo(x + 66, y - 108); c.quadraticCurveTo(x + 8, y - 136, x - 48, y - 114); c.closePath(); }, '#9aa0aa', '#3a3e48', 2.5);
    // Корпус.
    A.shape(ctx, c => c.roundRect(x - 70, y - 64, 140, 70, 8), A.vgrad(ctx, y - 64, y + 6, ['#a8622a', '#7a4218']), '#3a1e08', 4);
    A.shape(ctx, c => { c.rect(x - 70, y - 64, 140, 12); c.rect(x - 52, y - 64, 12, 70); c.rect(x + 40, y - 64, 12, 70); }, '#9aa0aa', '#3a3e48', 2.5);
    A.shape(ctx, c => c.roundRect(x - 12, y - 48, 24, 26, 4), '#ffd23f', '#6b4a06', 2.5);
  }

  function skeleton(ctx, x, y) {
    const bone = '#f3ecd8', edge = '#6b5a3a';
    // Череп.
    A.shape(ctx, c => { c.arc(x - 70, y - 18, 26, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(x - 52, y + 6); c.lineTo(x - 88, y + 6); c.closePath(); }, bone, edge, 3.5);
    A.shape(ctx, c => A.circles(c, [[x - 80, y - 18, 7], [x - 60, y - 18, 7]]), '#3a2a1a', null);
    // Позвоночник и рёбра.
    A.shape(ctx, c => c.roundRect(x - 50, y - 6, 110, 10, 5), bone, edge, 3);
    for (let i = 0; i < 4; i++) {
      const rx = x - 30 + i * 24;
      A.shape(ctx, c => { c.moveTo(rx, y - 2); c.quadraticCurveTo(rx - 18, y - 52, rx + 8, y - 66); c.lineTo(rx + 14, y - 58); c.quadraticCurveTo(rx - 4, y - 46, rx + 10, y - 2); c.closePath(); }, bone, edge, 3);
    }
  }

  function extras(ctx) {
    // Сабля, воткнутая в песок.
    A.shape(ctx, c => { c.moveTo(1150, 640); c.quadraticCurveTo(1168, 560, 1160, 520); c.lineTo(1170, 520); c.quadraticCurveTo(1180, 570, 1160, 642); c.closePath(); }, '#d6dbe4', '#3a3e48', 3);
    A.shape(ctx, c => { c.rect(1148, 506, 34, 8); c.rect(1159, 486, 8, 22); }, '#ffd23f', '#6b4a06', 2.5);
    // Камни и ракушки.
    for (const [x, y, r] of [[420, 640, 12], [1240, 634, 14], [980, 560, 10]]) {
      A.shape(ctx, c => c.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2), '#9a8fb2', '#3a3450', 3);
    }
    for (const [x, y] of [[620, 588], [1040, 576]]) {
      A.shape(ctx, c => { c.moveTo(x - 12, y + 6); c.quadraticCurveTo(x, y - 18, x + 12, y + 6); c.closePath(); }, '#ffb3c6', '#7a2f4a', 2.5);
    }
  }

  W.MAPS = W.MAPS || {};
  W.MAPS.pirates = {
    id: 'pirates',
    name: 'Пиратский остров',
    spawnXs: [330, 1480],
    waterColor: ['#4fa8c8', '#1e5a7e'],
    burnColor: 'rgba(90, 52, 14, 0.9)',
    dirtColors: ['#f2c96a', '#d9a94a', '#ffe69a'],
    drawSky(ctx, w, h) {
      ctx.fillStyle = A.vgrad(ctx, 0, h, ['#4a2e6e', '#a2467e', '#e46a72', '#f6a85a']);
      ctx.fillRect(0, 0, w, h);
      A.shape(ctx, c => A.circles(c, [[1180, 560, 110]]), 'rgba(255,214,120,0.75)', null);
      A.cloud(ctx, 220, 120, 1.1, '#f0a0b0', '#9a4a7a');
      A.cloud(ctx, 760, 80, 1.3, '#f0a0b0', '#9a4a7a');
      A.cloud(ctx, 1380, 160, 0.9, '#f0a0b0', '#9a4a7a');
    },
    drawBackdrop(ctx) {
      ctx.fillStyle = 'rgba(140, 50, 80, 0.5)';
      for (const [x, w, hgt] of [[60, 220, 90], [1500, 260, 110], [880, 300, 60]]) {
        ctx.beginPath();
        ctx.ellipse(x, 760, w / 2, hgt, 0, Math.PI, 0);
        ctx.fill();
      }
      for (const [x, s] of [[80, 1], [1540, 1.1], [900, 0.8]]) {
        ctx.beginPath();
        ctx.moveTo(x - 4 * s, 700);
        ctx.quadraticCurveTo(x + 10 * s, 600, x + 30 * s, 540 * (s > 1 ? 0.98 : 1));
        ctx.lineTo(x + 38 * s, 544);
        ctx.quadraticCurveTo(x + 18 * s, 610, x + 6 * s, 700);
        ctx.fill();
        for (const a of [-2.6, -2.1, -1.4, -0.8, -0.3]) {
          ctx.beginPath();
          ctx.ellipse(x + 34 * s + Math.cos(a) * 40 * s, 542 + Math.sin(a) * 26 * s, 44 * s, 10 * s, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    drawTerrain(ctx) {
      palm(ctx, 530);
      mound(ctx);
      skeleton(ctx, 690, 560);
      chest(ctx, 860, 520);
      extras(ctx);
    },
  };
})(window.W = window.W || {});
