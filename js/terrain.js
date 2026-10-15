// Маска земли: 1 = твёрдо. Дыры храним списком, чтобы их можно было повторить.
(function (W) {
  class Terrain {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.mask = new Uint8Array(w * h);
      this.holes = [];
    }

    static fromAlpha(w, h, rgba) {
      const t = new Terrain(w, h);
      for (let i = 0; i < w * h; i++) t.mask[i] = rgba[i * 4 + 3] > 128 ? 1 : 0;
      return t;
    }

    isSolid(x, y) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
      return this.mask[y * this.w + x] === 1;
    }

    fillRect(x, y, w, h) {
      const x0 = Math.max(0, Math.floor(x)), x1 = Math.min(this.w, Math.floor(x + w));
      const y0 = Math.max(0, Math.floor(y)), y1 = Math.min(this.h, Math.floor(y + h));
      for (let yy = y0; yy < y1; yy++) this.mask.fill(1, yy * this.w + x0, yy * this.w + x1);
    }

    _circle(x, y, r, v) {
      const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(this.h - 1, Math.ceil(y + r));
      for (let yy = y0; yy <= y1; yy++) {
        const dy = yy + 0.5 - y;
        const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
        const x0 = Math.max(0, Math.ceil(x - dx - 0.5)), x1 = Math.min(this.w - 1, Math.floor(x + dx - 0.5));
        if (x1 >= x0) this.mask.fill(v, yy * this.w + x0, yy * this.w + x1 + 1);
      }
    }

    fillCircle(x, y, r) { this._circle(x, y, r, 1); }

    carve(x, y, r) {
      this._circle(x, y, r, 0);
      this.holes.push({ x, y, r });
    }

    // Список дыр только растёт: применяем те, которых у нас ещё нет.
    applyHoles(list) {
      for (let i = this.holes.length; i < list.length; i++) this.carve(list[i].x, list[i].y, list[i].r);
    }

    circleHitsSolid(x, y, r) {
      const y0 = Math.floor(y - r), y1 = Math.ceil(y + r);
      for (let yy = y0; yy <= y1; yy++) {
        const dy = yy + 0.5 - y;
        if (dy * dy > r * r) continue;
        const dx = Math.sqrt(r * r - dy * dy);
        for (let xx = Math.floor(x - dx); xx <= Math.ceil(x + dx); xx++) {
          const ddx = xx + 0.5 - x;
          if (ddx * ddx + dy * dy <= r * r && this.isSolid(xx, yy)) return true;
        }
      }
      return false;
    }
  }

  W.Terrain = Terrain;
})(window.W = window.W || {});
