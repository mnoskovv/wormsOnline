// Шахта: земляная глыба с туннелями, кости динозавра, рельсы с вагонеткой, парящий остров с табличкой.
(function (W) {
  const A = W.Art;
  const OUT = '#4a2c10';

  const MASS = [[110, 800], [124, 640], [104, 520], [150, 430], [232, 402], [330, 412], [420, 384], [520, 364], [620, 380], [702, 420], [762, 470], [802, 540], [872, 562], [980, 562], [1060, 600], [1100, 680], [1118, 800]];
  const TUNNELS = [
    [[300, 470], [420, 456], [560, 466], [700, 478], [820, 500], [820, 540], [700, 530], [560, 520], [420, 514], [300, 516]],
    [[280, 616], [430, 600], [600, 610], [760, 620], [900, 630], [1120, 640], [1120, 690], [900, 684], [760, 674], [600, 666], [430, 660], [280, 666]],
  ];
  const ISLAND = [[1150, 470], [1200, 440], [1300, 436], [1360, 456], [1340, 500], [1290, 540], [1230, 548], [1176, 516]];
  const PILLAR = [[1400, 800], [1412, 650], [1400, 520], [1430, 440], [1500, 426], [1560, 446], [1574, 540], [1560, 660], [1570, 800]];

  const soil = (ctx) => A.vgrad(ctx, 360, 800, ['#e0a85a', '#c98a3e', '#a86a2a']);

  function earthWithTunnels(ctx) {
    A.shape(ctx, c => A.smooth(c, MASS), soil(ctx), OUT, 5);
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, MASS);
    ctx.clip();
    // Слои породы.
    ctx.strokeStyle = 'rgba(120,70,20,0.35)';
    ctx.lineWidth = 6;
    for (const y of [580, 720]) {
      ctx.beginPath();
      A.smooth(ctx, [[100, y], [400, y - 20], [700, y + 10], [1100, y - 10]], false);
      ctx.stroke();
    }
    // Кости динозавра.
    const bone = '#f3ecd8';
    ctx.strokeStyle = bone;
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(180, 560); ctx.quadraticCurveTo(240, 548, 300, 566);
    for (let i = 0; i < 5; i++) { ctx.moveTo(200 + i * 20, 556); ctx.lineTo(194 + i * 20, 590); }
    ctx.stroke();
    A.shape(ctx, c => { c.ellipse(160, 560, 26, 16, -0.2, 0, Math.PI * 2); }, bone, '#6b5a3a', 3);
    A.shape(ctx, c => A.circles(c, [[154, 556, 5]]), '#5a3a16', null);
    // Камешки.
    for (const [x, y, r] of [[480, 420, 9], [650, 430, 10], [360, 560, 8], [960, 600, 9], [520, 720, 11], [840, 740, 10], [220, 700, 9]]) {
      A.shape(ctx, c => c.ellipse(x, y, r * 1.3, r, 0.3, 0, Math.PI * 2), '#a59ab8', '#4f4866', 2.5);
    }
    ctx.restore();
    // Травяная шапка сверху.
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, MASS);
    ctx.clip();
    ctx.beginPath();
    A.smooth(ctx, MASS.slice(2, 13), false);
    ctx.lineWidth = 28;
    ctx.strokeStyle = '#7fcf3a';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    A.smooth(ctx, MASS);
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // Туннели: тёмная кромка и пустота внутри.
    for (const t of TUNNELS) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.beginPath();
      A.smooth(ctx, t);
      ctx.lineWidth = 12;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      A.smooth(ctx, t);
      ctx.fill();
      ctx.restore();
    }
    // Подпорка в туннеле.
    A.shape(ctx, c => { c.rect(600, 610, 12, 56); c.rect(700, 618, 12, 56); c.rect(592, 604, 128, 12); }, '#9a6234', '#3d2410', 3);
    A.shape(ctx, c => c.ellipse(650, 630, 7, 10, 0, 0, Math.PI * 2), '#ffe36a', '#8a6a06', 2);
  }

  function railsAndCart(ctx) {
    ctx.strokeStyle = '#6b6f7a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    A.smooth(ctx, [[420, 362], [520, 344], [620, 360], [700, 400], [740, 440]], false);
    ctx.stroke();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (const [x, y] of [[440, 360], [480, 352], [520, 346], [560, 348], [600, 356], [640, 368], [680, 386]]) {
      ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 4, y + 12);
    }
    ctx.stroke();
    // Вагонетка с рудой.
    A.blob(ctx, [[500, 300, 22], [530, 292, 26], [560, 300, 22]], '#c98a3e', OUT, 4);
    A.shape(ctx, c => { c.moveTo(470, 300); c.lineTo(590, 300); c.lineTo(578, 342); c.lineTo(482, 342); c.closePath(); }, A.vgrad(ctx, 300, 342, ['#b9bec8', '#8a909c']), '#2e3240', 4);
    A.shape(ctx, c => A.circles(c, [[498, 346, 10], [562, 346, 10]]), '#4a4e5a', '#1a1c24', 3);
    A.shape(ctx, c => { c.rect(526, 268, 8, 32); c.rect(516, 264, 28, 8); }, '#8a5a2b', '#3d2410', 2.5);
  }

  function island(ctx) {
    A.shape(ctx, c => A.smooth(c, ISLAND), soil(ctx), OUT, 5);
    ctx.save();
    ctx.beginPath();
    A.smooth(ctx, ISLAND);
    ctx.clip();
    ctx.fillStyle = '#7fcf3a';
    ctx.fillRect(1100, 400, 300, 58);
    ctx.restore();
    ctx.beginPath();
    A.smooth(ctx, ISLAND);
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    A.shape(ctx, c => c.rect(1250, 370, 10, 72), '#8a5a2b', '#3d2410', 3);
    A.shape(ctx, c => c.roundRect(1196, 340, 120, 40, 6), '#d8312c', '#4a0e0c', 4);
    ctx.font = 'bold 22px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Шахта', 1256, 361);
  }

  function pillar(ctx) {
    A.shape(ctx, c => A.smooth(c, PILLAR), soil(ctx), OUT, 5);
    // Груда камней у подножия.
    for (const [x, y, r] of [[1420, 740, 18], [1450, 760, 20], [1400, 770, 16], [1436, 712, 14], [1470, 732, 15]]) {
      A.shape(ctx, c => c.ellipse(x, y, r * 1.2, r, 0, 0, Math.PI * 2), '#b3a9c9', '#4f4866', 3);
    }
  }

  function palmTuft(ctx, x, y, s) {
    A.shape(ctx, c => { c.moveTo(x - 6 * s, y); c.quadraticCurveTo(x - 10 * s, y - 50 * s, x + 4 * s, y - 90 * s); c.lineTo(x + 14 * s, y - 88 * s); c.quadraticCurveTo(x + 2 * s, y - 50 * s, x + 8 * s, y); c.closePath(); }, '#9a6a32', '#4a2c10', 3);
    const tx = x + 9 * s, ty = y - 90 * s;
    for (const [dx, dy] of [[-60, 10], [-40, -30], [10, -44], [50, -20], [60, 16]]) {
      A.shape(ctx, c => { c.moveTo(tx, ty); c.quadraticCurveTo(tx + dx * 0.5 * s, ty + (dy - 24) * s, tx + dx * s, ty + dy * s); c.quadraticCurveTo(tx + dx * 0.5 * s, ty + (dy * 0.5 + 10) * s, tx, ty + 6); c.closePath(); }, '#5ec23a', '#1f4a12', 3);
    }
  }

  W.MAPS = W.MAPS || {};
  W.MAPS.mine = {
    id: 'mine',
    name: 'Шахта',
    spawnXs: [250, 1490],
    waterColor: ['#5fc3e4', '#2b7fb0'],
    burnColor: 'rgba(70, 40, 12, 0.9)',
    dirtColors: ['#c98a3e', '#a86a2a', '#7fcf3a'],
    drawSky(ctx, w, h) {
      ctx.fillStyle = A.vgrad(ctx, 0, h, ['#8ee0ef', '#c8e8d8', '#f0d29a', '#e8b878']);
      ctx.fillRect(0, 0, w, h);
      A.cloud(ctx, 900, 110, 1.2, '#fffaf0', '#c9a87a');
      A.cloud(ctx, 1400, 70, 0.8, '#fffaf0', '#c9a87a');
    },
    drawBackdrop(ctx) {
      ctx.fillStyle = 'rgba(200, 150, 100, 0.45)';
      ctx.beginPath();
      A.smooth(ctx, [[0, 800], [0, 600], [150, 560], [300, 620], [520, 540], [760, 610], [1000, 560], [1250, 620], [1450, 560], [1600, 600], [1600, 800]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 130, 90, 0.4)';
      for (const [x, y, w] of [[1000, 520, 70], [300, 560, 50]]) {
        ctx.beginPath();
        ctx.moveTo(x - w, 640);
        ctx.lineTo(x - w * 0.6, y);
        ctx.lineTo(x + w * 0.6, y - 10);
        ctx.lineTo(x + w, 640);
        ctx.fill();
      }
    },
    drawTerrain(ctx) {
      earthWithTunnels(ctx);
      railsAndCart(ctx);
      island(ctx);
      pillar(ctx);
      palmTuft(ctx, 170, 432, 1);
      palmTuft(ctx, 1540, 440, 0.9);
    },
  };
})(window.W = window.W || {});
