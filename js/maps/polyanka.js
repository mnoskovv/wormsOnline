// Полянка: травяной холм с колодцем, большим деревом, корзиной яблок и мольбертом.
(function (W) {
  const A = W.Art;
  const OUT = '#2f4a14';

  const HILL = [[120, 800], [140, 700], [180, 635], [250, 598], [340, 582], [450, 586], [560, 604],
    [650, 612], [720, 594], [780, 566], [860, 552], [940, 560], [1010, 588], [1100, 616], [1200, 618],
    [1280, 594], [1350, 576], [1420, 584], [1468, 630], [1495, 700], [1505, 800]];

  function hill(ctx) {
    A.shape(ctx, c => A.smooth(c, HILL), A.vgrad(ctx, 540, 800, ['#9bd43a', '#6cb12a', '#4f8f22', '#3d7419']), OUT, 5);
    // Тропинка от колодца вниз.
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, HILL);
    ctx.clip();
    ctx.beginPath();
    A.smooth(ctx, [[880, 560], [930, 600], [960, 650], [940, 710], [980, 800]], false);
    ctx.lineWidth = 34;
    ctx.strokeStyle = '#e9d9a6';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(150,120,60,0.6)';
    ctx.stroke();
    // Светлые пятна травы.
    ctx.fillStyle = 'rgba(200,240,120,0.35)';
    for (const [x, y, rx] of [[300, 620, 60], [560, 640, 50], [1180, 650, 70], [1380, 620, 40], [760, 610, 40]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    A.grass(ctx, [[200, 625], [330, 588], [470, 592], [610, 612], [1040, 600], [1150, 620], [1310, 588], [1440, 600]], '#3f7a17', 12);
  }

  function tree(ctx) {
    A.shape(ctx, c => {
      c.moveTo(340, 600);
      c.quadraticCurveTo(372, 520, 366, 420);
      c.quadraticCurveTo(330, 380, 300, 372);
      c.lineTo(306, 360);
      c.quadraticCurveTo(350, 368, 372, 392);
      c.quadraticCurveTo(378, 350, 372, 320);
      c.lineTo(400, 320);
      c.quadraticCurveTo(404, 360, 398, 395);
      c.quadraticCurveTo(430, 365, 465, 360);
      c.lineTo(470, 372);
      c.quadraticCurveTo(425, 392, 402, 430);
      c.quadraticCurveTo(398, 520, 428, 600);
      c.closePath();
    }, A.vgrad(ctx, 320, 600, ['#9a6234', '#7a4a24']), '#3d2410', 4);
    const crown = [[300, 330, 68], [380, 268, 88], [462, 318, 70], [336, 222, 58], [432, 220, 58], [380, 352, 58], [250, 360, 40], [510, 360, 40]];
    A.blob(ctx, crown, A.vgrad(ctx, 160, 410, ['#c3e64a', '#8cc435', '#5f9b26']), OUT, 5);
    ctx.fillStyle = 'rgba(230,255,150,0.45)';
    for (const [x, y, r] of [[350, 215, 22], [420, 205, 18], [300, 300, 20], [460, 290, 16], [380, 250, 26]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Корни.
    A.shape(ctx, c => { c.moveTo(330, 602); c.quadraticCurveTo(345, 585, 360, 585); c.lineTo(352, 604); c.closePath(); }, '#7a4a24', '#3d2410', 3);
  }

  function bush(ctx) {
    A.blob(ctx, [[748, 548, 34], [790, 520, 40], [842, 506, 38], [900, 520, 34], [930, 545, 26]],
      A.vgrad(ctx, 470, 580, ['#6fb535', '#4b8a24']), OUT, 4);
    for (const [x, y] of [[760, 530], [800, 500], [850, 488], [900, 506], [780, 545], [920, 532]]) {
      A.shape(ctx, c => A.circles(c, [[x, y, 9]]), '#ef6fb4', '#8b2d63', 2.5);
      A.shape(ctx, c => A.circles(c, [[x, y, 3]]), '#ffd6ee', null);
    }
  }

  function well(ctx) {
    A.shape(ctx, c => { c.rect(781, 384, 12, 90); c.rect(877, 384, 12, 90); }, '#9a6234', '#3d2410', 3);
    A.shape(ctx, c => c.rect(770, 374, 132, 14), '#b07440', '#3d2410', 3);
    A.shape(ctx, c => c.rect(828, 388, 14, 40), '#d9c38a', '#6b5428', 2.5);
    A.shape(ctx, c => { c.moveTo(902, 381); c.lineTo(926, 381); c.lineTo(926, 404); }, 'rgba(0,0,0,0)', '#8d8d99', 5);
    A.shape(ctx, c => { c.moveTo(772, 470); c.lineTo(898, 470); c.lineTo(906, 562); c.lineTo(764, 562); c.closePath(); },
      A.vgrad(ctx, 470, 562, ['#e9e5da', '#c9c3b2']), '#4f4a40', 4);
    ctx.strokeStyle = '#9c9686';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let row = 0; row < 3; row++) {
      const y = 470 + 30 * (row + 1);
      ctx.moveTo(770, y);
      ctx.lineTo(902, y);
      for (let i = 0; i < 4; i++) {
        const x = 790 + i * 34 + (row % 2) * 17;
        ctx.moveTo(x, y - 30);
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    A.shape(ctx, c => c.ellipse(835, 470, 70, 16, 0, 0, Math.PI * 2), '#d6d0c2', '#4f4a40', 4);
    A.shape(ctx, c => c.ellipse(835, 470, 54, 9, 0, 0, Math.PI * 2), '#5d5850', null);
  }

  function basket(ctx) {
    for (const a of [[690, 566, 13], [712, 566, 13], [676, 584, 14], [724, 584, 14], [700, 578, 15]]) A.shape(ctx, c => A.circles(c, [a]), '#e53232', '#6e1414', 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (const [x, y] of [[672, 579], [696, 572], [720, 579], [686, 561], [708, 561]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    A.shape(ctx, c => { c.moveTo(656, 590); c.lineTo(744, 590); c.lineTo(734, 636); c.lineTo(666, 636); c.closePath(); },
      A.vgrad(ctx, 590, 636, ['#c98b45', '#9a6234']), '#3d2410', 4);
    ctx.strokeStyle = '#6b4220';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 602; y < 636; y += 11) { ctx.moveTo(660, y); ctx.lineTo(740, y); }
    for (let x = 672; x < 740; x += 14) { ctx.moveTo(x, 592); ctx.lineTo(x - 2, 634); }
    ctx.stroke();
  }

  function easel(ctx) {
    A.shape(ctx, c => {
      c.moveTo(1306, 588); c.lineTo(1340, 350); c.lineTo(1352, 350); c.lineTo(1320, 588); c.closePath();
      c.moveTo(1404, 588); c.lineTo(1368, 350); c.lineTo(1356, 350); c.lineTo(1390, 588); c.closePath();
    }, '#d6a560', '#5a3a16', 3);
    A.shape(ctx, c => c.rect(1284, 492, 136, 12), '#c99550', '#5a3a16', 3);
    A.shape(ctx, c => c.rect(1288, 380, 128, 104), '#d6a560', '#5a3a16', 4);
    A.shape(ctx, c => c.rect(1298, 390, 108, 84), A.vgrad(ctx, 390, 474, ['#4a3a8e', '#7f6fd0']), null);
    A.shape(ctx, c => A.circles(c, [[1388, 410, 10]]), '#ffe98a', null);
    A.shape(ctx, c => { c.moveTo(1298, 474); c.quadraticCurveTo(1352, 438, 1406, 468); c.lineTo(1406, 474); c.closePath(); }, '#2f6b3a', null);
    A.shape(ctx, c => c.rect(1336, 440, 30, 22), '#b9b4aa', '#333', 2);
    // Палитра.
    A.shape(ctx, c => c.ellipse(1395, 488, 30, 13, -0.2, 0, Math.PI * 2), '#e3c79a', '#5a3a16', 3);
    [['#e53232', 1380], ['#ffcc33', 1392], ['#3a8ee6', 1404], ['#4caf50', 1414]].forEach(([col, x]) => {
      A.shape(ctx, c => A.circles(c, [[x, 484, 4]]), col, null);
    });
  }

  function stones(ctx) {
    for (const [x, y, r] of [[560, 604, 10], [1010, 590, 9], [1230, 616, 11], [250, 602, 8], [1450, 612, 9]]) {
      A.shape(ctx, c => c.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2), '#b3a9c9', '#4f4866', 3);
    }
  }

  W.MAPS = W.MAPS || {};
  W.MAPS.polyanka = {
    id: 'polyanka',
    name: 'Полянка',
    spawnXs: [170, 1200],
    waterColor: ['#5fc3e4', '#2b7fb0'],
    burnColor: 'rgba(52, 36, 14, 0.9)',
    dirtColors: ['#6cb12a', '#4f8f22', '#8a5a2b'],
    drawSky(ctx, w, h) {
      ctx.fillStyle = A.vgrad(ctx, 0, h, ['#86c8ff', '#bfe3ff', '#eef8ff']);
      ctx.fillRect(0, 0, w, h);
      A.cloud(ctx, 260, 120, 1.3, '#f4fbff', '#9cc6ea');
      A.cloud(ctx, 1080, 90, 1.0, '#f4fbff', '#9cc6ea');
      A.cloud(ctx, 1420, 170, 0.7, '#f4fbff', '#9cc6ea');
    },
    drawBackdrop(ctx) {
      ctx.fillStyle = 'rgba(176, 170, 214, 0.55)';
      ctx.beginPath();
      A.smooth(ctx, [[0, 800], [0, 650], [120, 630], [260, 660], [420, 640], [600, 670], [800, 640], [1000, 660], [1200, 630], [1400, 655], [1600, 630], [1600, 800]]);
      ctx.fill();
      // Силуэты деревьев и скамейки.
      for (const [x, s] of [[60, 1], [1000, 1.2], [1540, 0.9]]) {
        ctx.beginPath();
        ctx.rect(x - 6 * s, 560 - 10 * s, 12 * s, 90 * s);
        A.circles(ctx, [[x, 520 - 10 * s, 40 * s], [x - 34 * s, 550, 28 * s], [x + 34 * s, 548, 28 * s]]);
        ctx.fill();
      }
      ctx.fillRect(1500, 610, 90, 10);
      ctx.fillRect(1505, 590, 80, 8);
      ctx.fillRect(1508, 610, 8, 40);
      ctx.fillRect(1574, 610, 8, 40);
    },
    drawTerrain(ctx) {
      tree(ctx);
      bush(ctx);
      hill(ctx);
      well(ctx);
      basket(ctx);
      easel(ctx);
      stones(ctx);
    },
  };
})(window.W = window.W || {});
