// Отрисовка мира, червяков, эффектов и HUD.
(function (W) {
  const C = W.CFG;
  const A = W.Art;
  W.PLAYER_COLORS = ['#2f7bff', '#ff3b3b'];
  const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scale = 1;
      this.ox = 0;
      this.oy = 0;
      this.bgFor = null;
      this.bg = null;
      this.time = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const cw = window.innerWidth, ch = window.innerHeight;
      this.canvas.width = Math.round(cw * dpr);
      this.canvas.height = Math.round(ch * dpr);
      this.canvas.style.width = cw + 'px';
      this.canvas.style.height = ch + 'px';
      this.dpr = dpr;
      this.scale = Math.min(cw / C.WORLD_W, ch / C.WORLD_H);
      this.ox = (cw - C.WORLD_W * this.scale) / 2;
      this.oy = (ch - C.WORLD_H * this.scale) / 2;
    }

    toWorld(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (clientX - r.left - this.ox) / this.scale, y: (clientY - r.top - this.oy) / this.scale };
    }

    background(map) {
      if (this.bgFor === map) return this.bg;
      const c = document.createElement('canvas');
      c.width = C.WORLD_W;
      c.height = C.WORLD_H;
      const ctx = c.getContext('2d');
      map.drawSky(ctx, C.WORLD_W, C.WORLD_H);
      map.drawBackdrop(ctx, C.WORLD_W, C.WORLD_H);
      this.bgFor = map;
      this.bg = c;
      return c;
    }

    draw(game, map, art, view) {
      this.time += 1 / 60;
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#1b1430';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const s = this.scale * this.dpr;
      ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, C.WORLD_W, C.WORLD_H);
      ctx.clip();

      ctx.drawImage(this.background(map), 0, 0);
      ctx.drawImage(art.canvas, 0, 0);
      for (const p of game.projectiles) this.projectile(p);
      game.worms.forEach((w, i) => this.worm(w, i, game, view));
      this.water(map);
      this.effects(view.effects);
      this.hud(game, view);
      ctx.restore();
    }

    projectile(p) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(p.x, p.y);
      const ang = Math.atan2(p.vy, p.vx);
      if (p.kind === 'bazooka' || p.kind === 'airstrike') {
        ctx.rotate(ang);
        A.shape(ctx, c => { c.moveTo(12, 0); c.quadraticCurveTo(6, -6, -8, -5); c.lineTo(-8, 5); c.quadraticCurveTo(6, 6, 12, 0); }, '#7d8a96', '#222', 2);
        A.shape(ctx, c => { c.moveTo(-8, -5); c.lineTo(-13, -9); c.lineTo(-13, 9); c.lineTo(-8, 5); c.closePath(); }, '#d23b3b', '#222', 2);
        A.shape(ctx, c => A.circles(c, [[-16, 0, 3 + Math.random() * 2]]), '#ffcf4a', null);
      } else if (p.kind === 'grenade') {
        ctx.rotate(p.age * 6);
        A.shape(ctx, c => c.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2), '#4f7f2a', '#1f330f', 2);
        A.shape(ctx, c => c.rect(-2, -10, 4, 4), '#999', '#222', 1.5);
      } else if (p.kind === 'dynamite') {
        A.shape(ctx, c => c.rect(-4, -9, 8, 18), '#d8312c', '#4a0e0c', 2);
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.quadraticCurveTo(5, -14, 3, -18);
        ctx.stroke();
        A.shape(ctx, c => A.circles(c, [[3, -19, 2 + Math.random() * 2]]), '#ffd23f', null);
      } else {
        A.shape(ctx, c => A.circles(c, [[0, 0, p.r + 1]]), '#3a3a44', '#111', 2);
      }
      ctx.restore();
    }

    worm(w, i, game, view) {
      const ctx = this.ctx;
      if (w.drowned) return;
      if (w.dead) {
        A.shape(ctx, c => { c.moveTo(w.x - 9, w.y + 10); c.lineTo(w.x - 9, w.y - 6); c.arc(w.x, w.y - 6, 9, Math.PI, 0); c.lineTo(w.x + 9, w.y + 10); c.closePath(); },
          '#b8b4c8', '#3a3650', 3);
        ctx.strokeStyle = '#3a3650';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y - 10); ctx.lineTo(w.x, w.y + 4);
        ctx.moveTo(w.x - 5, w.y - 5); ctx.lineTo(w.x + 5, w.y - 5);
        ctx.stroke();
        return;
      }
      const f = w.facing;
      const active = i === game.current && (game.phase === 'turn' || game.phase === 'retreat');
      const bob = Math.sin(this.time * 3 + i) * 0.8;
      ctx.save();
      ctx.translate(w.x, w.y + bob);
      // Хвостик и тело.
      A.shape(ctx, c => c.ellipse(-f * 8, 7, 8, 4.5, 0, 0, Math.PI * 2), '#ff9fba', '#7a2f4a', 2.5);
      A.shape(ctx, c => c.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2), '#ffb3c8', '#7a2f4a', 2.5);
      A.shape(ctx, c => c.ellipse(f * 2, 4, 5, 6, 0, 0, Math.PI * 2), '#ffd3df', null);
      // Глаза смотрят по прицелу.
      const ang = W.absoluteAim(w);
      const px = Math.cos(ang) * 1.6, py = Math.sin(ang) * 1.6;
      for (const ex of [-3, 4]) {
        A.shape(ctx, c => c.ellipse(f * 2 + ex, -6, 4, 5, 0, 0, Math.PI * 2), '#fff', '#3a1420', 1.5);
        A.shape(ctx, c => A.circles(c, [[f * 2 + ex + px, -6 + py, 1.8]]), '#111', null);
      }
      ctx.strokeStyle = '#7a2f4a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f * 2, 2, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();

      if (active && game.phase === 'turn') this.weaponInHand(w, game.weapon[i]);
      // Табличка с именем и хп.
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (txt, y, color) => {
        const tw = ctx.measureText(txt).width + 10;
        A.shape(ctx, c => c.roundRect(w.x - tw / 2, y - 8, tw, 16, 6), 'rgba(255,255,255,0.92)', color, 2);
        ctx.fillStyle = color;
        ctx.fillText(txt, w.x, y + 0.5);
      };
      label(String(Math.max(0, w.hp)), w.y - 26, W.PLAYER_COLORS[i]);
      label(w.name, w.y - 45, W.PLAYER_COLORS[i]);
      if (active && game.phase === 'turn') {
        const y = w.y - 62 + Math.sin(this.time * 6) * 3;
        A.shape(ctx, c => { c.moveTo(w.x - 7, y - 6); c.lineTo(w.x + 7, y - 6); c.lineTo(w.x, y + 3); c.closePath(); }, W.PLAYER_COLORS[i], '#fff', 2);
      }
    }

    weaponInHand(w, weapon) {
      const ctx = this.ctx;
      const def = W.WEAPONS[weapon];
      if (def.aim === 'target' || def.aim === 'drop') return;
      const ang = W.absoluteAim(w);
      ctx.save();
      ctx.translate(w.x, w.y + 2);
      ctx.rotate(ang);
      const len = weapon === 'sniper' ? 26 : weapon === 'grenade' ? 0 : 18;
      if (weapon === 'grenade') {
        A.shape(ctx, c => c.ellipse(10, 0, 5, 6, 0, 0, Math.PI * 2), '#4f7f2a', '#1f330f', 2);
      } else {
        const col = weapon === 'bazooka' ? '#5f7d3a' : weapon === 'mortar' ? '#555a66' : '#6b4a2a';
        A.shape(ctx, c => c.roundRect(2, -3.5, len, 7, 3), col, '#1d1d1d', 2);
      }
      ctx.restore();
      // Прицел.
      const cx = w.x + Math.cos(ang) * 55, cy = w.y + Math.sin(ang) * 55;
      ctx.strokeStyle = '#ff2b2b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.moveTo(cx - 11, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 11, cy);
      ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 11);
      ctx.stroke();
    }

    water(map) {
      const ctx = this.ctx;
      const t = this.time;
      const [top, bottom] = map.waterColor;
      ctx.beginPath();
      ctx.moveTo(0, C.WORLD_H);
      for (let x = 0; x <= C.WORLD_W; x += 20) ctx.lineTo(x, C.WATER_Y + Math.sin(x / 40 + t * 2) * 4);
      ctx.lineTo(C.WORLD_W, C.WORLD_H);
      ctx.closePath();
      ctx.fillStyle = A.vgrad(ctx, C.WATER_Y - 4, C.WORLD_H, [top, bottom]);
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= C.WORLD_W; x += 20) {
        const y = C.WATER_Y + Math.sin(x / 40 + t * 2) * 4;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    effects(list) {
      const ctx = this.ctx;
      for (const e of list) {
        const k = e.t / e.life;
        if (e.type === 'blast') {
          ctx.globalAlpha = 1 - k;
          A.shape(ctx, c => A.circles(c, [[e.x, e.y, e.r * (0.6 + k * 0.8)]]), '#ffd23f', null);
          A.shape(ctx, c => A.circles(c, [[e.x, e.y, e.r * (0.4 + k * 0.5)]]), '#fff6c8', null);
          ctx.globalAlpha = 1;
        } else if (e.type === 'ring') {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (0.5 + k), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (e.type === 'particle') {
          ctx.globalAlpha = 1 - k;
          A.shape(ctx, c => A.circles(c, [[e.x, e.y, e.size]]), e.color, null);
          ctx.globalAlpha = 1;
        } else if (e.type === 'smoke') {
          ctx.globalAlpha = 0.5 * (1 - k);
          A.shape(ctx, c => A.circles(c, [[e.x, e.y, e.size * (1 + k)]]), '#d8d4dc', null);
          ctx.globalAlpha = 1;
        } else if (e.type === 'tracer') {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#fff3a0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(e.x1, e.y1);
          ctx.lineTo(e.x2, e.y2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (e.type === 'number') {
          ctx.globalAlpha = 1 - k * k;
          ctx.font = `bold 20px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#fff';
          ctx.strokeText(e.text, e.x, e.y - k * 40);
          ctx.fillStyle = e.color || '#e81e1e';
          ctx.fillText(e.text, e.x, e.y - k * 40);
          ctx.globalAlpha = 1;
        } else if (e.type === 'plane') {
          const x = e.dir === 1 ? -120 + k * (C.WORLD_W + 240) : C.WORLD_W + 120 - k * (C.WORLD_W + 240);
          ctx.save();
          ctx.translate(x, e.y);
          ctx.scale(e.dir * 2.2, 2.2);
          A.shape(ctx, c => { c.moveTo(-22, 0); c.quadraticCurveTo(-10, -8, 20, -4); c.quadraticCurveTo(26, 0, 20, 4); c.quadraticCurveTo(-10, 8, -22, 0); }, '#8fa3b8', '#1d2a38', 1.5);
          A.shape(ctx, c => { c.moveTo(-2, -2); c.lineTo(-12, -14); c.lineTo(-6, -14); c.lineTo(8, -2); c.closePath(); }, '#7189a3', '#1d2a38', 1.2);
          A.shape(ctx, c => { c.moveTo(-22, 0); c.lineTo(-26, -9); c.lineTo(-18, -2); c.closePath(); }, '#d23b3b', '#1d2a38', 1.2);
          ctx.restore();
        } else if (e.type === 'banner') {
          ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
          ctx.font = `bold 40px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#fff';
          ctx.strokeText(e.text, C.WORLD_W / 2, 140);
          ctx.fillStyle = e.color;
          ctx.fillText(e.text, C.WORLD_W / 2, 140);
          ctx.globalAlpha = 1;
        }
      }
    }

    hud(game, view) {
      const ctx = this.ctx;
      const w = game.worms[game.current];
      // Полоска силы.
      if (view.charge !== null && view.charge !== undefined && !w.dead) {
        const ang = W.absoluteAim(w);
        for (let i = 0; i < 16; i++) {
          const k = i / 15;
          if (k > view.charge) break;
          const d = 18 + k * 70;
          ctx.fillStyle = `hsl(${60 - k * 60}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(w.x + Math.cos(ang) * d, w.y + Math.sin(ang) * d, 3 + k * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Таймер гранаты над червяком в руках.
      if (game.phase === 'turn' && game.weapon[game.current] === 'grenade') {
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#1f330f';
        ctx.lineWidth = 3;
        const t = `${game.fuse[game.current]} с`;
        ctx.strokeText(t, w.x + 30 * w.facing, w.y - 20);
        ctx.fillText(t, w.x + 30 * w.facing, w.y - 20);
      }
      for (const p of game.projectiles) {
        if (p.fuse === null) continue;
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        const t = String(Math.ceil(p.fuse));
        ctx.strokeText(t, p.x, p.y - 16);
        ctx.fillText(t, p.x, p.y - 16);
      }
      // Перекрестие для оружия по цели.
      if (view.hoverTarget && game.phase === 'turn' && W.WEAPONS[game.weapon[game.current]].aim === 'target') {
        const { x, y } = view.hoverTarget;
        ctx.strokeStyle = '#ff2b2b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y);
        ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
      // Плашка хода и таймер снизу по центру.
      const col = W.PLAYER_COLORS[game.current];
      const bx = C.WORLD_W / 2, by = C.WORLD_H - 28;
      A.shape(ctx, c => c.roundRect(bx - 120, by - 20, 240, 40, 14), 'rgba(255,255,255,0.92)', col, 3);
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      ctx.fillText(w.name, bx - 106, by + 1, 150);
      const secs = game.phase === 'retreat' ? Math.ceil(game.retreatTime) : Math.ceil(game.turnTime);
      A.shape(ctx, c => A.circles(c, [[bx + 92, by, 17]]), secs <= 5 && game.phase === 'turn' ? '#ff4a4a' : col, '#fff', 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(String(secs), bx + 92, by + 1);
      // Ветер.
      const wx = C.WORLD_W - 110, wy = C.WORLD_H - 28;
      A.shape(ctx, c => c.roundRect(wx - 90, wy - 20, 180, 40, 14), 'rgba(255,255,255,0.92)', '#5a6b8c', 3);
      ctx.fillStyle = '#5a6b8c';
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('ВЕТЕР', wx, wy - 10);
      ctx.fillStyle = '#d8dfea';
      ctx.fillRect(wx - 70, wy + 2, 140, 8);
      if (game.wind !== 0) {
        const len = (game.wind / C.WIND_MAX) * 70;
        ctx.fillStyle = '#2f9be0';
        ctx.fillRect(Math.min(wx, wx + len), wy + 2, Math.abs(len), 8);
        const tip = wx + len, dir = Math.sign(len);
        ctx.beginPath();
        ctx.moveTo(tip + dir * 8, wy + 6);
        ctx.lineTo(tip, wy - 2);
        ctx.lineTo(tip, wy + 14);
        ctx.fill();
      }
      ctx.fillStyle = '#5a6b8c';
      ctx.fillRect(wx - 1, wy, 2, 12);
      if (game.phase === 'gameover' && !view.hideGameOver) {
        const txt = game.winner === 'draw' ? 'Ничья!' : `Победил ${game.worms[game.winner].name}!`;
        ctx.font = `bold 56px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#fff';
        ctx.strokeText(txt, C.WORLD_W / 2, C.WORLD_H / 2 - 120);
        ctx.fillStyle = game.winner === 'draw' ? '#5a6b8c' : W.PLAYER_COLORS[game.winner];
        ctx.fillText(txt, C.WORLD_W / 2, C.WORLD_H / 2 - 120);
      }
    }
  }

  W.Renderer = Renderer;
})(window.W = window.W || {});
