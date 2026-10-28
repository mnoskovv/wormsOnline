// Клавиатура и мышь → команды игры. Логику не трогает напрямую.
(function (W) {
  const C = W.CFG;

  class Input {
    constructor(canvas, renderer, opts) {
      this.canvas = canvas;
      this.renderer = renderer;
      this.opts = opts; // {getGame, canControl(player), send(cmd), onTogglePanel, isPanelOpen}
      this.charge = null;
      this.hover = null;
      this.held = { left: false, right: false };
      // Второй клик по кнопке «В бой!» не должен стать выстрелом.
      this.armedAt = performance.now() + 400;
      this.handlers = [];
      this.on(window, 'keydown', e => this.keyDown(e));
      this.on(window, 'keyup', e => this.keyUp(e));
      this.on(canvas, 'mousemove', e => this.mouseMove(e));
      this.on(canvas, 'mousedown', e => this.mouseDown(e));
      this.on(window, 'mouseup', e => { if (e.button === 0) this.release(); });
      this.on(canvas, 'contextmenu', e => { e.preventDefault(); this.togglePanel(); });
    }

    on(target, type, fn) {
      target.addEventListener(type, fn);
      this.handlers.push([target, type, fn]);
    }

    destroy() {
      for (const [t, type, fn] of this.handlers) t.removeEventListener(type, fn);
      this.handlers = [];
    }

    game() { return this.opts.getGame(); }

    mine() {
      const g = this.game();
      return g && g.phase !== 'gameover' && this.opts.canControl(g.current);
    }

    send(cmd) {
      const g = this.game();
      this.opts.send(g.current, cmd);
    }

    weaponDef() {
      const g = this.game();
      return W.WEAPONS[g.weapon[g.current]];
    }

    togglePanel() {
      if (this.mine() && this.game().phase === 'turn') this.opts.onTogglePanel();
    }

    walkDir() {
      return this.held.left === this.held.right ? 0 : this.held.left ? -1 : 1;
    }

    keyDown(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!this.mine()) return;
      const g = this.game();
      switch (e.code) {
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          if (e.repeat) return;
          this.held[e.code === 'ArrowLeft' ? 'left' : 'right'] = true;
          this.send({ type: 'walk', dir: this.walkDir() });
          return;
        case 'Enter':
          e.preventDefault();
          if (!e.repeat) this.send({ type: 'jump', back: false });
          return;
        case 'Backspace':
          e.preventDefault();
          if (!e.repeat) this.send({ type: 'jump', back: true });
          return;
        case 'Space':
          e.preventDefault();
          if (!e.repeat) this.press();
          return;
        case 'Tab':
          e.preventDefault();
          this.togglePanel();
          return;
      }
      if (e.code === 'Escape' && this.opts.isPanelOpen()) {
        this.opts.onTogglePanel();
        return;
      }
      // Оружие выбирается в окне; цифры 1–5 — только таймер гранаты.
      const m = /^Digit([1-5])$/.exec(e.code);
      if (m && g.phase === 'turn') this.send({ type: 'fuse', seconds: Number(m[1]) });
    }

    keyUp(e) {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.held[e.code === 'ArrowLeft' ? 'left' : 'right'] = false;
        if (this.mine()) this.send({ type: 'walk', dir: this.walkDir() });
      } else if (e.code === 'Space') {
        this.release();
      }
    }

    mouseMove(e) {
      this.hover = this.renderer.toWorld(e.clientX, e.clientY);
      if (!this.mine()) return;
      const g = this.game();
      const w = g.worms[g.current];
      if (w.dead || this.weaponDef().aim === 'target') return;
      this.send({ type: 'aim', angle: Math.atan2(this.hover.y - w.y, this.hover.x - w.x) });
    }

    mouseDown(e) {
      if (e.button !== 0 || !this.mine()) return;
      if (this.opts.isPanelOpen() || performance.now() < this.armedAt) return;
      this.hover = this.renderer.toWorld(e.clientX, e.clientY);
      if (this.weaponDef().aim === 'target') {
        this.send({ type: 'fire', target: { x: this.hover.x, y: this.hover.y } });
        return;
      }
      this.press();
    }

    // Нажатие кнопки выстрела: зарядка или мгновенный выстрел.
    press() {
      const g = this.game();
      if (g.phase !== 'turn' || this.opts.isPanelOpen()) return;
      const aim = this.weaponDef().aim;
      if (aim === 'charge') this.charge = 0;
      else if (aim === 'instant' || aim === 'drop') this.send({ type: 'fire', power: 1 });
    }

    release() {
      if (this.charge === null) return;
      const power = Math.max(0.05, this.charge);
      this.charge = null;
      if (this.mine()) this.send({ type: 'fire', power });
    }

    update(dt) {
      const g = this.game();
      if (this.charge === null) return;
      if (!this.mine() || g.phase !== 'turn') { this.charge = null; return; }
      this.charge = Math.min(1, this.charge + dt / C.CHARGE_TIME);
      if (this.charge >= 1) this.release();
    }

    resetHeld() {
      this.held.left = this.held.right = false;
      this.charge = null;
    }
  }

  W.Input = Input;
})(window.W = window.W || {});
