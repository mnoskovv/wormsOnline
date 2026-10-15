// Картинка земли на canvas: из неё строится маска, в ней выгрызаются дыры.
(function (W) {
  const C = W.CFG;

  class TerrainArt {
    constructor(map) {
      this.map = map;
      this.canvas = document.createElement('canvas');
      this.canvas.width = C.WORLD_W;
      this.canvas.height = C.WORLD_H;
      this.ctx = this.canvas.getContext('2d');
      map.drawTerrain(this.ctx, C.WORLD_W, C.WORLD_H);
    }

    buildTerrain() {
      const data = this.ctx.getImageData(0, 0, C.WORLD_W, C.WORLD_H).data;
      return W.Terrain.fromAlpha(C.WORLD_W, C.WORLD_H, data);
    }

    carve(x, y, r) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Обгоревшая кромка рисуется только поверх уже существующей земли.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.beginPath();
      ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = r < 10 ? 3 : 6;
      ctx.strokeStyle = this.map.burnColor || 'rgba(45, 28, 12, 0.9)';
      ctx.stroke();
      ctx.restore();
    }

    applyHoles(list) {
      for (const h of list) this.carve(h.x, h.y, h.r);
    }
  }

  W.TerrainArt = TerrainArt;
})(window.W = window.W || {});
