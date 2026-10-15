// Дикий Запад: салун, водонапорная башня, мельница, офис шерифа, домик.
(function (W) {
  const A = W.Art;
  const OUT = '#5a3412';

  const GROUND = [[100, 800], [110, 700], [200, 662], [400, 652], [700, 656], [1000, 650], [1300, 656], [1480, 670], [1520, 722], [1510, 800]];

  function ground(ctx) {
    A.shape(ctx, c => A.smooth(c, GROUND), A.vgrad(ctx, 640, 800, ['#f0c27a', '#e0a85a', '#c08440']), OUT, 5);
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, GROUND);
    ctx.clip();
    ctx.fillStyle = 'rgba(140,80,30,0.25)';
    for (const [x, y] of [[300, 700], [600, 740], [900, 700], [1200, 730], [1400, 700]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Кактусы.
    for (const [x, s] of [[150, 1], [1450, 0.9]]) {
      A.shape(ctx, c => {
        c.roundRect(x - 10 * s, 600 * 1, 20 * s, 64, 10 * s);
        c.roundRect(x - 30 * s, 616, 14 * s, 26, 7 * s);
        c.roundRect(x + 16 * s, 608, 14 * s, 30, 7 * s);
        c.rect(x - 22 * s, 632, 14 * s, 10);
        c.rect(x + 8 * s, 626, 14 * s, 10);
      }, '#5aa83a', '#1f4a12', 3);
    }
  }

  function planks(ctx, x, y, w, h, step) {
    ctx.strokeStyle = 'rgba(70,40,10,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let yy = y + step; yy < y + h; yy += step) { ctx.moveTo(x + 2, yy); ctx.lineTo(x + w - 2, yy); }
    ctx.stroke();
  }

  function windowBox(ctx, x, y, w, h) {
    A.shape(ctx, c => c.rect(x, y, w, h), '#3a5a8a', '#3a2208', 3);
    ctx.strokeStyle = '#3a2208';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  }

  function saloon(ctx) {
    A.shape(ctx, c => { c.moveTo(280, 660); c.lineTo(280, 470); c.lineTo(300, 470); c.quadraticCurveTo(375, 410, 450, 470); c.lineTo(470, 470); c.lineTo(470, 660); c.closePath(); }, A.vgrad(ctx, 430, 660, ['#e8c27a', '#c99a5a']), OUT, 4);
    planks(ctx, 280, 470, 190, 190, 16);
    A.shape(ctx, c => c.roundRect(318, 446, 114, 30, 8), '#fff4dc', '#3a2208', 3);
    for (const [x, col] of [[340, '#d8312c'], [375, '#d8312c'], [410, '#d8312c']]) {
      A.shape(ctx, c => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; const b = a + Math.PI / 5; c.lineTo(x + Math.cos(a) * 9, 461 + Math.sin(a) * 9); c.lineTo(x + Math.cos(b) * 4, 461 + Math.sin(b) * 4); } c.closePath(); }, col, null);
    }
    A.shape(ctx, c => c.rect(270, 548, 210, 12), '#a8723a', OUT, 3);
    windowBox(ctx, 300, 494, 44, 40);
    windowBox(ctx, 406, 494, 44, 40);
    A.shape(ctx, c => c.rect(350, 580, 50, 80), '#7a4a24', OUT, 3);
    A.shape(ctx, c => c.roundRect(354, 562, 42, 14, 3), '#fff4dc', '#3a2208', 2);
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#3a2208';
    ctx.textAlign = 'center';
    ctx.fillText('BAR', 375, 573);
    // Флаг.
    A.shape(ctx, c => c.rect(286, 360, 6, 112), '#8a8a94', '#3a3a44', 2);
    A.shape(ctx, c => { c.moveTo(292, 364); c.quadraticCurveTo(320, 354, 350, 368); c.lineTo(350, 404); c.quadraticCurveTo(320, 392, 292, 400); c.closePath(); }, '#e84a4a', '#5a0e0e', 3);
    A.shape(ctx, c => c.rect(292, 364, 26, 18), '#3a5ab0', null);
  }

  function waterTower(ctx) {
    A.shape(ctx, c => {
      c.moveTo(560, 660); c.lineTo(580, 450); c.lineTo(590, 450); c.lineTo(572, 660); c.closePath();
      c.moveTo(660, 660); c.lineTo(640, 450); c.lineTo(630, 450); c.lineTo(648, 660); c.closePath();
      c.rect(574, 540, 74, 8);
    }, '#9a6234', '#3d2410', 3);
    A.shape(ctx, c => c.roundRect(560, 370, 100, 84, 12), A.vgrad(ctx, 370, 454, ['#c98a4a', '#9a6234']), '#3d2410', 4);
    ctx.strokeStyle = '#5a5e6a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (const y of [390, 434]) { ctx.moveTo(560, y); ctx.lineTo(660, y); }
    ctx.stroke();
    A.shape(ctx, c => { c.moveTo(552, 372); c.lineTo(610, 340); c.lineTo(668, 372); c.closePath(); }, '#7a4a24', '#3d2410', 3.5);
    A.shape(ctx, c => { c.moveTo(660, 400); c.lineTo(690, 400); c.lineTo(690, 430); }, 'rgba(0,0,0,0)', '#5a5e6a', 6);
  }

  function windmill(ctx) {
    A.shape(ctx, c => {
      c.moveTo(740, 660); c.lineTo(776, 400); c.lineTo(786, 400); c.lineTo(752, 660); c.closePath();
      c.moveTo(830, 660); c.lineTo(796, 400); c.lineTo(786, 400); c.lineTo(818, 660); c.closePath();
      c.rect(752, 560, 70, 7);
      c.rect(764, 480, 46, 7);
    }, '#b9bec8', '#2e3240', 2.5);
    ctx.save();
    ctx.translate(786, 392);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      A.shape(ctx, c => { c.moveTo(4, -3); c.lineTo(58, -9); c.lineTo(58, 9); c.lineTo(4, 3); c.closePath(); }, '#e8e4dc', '#2e3240', 2.5);
    }
    ctx.restore();
    A.shape(ctx, c => A.circles(c, [[786, 392, 9]]), '#d8312c', '#2e3240', 3);
    A.shape(ctx, c => { c.moveTo(790, 392); c.lineTo(850, 380); c.lineTo(850, 404); c.closePath(); }, '#d8312c', '#2e3240', 2.5);
  }

  function sheriff(ctx) {
    A.shape(ctx, c => { c.rect(900, 500, 170, 160); c.rect(890, 486, 190, 18); }, A.vgrad(ctx, 486, 660, ['#f2e2c2', '#d8c09a']), OUT, 4);
    planks(ctx, 900, 504, 170, 156, 18);
    windowBox(ctx, 918, 530, 40, 38);
    windowBox(ctx, 1012, 530, 40, 38);
    A.shape(ctx, c => c.rect(962, 590, 46, 70), '#7a4a24', OUT, 3);
    // Звезда шерифа.
    A.shape(ctx, c => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 14 : 34; c.lineTo(985 + Math.cos(a) * r, 450 + Math.sin(a) * r); } c.closePath(); }, '#ffd23f', '#8a5a06', 4);
    A.shape(ctx, c => A.circles(c, [[985, 452, 10]]), '#f0b820', '#8a5a06', 2);
  }

  function house(ctx) {
    A.shape(ctx, c => c.rect(1140, 560, 120, 100), '#e8a07a', OUT, 4);
    A.shape(ctx, c => { c.moveTo(1126, 566); c.lineTo(1200, 500); c.lineTo(1274, 566); c.closePath(); }, '#a85a3a', OUT, 4);
    windowBox(ctx, 1160, 584, 34, 30);
    A.shape(ctx, c => c.rect(1212, 600, 30, 60), '#7a4a24', OUT, 3);
    // Дощатый настил-платформа.
    A.shape(ctx, c => { c.rect(1300, 560, 120, 12); c.rect(1310, 572, 8, 88); c.rect(1402, 572, 8, 88); }, '#b07440', '#3d2410', 3);
    A.shape(ctx, c => { c.ellipse(1360, 540, 22, 20, 0, 0, Math.PI * 2); }, '#9a6234', '#3d2410', 3);
    ctx.strokeStyle = '#5a5e6a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(1338, 532); ctx.lineTo(1382, 532);
    ctx.moveTo(1338, 548); ctx.lineTo(1382, 548);
    ctx.stroke();
  }

  W.MAPS = W.MAPS || {};
  W.MAPS.wildwest = {
    id: 'wildwest',
    name: 'Дикий Запад',
    spawnXs: [200, 1460],
    waterColor: ['#5fc3e4', '#2b7fb0'],
    burnColor: 'rgba(80, 44, 14, 0.9)',
    dirtColors: ['#e0a85a', '#c08440', '#7a4a24'],
    drawSky(ctx, w, h) {
      ctx.fillStyle = A.vgrad(ctx, 0, h, ['#5ea8ff', '#9ccaff', '#f6d6c0']);
      ctx.fillRect(0, 0, w, h);
      A.cloud(ctx, 320, 100, 1.1, '#f4fbff', '#9cc6ea');
      A.cloud(ctx, 1200, 140, 1.0, '#f4fbff', '#9cc6ea');
    },
    drawBackdrop(ctx) {
      ctx.fillStyle = 'rgba(150, 140, 200, 0.6)';
      for (const [x, w, top] of [[90, 120, 330], [260, 70, 420], [700, 90, 300], [1080, 140, 380], [1300, 80, 260], [1520, 110, 350]]) {
        ctx.beginPath();
        ctx.moveTo(x - w / 2, 700);
        ctx.lineTo(x - w / 2 + 8, top + 20);
        ctx.quadraticCurveTo(x - w / 2 + 10, top, x - w / 2 + 24, top);
        ctx.lineTo(x + w / 2 - 24, top);
        ctx.quadraticCurveTo(x + w / 2 - 10, top, x + w / 2 - 8, top + 20);
        ctx.lineTo(x + w / 2, 700);
        ctx.fill();
      }
      // Арка-скала.
      ctx.beginPath();
      ctx.moveTo(620, 700); ctx.lineTo(640, 330); ctx.quadraticCurveTo(700, 270, 770, 300); ctx.lineTo(790, 700);
      ctx.lineTo(760, 700); ctx.lineTo(745, 380); ctx.quadraticCurveTo(700, 350, 670, 380); ctx.lineTo(655, 700);
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 170, 220, 0.5)';
      ctx.beginPath();
      A.smooth(ctx, [[0, 800], [0, 640], [400, 620], [800, 645], [1200, 615], [1600, 640], [1600, 800]]);
      ctx.fill();
    },
    drawTerrain(ctx) {
      ground(ctx);
      saloon(ctx);
      waterTower(ctx);
      windmill(ctx);
      sheriff(ctx);
      house(ctx);
    },
  };
})(window.W = window.W || {});
