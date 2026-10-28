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
        A.shape(ctx, c => { c.moveTo(w.x - 11, w.y + 10); c.lineTo(w.x - 11, w.y - 8); c.arc(w.x, w.y - 8, 11, Math.PI, 0); c.lineTo(w.x + 11, w.y + 10); c.closePath(); },
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
      if (active) {
        // Светящийся круг под тем, кто ходит.
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.25 * pulse;
        A.shape(ctx, c => c.ellipse(w.x, w.y + C.WORM_R, 26 + pulse * 4, 8, 0, 0, Math.PI * 2), W.PLAYER_COLORS[i], null);
        ctx.restore();
      }
      const walking = active && game.walkDir !== 0 && w.grounded;
      const hurtAge = view.hurt ? this.time - (view.hurt[w.id] ?? -9) : 9;
      const hurt = hurtAge < 0.6;
      const bob = walking ? 0 : Math.sin(this.time * 3 + i) * 0.6;
      const squash = walking ? 1 + Math.sin(this.time * 14) * 0.12 : 1;
      const shake = hurt ? Math.sin(hurtAge * 60) * 2 * (1 - hurtAge / 0.6) : 0;
      ctx.save();
      ctx.translate(w.x + shake, w.y + C.WORM_R);
      ctx.scale(1.45 * squash, 1.45 / squash);
      ctx.translate(0, bob);
      const skin = '#ffb3c8', line = '#7a2f4a';
      A.blob(ctx, [[-f * 10, -3, 4.5], [-f * 5, -4, 6], [0, -7, 8.5], [f * 2, -17, 9]], skin, line, 2.2);
      A.shape(ctx, c => c.ellipse(f * 3, -7, 4.5, 5.5, 0, 0, Math.PI * 2), '#ffd6e2', null);
      ctx.strokeStyle = 'rgba(122,47,74,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const yy of [-3, -6]) { ctx.moveTo(-f * 6, yy); ctx.quadraticCurveTo(-f * 3, yy + 1.5, 0, yy); }
      ctx.stroke();
      // Глаза: смотрят по прицелу, жмурятся от урона.
      const ang = W.absoluteAim(w);
      const px = Math.cos(ang) * 1.6, py = Math.sin(ang) * 1.6;
      for (const ex of [-2.5, 4.5]) {
        const cx = f * 2 + ex * f, cy = -19;
        if (hurt) {
          ctx.strokeStyle = '#3a1420';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cx - 3, cy - 2); ctx.lineTo(cx + 3, cy + 1); ctx.lineTo(cx - 3, cy + 3);
          ctx.stroke();
        } else {
          A.shape(ctx, c => c.ellipse(cx, cy, 3.6, 4.8, 0, 0, Math.PI * 2), '#fff', '#3a1420', 1.3);
          A.shape(ctx, c => A.circles(c, [[cx + px, cy + py + 0.5, 1.8]]), '#111', null);
          A.shape(ctx, c => A.circles(c, [[cx + px - 0.7, cy + py - 0.4, 0.6]]), '#fff', null);
        }
      }
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (hurt) ctx.ellipse(f * 3.5, -12, 2, 1.6, 0, 0, Math.PI * 2);
      else ctx.arc(f * 3.5, -13.5, 2.6, 0.3, Math.PI - 0.3);
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
      label(String(Math.max(0, w.hp)), w.y - 38, W.PLAYER_COLORS[i]);
      label(w.name, w.y - 57, W.PLAYER_COLORS[i]);
      if (active && game.phase === 'turn') {
        const y = w.y - 82 + Math.sin(this.time * 6) * 5;
        A.shape(ctx, c => { c.moveTo(w.x - 12, y - 10); c.lineTo(w.x + 12, y - 10); c.lineTo(w.x, y + 5); c.closePath(); }, W.PLAYER_COLORS[i], '#fff', 2.5);
        if (view.thinking) {
          const dots = '.'.repeat(1 + Math.floor(this.time * 3) % 3);
          A.shape(ctx, c => c.roundRect(w.x + 18, w.y - 104, 54, 26, 12), '#fff', '#5a6b8c', 2);
          ctx.fillStyle = '#5a6b8c';
          ctx.font = `bold 18px ${FONT}`;
          ctx.fillText(dots, w.x + 45, w.y - 93);
        }
      }
    }

    weaponInHand(w, weapon) {
      const ctx = this.ctx;
      const def = W.WEAPONS[weapon];
      if (def.aim === 'target' || def.aim === 'drop') return;
      const ang = W.absoluteAim(w);
      ctx.save();
      ctx.translate(w.x, w.y - 2);
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
      const cx = w.x + Math.cos(ang) * 65, cy = w.y - 2 + Math.sin(ang) * 65;
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
          A.shape(ctx, c => A.circles(c, [[e.x, e.y, e.r * (0.8 + k * 0.9)]]), '#ff7a1f', null);
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
        } else if (e.type === 'dim') {
          ctx.fillStyle = `rgba(20, 10, 40, ${0.35 * Math.sin(Math.PI * k)})`;
          ctx.fillRect(0, 0, C.WORLD_W, C.WORLD_H);
        } else if (e.type === 'banner') {
          // Крупная надпись по центру: выпрыгивает, держится, тает.
          ctx.save();
          ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          const pop = k < 0.12 ? 0.4 + (k / 0.12) * 0.75 : k < 0.2 ? 1.15 - ((k - 0.12) / 0.08) * 0.15 : 1;
          ctx.translate(C.WORLD_W / 2, 300);
          ctx.scale(pop, pop);
          A.shape(ctx, c => c.roundRect(-300, -62, 600, e.sub ? 124 : 104, 30), 'rgba(255,255,255,0.94)', e.color, 6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold 64px ${FONT}`;
          ctx.fillStyle = e.color;
          ctx.fillText(e.text, 0, e.sub ? -14 : -10);
          if (e.sub) {
            ctx.font = `bold 24px ${FONT}`;
            ctx.fillStyle = '#5a6b8c';
            ctx.fillText(e.sub, 0, 38);
          }
          ctx.restore();
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
      this.playerPlates(game);
      this.windAndTimer(game);
      if (view.hints && game.phase === 'turn') {
        const t = '← → ходить   ·   Enter прыжок   ·   Пробел / ЛКМ — выстрел   ·   Tab / ПКМ — оружие';
        ctx.font = `bold 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(t).width + 30;
        A.shape(ctx, c => c.roundRect(C.WORLD_W / 2 - tw / 2, C.WORLD_H - 34, tw, 26, 13), 'rgba(20,20,40,0.55)', null);
        ctx.fillStyle = '#fff';
        ctx.fillText(t, C.WORLD_W / 2, C.WORLD_H - 21);
      }
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

  // Плашки игроков сверху слева: имя, полоска хп, кто ходит.
  Renderer.prototype.playerPlates = function (game) {
    const ctx = this.ctx;
    game.worms.forEach((w, i) => {
      const col = W.PLAYER_COLORS[i];
      const x = 14, y = 12 + i * 58, wd = 330, h = 48;
      const turn = i === game.current && game.phase !== 'gameover';
      ctx.save();
      if (turn) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
      A.shape(ctx, c => c.roundRect(x, y, wd, h, 16), 'rgba(255,255,255,0.93)', col, turn ? 5 : 2.5);
      ctx.restore();
      A.shape(ctx, c => A.circles(c, [[x + 26, y + h / 2, 17]]), col, '#fff', 2.5);
      ctx.fillStyle = '#fff';
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x + 26, y + h / 2 + 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = col;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(w.name, x + 52, y + 14, 170);
      if (turn) {
        ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText('▶ ХОДИТ', x + wd - 12, y + 14);
      }
      const hp = Math.max(0, w.hp);
      const bx = x + 52, by = y + 26, bw = wd - 66, bh = 14;
      A.shape(ctx, c => c.roundRect(bx, by, bw, bh, 7), '#e4e8f0', null);
      if (hp > 0) A.shape(ctx, c => c.roundRect(bx, by, Math.max(10, bw * Math.min(1, hp / C.HP)), bh, 7), col, null);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.strokeText(`${hp} / ${C.HP}`, bx + bw / 2, by + bh / 2 + 1);
      ctx.fillText(`${hp} / ${C.HP}`, bx + bw / 2, by + bh / 2 + 1);
    });
  };

  // По центру сверху: ветер (синий влево, красный вправо) и секундомер хода.
  Renderer.prototype.windAndTimer = function (game) {
    const ctx = this.ctx;
    const cx = C.WORLD_W / 2, y = 22, half = 130;
    A.shape(ctx, c => c.roundRect(cx - half - 8, y - 12, half * 2 + 16, 24, 12), 'rgba(255,255,255,0.93)', '#5a6b8c', 2.5);
    A.shape(ctx, c => c.roundRect(cx - half, y - 5, half * 2, 10, 5), '#e4e8f0', null);
    if (game.wind !== 0) {
      const len = (game.wind / C.WIND_MAX) * half;
      const col = len < 0 ? '#2f9be0' : '#ff4a4a';
      A.shape(ctx, c => c.roundRect(Math.min(cx, cx + len), y - 5, Math.abs(len), 10, 5), col, null);
      ctx.fillStyle = '#fff';
      const dir = Math.sign(len);
      for (let d = 10; d < Math.abs(len) - 4; d += 16) {
        const ax = cx + dir * d;
        ctx.beginPath();
        ctx.moveTo(ax + dir * 5, y);
        ctx.lineTo(ax - dir * 2, y - 4);
        ctx.lineTo(ax - dir * 2, y + 4);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#5a6b8c';
    ctx.fillRect(cx - 1.5, y - 8, 3, 16);
    const secs = game.phase === 'retreat' ? Math.ceil(game.retreatTime) : Math.ceil(game.turnTime);
    const hot = secs <= 5 && game.phase === 'turn';
    const col = hot ? '#ff4a4a' : W.PLAYER_COLORS[game.current];
    const ty = y + 44;
    A.shape(ctx, c => A.circles(c, [[cx, ty, 26]]), '#fff', col, 4);
    A.shape(ctx, c => c.roundRect(cx - 5, ty - 34, 10, 7, 2), col, null);
    ctx.fillStyle = col;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(secs), cx, ty + 1);
  };

  W.Renderer = Renderer;
})(window.W = window.W || {});
