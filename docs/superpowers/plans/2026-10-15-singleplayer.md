# Червячки: синглплеер (хотсит) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Играбельная хотсит-дуэль двух червяков в браузере: разрушаемые карты, 8 видов оружия, ветер, хп, звуки. Готово к подключению сети на этапе 3.

**Architecture:** Логика (земля-маска, физика, оружие, ходы) — чистый JS без DOM и canvas. Она тестируется в Node и управляется только объектами-командами через `W.applyCommand`. Рендер, звук, ввод и меню живут отдельно и читают состояние игры и очередь `game.events`. Сеть на этапе 3 заменит только источник команд.

**Tech Stack:** HTML + CSS + JS (classic `<script>`, без ES-модулей и сборки), Canvas 2D, Web Audio API. Тесты: `node --test` (Node 24), скрипты грузятся через `vm`.

**Spec:** `docs/design.md`

## Global Constraints

- Никаких оригинальных ассетов Вормикса. Вся графика рисуется кодом, все звуки синтезируются через Web Audio. Файлов картинок и аудио нет.
- Без фреймворков, сборщика и npm-зависимостей для игры. Игра открывается двойным кликом по `index.html` (`file://`), поэтому никаких ES-модулей и `fetch` локальных файлов.
- Весь JS — классические скрипты в виде `(function (W) { ... })(window.W = window.W || {});`.
- Мир 1600×800, вписан в окно с сохранением пропорций, камера не двигается.
- Физика с фиксированным шагом `1/60` с.
- Весь текст интерфейса на русском.
- Логика игры (`js/core.js`, `terrain.js`, `physics.js`, `explosion.js`, `weapons.js`, `game.js`) не трогает `document`, `canvas` или `Audio`.
- Случайность в логике только через `game.rng` (сидовый ГСЧ). `Math.random` в логике запрещён: это нужно для сети.

## Review Focus

1. Быстрый снаряд (базука на полной силе, 900 px/s) не должен пролетать сквозь тонкую стенку в 4 px. Тест в Task 4.
2. Выстрел в упор в землю рядом с собой: снаряд, созданный внутри земли, взрывается сразу и ранит стрелявшего. Тест в Task 4.
3. Снаряд улетел за край мира: за бок дальше 200 px — удаляется, вверх — продолжает лететь и падает обратно, ход не зависает. Тест в Task 4 и Task 6.
4. Оба червяка погибли в одном ходу — ничья, а не победа того, кто ходил. Тест в Task 6.
5. Телепорт в землю или за пределы карты отклоняется: ход продолжается, заряд не тратится. Тест в Task 5.

---

## Структура файлов

```
index.html            — страница, подключает скрипты по порядку
css/style.css         — меню, панель оружия, HUD-оверлеи
js/core.js            — W.CFG, W.rng, W.clamp, W.dist
js/terrain.js         — W.Terrain: маска земли, дыры, запросы столкновений
js/physics.js         — червяк (ходьба, прыжок, падение, вода), снаряды
js/explosion.js       — W.explode: дыра + урон + отбрасывание
js/weapons.js         — W.WEAPONS, W.WEAPON_ORDER, W.fireWeapon
js/game.js            — W.createGame, W.applyCommand, W.stepGame (ходы, таймеры, победа)
js/maps/polyanka.js, halloween.js, pirates.js, mine.js, wildwest.js — W.MAPS.<id>
js/terrainArt.js      — W.TerrainArt: canvas с артом земли, выгрызание дыр, построение маски
js/render.js          — W.Renderer: небо, фон, земля, вода, червяки, снаряды, эффекты, HUD
js/audio.js           — W.Sfx: синтез звуков
js/input.js           — W.Input: клавиатура/мышь → команды
js/ui.js              — меню, панель оружия, экран результата (DOM)
js/main.js            — сборка всего, игровой цикл
tests/load.js         — загрузчик скриптов в vm-контекст
tests/*.test.js
```

---

### Task 1: Каркас, core и тестовый загрузчик

**Files:**
- Create: `index.html`, `css/style.css`, `js/core.js`, `tests/load.js`, `tests/core.test.js`, `.gitignore`

**Interfaces:**
- Produces:
  - `W.CFG` — объект констант (значения ниже).
  - `W.rng(seed: number) → () => number` в `[0,1)` (mulberry32).
  - `W.clamp(v, a, b)`, `W.dist(ax, ay, bx, by)`.
  - `tests/load.js`: `load(...files: string[]) → W` выполняет `js/<file>` по порядку в одном `vm`-контексте, где `window === globalThis`, и возвращает `W`.

`W.CFG` (точные значения): `WORLD_W 1600, WORLD_H 800, WATER_Y 760, DT 1/60, GRAVITY 900, WIND_MAX 10, WIND_ACCEL 15, TURN_TIME 30, RETREAT_TIME 3, HP 100, WORM_R 10, WALK_SPEED 50, MAX_CLIMB 6, JUMP_VX 120, JUMP_VY -220, BACKJUMP_VX -60, BACKJUMP_VY -330, FALL_SAFE 60, FALL_DIV 4, FALL_MAX 30, MAX_SHOT_SPEED 900, CHARGE_TIME 1.5, OFFWORLD_MARGIN 200`.

- [ ] **Step 1:** `git init` в корне проекта, `.gitignore` с `.DS_Store`.
- [ ] **Step 2: Тест** `tests/core.test.js`:
  - `rng(42)` дважды даёт одинаковые первые 5 чисел, все в `[0,1)`. `rng(43)` даёт другое первое число.
  - `W.CFG.WORLD_W === 1600 && W.CFG.HP === 100 && W.CFG.TURN_TIME === 30`.
  - `clamp(5,0,3) === 3`, `dist(0,0,3,4) === 5`.
- [ ] **Step 3:** `node --test tests/` → FAIL (нет файлов).
- [ ] **Step 4:** Реализовать `tests/load.js` и `js/core.js`. Создать `index.html`: `<canvas id="game">`, контейнер `#ui`, подключение `css/style.css` и скриптов в порядке из «Структуры файлов». Пока подключены только существующие файлы, остальные добавляются в своих задачах. Создать `css/style.css`: тёмный фон страницы, canvas по центру.
- [ ] **Step 5:** `node --test tests/` → PASS.
- [ ] **Step 6:** Commit `feat: каркас проекта, core и тестовый загрузчик`.

---

### Task 2: Земля-маска

**Files:** Create `js/terrain.js`, `tests/terrain.test.js`

**Interfaces:**
- Consumes: `W.CFG`, `W.dist`.
- Produces: `class W.Terrain(w, h)`:
  - `mask: Uint8Array` (1 = земля), `holes: {x,y,r}[]`.
  - `isSolid(x, y) → bool`. Координаты округляются вниз. Вне `[0,w)×[0,h)` → `false`.
  - `fillRect(x,y,w,h)`, `fillCircle(x,y,r)` — для тестов и генерации.
  - `carve(x, y, r)` — обнуляет круг и добавляет `{x,y,r}` в `holes`.
  - `applyHoles(list)` — повторяет `carve` для каждой дыры (для сети и восстановления).
  - `circleHitsSolid(x, y, r) → bool`.
  - `static fromAlpha(w, h, rgba: Uint8ClampedArray) → Terrain` — земля там, где альфа > 128.

- [ ] **Step 1: Тест** `tests/terrain.test.js`:
  - После `fillRect(0,500,1600,300)`: `isSolid(10,600)` → true, `isSolid(10,400)` → false, `isSolid(-1,600)` → false, `isSolid(1600,600)` → false.
  - `carve(800,500,40)`: `isSolid(800,520)` → false, `isSolid(800,560)` → true, `holes` равно `[{x:800,y:500,r:40}]`.
  - `applyHoles` на свежей земле даёт ту же маску, что исходные `carve` (сравнить массивы).
  - `circleHitsSolid(800,490,5)` → false до заливки и true после `fillCircle(800,490,3)`.
  - `fromAlpha(2,1,[0,0,0,255, 0,0,0,0])`: `isSolid(0,0)` → true, `isSolid(1,0)` → false.
- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** Реализовать `js/terrain.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** Commit `feat: разрушаемая земля-маска`.

---

### Task 3: Физика червяка

**Files:** Create `js/physics.js`, `tests/worm.test.js`

**Interfaces:**
- Consumes: `W.CFG`, `W.Terrain`.
- Produces:
  - `W.makeWorm(id, name, x, y) → worm`: `{id, name, x, y, vx, vy, hp: CFG.HP, facing: 1, aim: 0, grounded: false, fallStartY: y, dead: false, drowned: false}`. `x,y` — центр круга радиусом `WORM_R`. `aim` — угол в радианах относительно направления взгляда: 0 — горизонтально, отрицательный — вверх, диапазон `[-π/2, π/2]`.
  - `W.stepWorm(worm, terrain, walkDir: -1|0|1, dt) → events[]`. События: `{type:'land', worm, fall}`, `{type:'fallDamage', worm, amount}`, `{type:'drown', worm}`.
  - `W.jumpWorm(worm, back: bool)` — только если `grounded`. Вперёд: `vx = JUMP_VX*facing, vy = JUMP_VY`. Назад: `vx = BACKJUMP_VX*facing, vy = BACKJUMP_VY`.
  - `W.isWormResting(worm) → bool` — стоит на земле с нулевой скоростью, или мёртв.

Поведение:
- На земле при `walkDir ≠ 0`: `facing = walkDir`, сдвиг на `WALK_SPEED*dt`. Подъём на ступень не выше `MAX_CLIMB` px разрешён, выше — стена, червяк стоит. Спуск по склону прилипает к земле; если опоры нет ниже `MAX_CLIMB`, червяк начинает падать.
- В воздухе: гравитация, коллизия кругом, без отскока. При касании земли `grounded = true`, скорости обнуляются. `fall = y - fallStartY`. Урон: `min(FALL_MAX, (fall - FALL_SAFE)/FALL_DIV)` при `fall > FALL_SAFE`, округление вниз.
- Если `y > WATER_Y`: `hp = 0, dead = drowned = true`, событие `drown`.
- `hp ≤ 0` → `dead = true`.
- Мёртвый червяк не двигается. Утонувший пропадает, погибший на суше остаётся надгробием в render.

- [ ] **Step 1: Тест** `tests/worm.test.js` на земле `fillRect(0,500,1600,300)`:
  - Червяк в `(800,300)` за ≤ 3 с шагов `DT` встаёт на землю: `grounded`, `|y - 490| ≤ 1`, урон от падения `floor(min(30,(190-60)/4)) = 30`, событие `fallDamage` с `amount 30`.
  - Червяк в `(800,440)` падает на 50 px — урона нет.
  - Ходьба вправо 1 с: `x` увеличился на `50±2`, `facing === 1`.
  - Стена `fillRect(820,480,20,20)` (ступень 20 px): при ходьбе вправо `x` не превышает `810`.
  - Ступень `fillRect(820,496,200,4)` (4 px): червяк проходит, `x > 830`.
  - Прыжок вперёд с земли: через 0.1 с `y < 490`, через 3 с снова `grounded`.
  - Червяк над пустотой (`x=100`, нет земли) падает ниже `WATER_Y` → `dead && drowned`, событие `drown`.
- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** Реализовать движение червяка в `js/physics.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** Commit `feat: физика червяка`.

---

### Task 4: Снаряды и взрывы

**Files:** Modify `js/physics.js`. Create `js/explosion.js`, `tests/projectile.test.js`, `tests/explosion.test.js`

**Interfaces:**
- Consumes: `W.Terrain`, `worm` из Task 3.
- Produces:
  - Снаряд: `{kind, x, y, vx, vy, r, windAffected: bool, bounce: number|null, fuse: number|null, owner, onImpact: string}`. `bounce` — коэффициент отскока (граната 0.5). `fuse` — секунды до взрыва или null (взрыв при касании). `onImpact` — id обработчика в `weapons.js`.
  - `W.stepProjectile(p, terrain, worms, wind, dt, events?) → 'flying'|'explode'|'gone'`. `events` — необязательный массив для событий (`bounce` добавляется в Task 11). Ветер: `vx += wind*WIND_ACCEL*dt`, если `windAffected`. Движение подшагами не длиннее 2 px. Касание земли или червяка (кроме `owner` в первые 0.1 с полёта) без `bounce` → `'explode'`. С `bounce` — отражение скорости по нормали маски с потерей `bounce`. Если `fuse` дошёл до 0 → `'explode'`. `x < -OFFWORLD_MARGIN`, `x > WORLD_W+OFFWORLD_MARGIN` или `y > WATER_Y` → `'gone'`. Вверх ограничения нет. Если снаряд создан внутри земли, при первом шаге сразу `'explode'`.
  - `W.explode(terrain, worms, x, y, radius, damage) → [{worm, dmg}]`. Вырезает дыру `carve(x,y,radius)`. Для каждого живого червяка: `d = dist`, `k = clamp(1 - d/(radius + WORM_R), 0, 1)`, `dmg = round(damage*k)`. При `dmg > 0`: `hp -= dmg`, отбрасывание `vx += nx*dmg*6`, `vy += ny*dmg*6 - dmg*3`, где `(nx,ny)` — единичный вектор от центра к червяку (при `d=0` — вверх), `grounded = false`, `fallStartY = y`.

- [ ] **Step 1: Тест** `tests/projectile.test.js`:
  - Без земли, без ветра: снаряд `(100,100)` с `vx=100, vy=0` через 1 с: `x≈200±1`, `y≈100+450±2`.
  - С ветром +10 и `windAffected`: через 1 с `x` больше, чем без ветра. Без `windAffected` — не меняется.
  - **Review Focus 1:** стенка `fillRect(500,0,4,800)`, снаряд `(400,400)` `vx=900` → за ≤ 0.5 с возвращает `'explode'` при `x < 506`.
  - **Review Focus 2:** снаряд внутри `fillRect(0,500,1600,300)` в `(800,600)` → первый шаг `'explode'`.
  - **Review Focus 3:** снаряд `vx=-900` от `x=10` → `'gone'` после `x < -200`. Снаряд `vy=-900` от `y=50` без земли → летит вверх (`y < 0`), потом падает и возвращает `'gone'` после `y > WATER_Y`.
  - Граната (`bounce 0.5, fuse 3`), брошенная в пол, отскакивает (через 0.2 с после касания `vy < 0`) и возвращает `'explode'` через 3±0.05 с.
- [ ] **Step 2: Тест** `tests/explosion.test.js`:
  - Червяк ровно в центре взрыва 50/40: `dmg 50`, `hp 50`.
  - Червяк на расстоянии 25: `dmg = round(50*(1-25/50)) = 25`.
  - Червяк на расстоянии 60: `dmg 0`, `hp` не изменилось.
  - После взрыва у задетого червяка `grounded === false` и `vx` направлен от центра.
  - `terrain.holes` содержит дыру взрыва.
- [ ] **Step 3:** `node --test tests/` → FAIL.
- [ ] **Step 4:** Реализовать `W.stepProjectile` в `js/physics.js` и `W.explode` в `js/explosion.js`.
- [ ] **Step 5:** `node --test tests/` → PASS.
- [ ] **Step 6:** Commit `feat: снаряды и взрывы`.

---

### Task 5: Оружие

**Files:** Create `js/weapons.js`, `tests/weapons.test.js`

**Interfaces:**
- Consumes: снаряд и `W.explode` из Task 4, `game` из Task 6 (только поля `terrain, worms, projectiles, events, rng, ammo, current, fuse`). В тестах `game` собирается вручную.
- Produces:
  - `W.WEAPON_ORDER = ['bazooka','grenade','mortar','shotgun','sniper','dynamite','airstrike','teleport']` — порядок также задаёт клавиши 1–8.
  - `W.WEAPONS[id] = {id, name, ammo, aim: 'charge'|'instant'|'target'|'drop'}`. Названия: Базука, Граната, Мортира, Дробовик, Снайперка, Динамит, Авиаудар, Телепорт. Запас: ∞, ∞, 3, ∞, ∞, 2, 1, 2.
  - `W.fireWeapon(game, worm, cmd: {weapon, angle, power, target}) → bool`. `angle` — абсолютный угол выстрела в радианах. `power` от 0 до 1. `target` — `{x,y}` для авиаудара и телепорта. Возвращает false, если выстрел отклонён: нет заряда или неверная цель. Заряд списывается только при `true`.
  - `W.IMPACT[onImpact](game, p)` — обработчики взрыва снарядов, вызываются из `stepGame`.
  - Каждый выстрел/взрыв пишет в `game.events`: `{type:'shot', weapon, x, y}`, `{type:'explosion', x, y, r}`, `{type:'tracer', x1,y1,x2,y2}`, `{type:'teleport', from:{x,y}, to:{x,y}}`, `{type:'damage', worm, dmg}`.

Значения (из спеки):
| id | реализация |
|---|---|
| bazooka | снаряд со скоростью `power*MAX_SHOT_SPEED`, ветер, взрыв 50/40 |
| grenade | `bounce 0.5`, `fuse = game.fuse[current]`, без ветра, взрыв 45/40 |
| mortar | снаряд с ветром. При ударе взрыв 35/30 + 5 осколков: скорость 250–400, угол вверх ±60° (через `game.rng`), ветер, взрыв при касании 25/20 |
| shotgun | 7 лучей с разбросом ±8°, дальность 600, попадание по червяку 6 урона + толчок, по земле дырка r=6 |
| sniper | один луч дальностью 1600, урон `round(20 + 30*clamp(d/800,0,1))`, по земле дырка r=4 |
| dynamite | снаряд у ног червяка (`vx=0, vy=0, bounce 0.2, fuse 4`), взрыв 75/60 |
| airstrike | 5 ракет в `x = target.x + (i-2)*30`, `y = -50`, `vy = 300`, ветер, взрыв 25/30 |
| teleport | `target` внутри мира и `!circleHitsSolid(target, WORM_R)` → червяк переносится, `grounded=false, fallStartY=target.y` |

Лучи (shotgun, sniper) идут от червяка шагами по 2 px до первого червяка (кроме стрелявшего) или земли.

- [ ] **Step 1: Тест** `tests/weapons.test.js` (земля `fillRect(0,500,1600,300)`, червяк A в `(400,490)`, B в `(800,490)`, `game.rng = W.rng(1)`):
  - Базука горизонтально по B с `power 1`: после шагов `stepProjectile` и `W.IMPACT` hp B < 100.
  - Снайперка по B (дистанция 400): hp B = `100 - 35`.
  - Дробовик в упор (B в `(430,490)`): B получает от 6 до 42, кратно 6.
  - Мортира: запас 3 → после выстрела 2. На 4-й выстрел `fireWeapon` → false.
  - Мортира при ударе создаёт ровно 5 осколков в `game.projectiles`.
  - Авиаудар: создаёт 5 снарядов с `x` = `target.x-60…target.x+60` с шагом 30.
  - **Review Focus 5:** телепорт в `(800,600)` (в земле) → false, запас 2. Телепорт в `(-50,100)` → false. Телепорт в `(1000,300)` → true, червяк в `(1000,300)`, запас 1.
  - Динамит: через 4±0.05 с — событие `explosion` с `r 60`.
  - Один и тот же сид даёт одинаковые позиции осколков мортиры в двух прогонах.
- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** Реализовать `js/weapons.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** Commit `feat: восемь видов оружия`.

---

### Task 6: Игра, ходы, команды

**Files:** Create `js/game.js`, `tests/game.test.js`

**Interfaces:**
- Consumes: всё из Task 2–5.
- Produces:
  - `W.createGame({terrain, spawnXs: [x0, x1], names: [n0, n1], seed}) → game` с полями `{terrain, worms[2], projectiles[], events[], rng, current, phase, turnTime, retreatTime, wind, ammo[2], weapon[2], fuse[2], walkDir, winner, turnNumber}`. Червяки ставятся в `spawnXs` на поверхность: ищется первая земля сверху, без урона от падения. `current` выбирается через `rng`. `wind` — целое из `[-10,10]` через `rng`. `ammo` — копии запасов из `W.WEAPONS`. `weapon` — `'bazooka'`, `fuse` — 3.
  - `phase`: `'turn'` (активный игрок действует, идёт таймер) → `'retreat'` (после выстрела 3 с, стрелять нельзя, ходить можно) → `'settling'` (ввод игнорируется, ждём покоя) → следующий `'turn'` или `'gameover'`.
  - `W.applyCommand(game, player, cmd) → bool`. Принимает только `player === game.current` и фазу `'turn'` (в `'retreat'` — только `walk`/`jump`). Команды:
    - `{type:'walk', dir}`
    - `{type:'jump', back}`
    - `{type:'aim', angle}` — меняет `facing` и `aim` по абсолютному углу
    - `{type:'select', weapon}`
    - `{type:'fuse', seconds: 1..5}`
    - `{type:'fire', power, target}` — использует текущий `aim` и `facing`; при успехе → `'retreat'`
    - `{type:'skip'}` → `'settling'`
  - `W.stepGame(game, dt)` — шаг физики червяков и снарядов, обработка взрывов через `W.IMPACT`, таймеры. `turnTime` и `retreatTime` уменьшаются только если `projectiles.length === 0`. `turnTime ≤ 0` в `'turn'` → `'settling'`. `retreatTime ≤ 0` → `'settling'`. Урон от падения или смерть активного червяка в его ход → `'settling'`. В `'settling'`, когда нет снарядов и все червяки `isWormResting`: если живых 0 → `winner = 'draw'`, если 1 → его индекс, фаза `'gameover'`; иначе `current` меняется, новый ветер, `turnTime = TURN_TIME`, `walkDir = 0`, `turnNumber++`, событие `{type:'turnStart', player}`.
  - `game.events` накапливается. Потребитель (main.js) вычитывает и очищает его.

- [ ] **Step 1: Тест** `tests/game.test.js` (земля `fillRect(0,500,1600,300)`, `spawnXs [400,1200]`, `seed 7`):
  - После `createGame` и 2 с шагов: оба червяка `grounded`, hp 100 (появление без урона).
  - `current` при одинаковом сиде одинаков. `wind` целый и в `[-10,10]`.
  - `applyCommand` от не-текущего игрока → false.
  - Без действий через 30 с (плюс время на покой) ход переходит: `current` сменился, `turnTime === 30`, есть событие `turnStart`.
  - После `fire` базукой фаза `'retreat'`. Пока снаряд летит, `retreatTime` остаётся 3. `fire` во время `'retreat'` → false, `walk` → true.
  - `skip` → следующий ход после покоя.
  - Активный червяк прыгает с обрыва высотой ≥ 200 px (добавить карниз) → получает урон, фаза сразу `'settling'`.
  - Червяк утонул → `winner` — индекс другого, фаза `'gameover'`.
  - **Review Focus 4:** оба червяка в одной точке с hp 10, взрыв динамита → `winner === 'draw'`.
  - **Review Focus 3:** базука строго вверх (`aim = -π/2`, `power 1`) → снаряд улетает за `y<0`, возвращается, взрывается или уходит в воду, и игра доходит до следующего хода (не зависает за 60 с симуляции).
- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** Реализовать `js/game.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** Commit `feat: логика матча и ходов`.

---

### Task 7: Первый играбельный экран — рендер, ввод, цикл, карта «Полянка»

**Files:** Create `js/terrainArt.js`, `js/maps/polyanka.js`, `js/render.js`, `js/input.js`, `js/main.js`. Modify `index.html`, `css/style.css`

**Interfaces:**
- Consumes: `W.createGame`, `W.applyCommand`, `W.stepGame`, `game.events`.
- Produces:
  - Карта: `W.MAPS[id] = {id, name, spawnXs: [x0,x1], waterColor, drawSky(ctx,w,h), drawBackdrop(ctx,w,h), drawTerrain(ctx,w,h)}`. `drawTerrain` рисует только землю (всё, что непрозрачно, — твёрдое). Небо и силуэты — в `drawSky` и `drawBackdrop`.
  - `class W.TerrainArt(map)`: `canvas` с землёй, `buildTerrain() → W.Terrain` (через `getImageData` и `W.Terrain.fromAlpha`), `carve(x,y,r)` — `destination-out` плюс тёмная обгоревшая кромка шириной ~4 px через `source-atop`. `applyHoles(list)`.
  - `class W.Renderer(canvas)`: `resize()` вписывает мир 1600×800 в окно. `draw(game, map, art, view)`, где `view = {charge: 0..1|null, hoverTarget: {x,y}|null, effects}`. Слои: небо и силуэты (кешируются в offscreen canvas) → земля → снаряды → червяки → вода (волны, лёгкая анимация) → эффекты → HUD. HUD: таймер и чей ход снизу по центру, индикатор ветра (стрелка-полоска), полоска силы при зарядке, прицел у активного червяка, таймер гранаты над ней, у каждого червяка над головой хп и имя в цвете игрока (игрок 1 — синий, игрок 2 — красный).
  - `class W.Input(canvas, renderer, opts: {canControl(player) → bool, send(cmd)})`. Хранит `charge`. Клавиатура:
    - `←/→` — `walk` при нажатии и отпускании
    - `Enter` — `jump` вперёд, `Backspace` — `jump` назад
    - `Space` или ЛКМ — зарядка/выстрел для `aim:'charge'`; для `'instant'` и `'drop'` — выстрел сразу; для `'target'` — ЛКМ по карте = `fire` с `target`
    - `Tab` или ПКМ — открыть/закрыть панель оружия (callback `onTogglePanel`)
    - `1–8` — `select`. Если выбрана граната, `1–5` — `fuse`.
    Мышь при движении шлёт `aim` с абсолютным углом от активного червяка к курсору (в мировых координатах). Зарядка: от 0 до 1 за `CHARGE_TIME`; при 1 — автоматический выстрел.
  - `js/main.js`: `W.startMatch({mapId, names})` создаёт игру, art, input. Цикл `requestAnimationFrame` с аккумулятором фиксированного шага `DT`. На каждом кадре вычитывает `game.events`: `explosion` → `art.carve` + эффект частиц/вспышки, `tracer` → линия трассера на 0.15 с, `damage` → всплывающая цифра. Хотсит: `canControl` всегда true для текущего игрока.

Карта «Полянка» по мотивам референса: голубое небо с градиентом, 2–3 облака-завитушки, бледно-сиреневые силуэты деревьев и скамейки. Земля — травяной холм-остров на всю ширину с краями, обрывающимися в воду. На нём колодец из камней, большое дерево с кроной (ствол и крона — твёрдые), корзина яблок, мольберт с картиной, тропинка, камушки. Стиль: толстый тёмный контур, сочные цвета, мягкие внутренние тени.

- [ ] **Step 1:** Реализовать файлы. В `index.html` временно стартовать `W.startMatch({mapId:'polyanka', names:['Игрок 1','Игрок 2']})` при загрузке (меню появится в Task 10).
- [ ] **Step 2:** `node --test tests/` → PASS (логика не сломана).
- [ ] **Step 3: Проверка в браузере** (открыть `file:///…/червячки/index.html` в Chrome через claude-in-chrome, сделать скриншоты):
  - Видна Полянка, два червяка стоят на земле, в консоли нет ошибок.
  - ←/→ двигает активного червяка, Enter прыгает.
  - Прицел следует за мышью. Зажатие пробела заполняет полоску силы, отпускание стреляет базукой. Взрыв выгрызает дыру с тёмной кромкой, хп уменьшается.
  - Через 3 с после выстрела ход переходит, ветер меняется, таймер 30.
  - Червяк, сброшенный в воду, тонет, появляется победитель (пока можно просто текстом в HUD).
- [ ] **Step 4:** Commit `feat: первый играбельный экран и карта Полянка`.

---

### Task 8: Панель оружия и стрельба всеми видами оружия в браузере

**Files:** Create `js/ui.js`. Modify `js/input.js`, `js/render.js`, `css/style.css`, `index.html`

**Interfaces:**
- Produces: `W.UI.weaponPanel = {open(game, player), close(), isOpen()}` — DOM-панель внизу экрана: сетка из 8 ячеек с иконками (рисуются кодом на маленьких canvas), названиями, остатком (∞ или число), номером клавиши и кнопкой «Пропустить ход». Клик выбирает оружие (команда `select`) и закрывает панель. Пустые ячейки с `ammo 0` затемнены и не кликаются.
- Рендер: для `aim:'target'` — перекрестие у курсора, для авиаудара — силуэт самолёта при вызове (событие `shot` с `weapon 'airstrike'`). Эффект телепорта (вспышка на старом и новом месте). Тлеющий фитиль у динамита. Таймер над гранатой.

- [ ] **Step 1:** Реализовать.
- [ ] **Step 2: Проверка в браузере** — каждое из 8 видов оружия выбирается через панель и через клавиши 1–8, стреляет и даёт видимый эффект. Счётчики мортиры, динамита, авиаудара и телепорта уменьшаются. Клавиши 1–5 при гранате меняют таймер над ней, а не оружие.
- [ ] **Step 3:** Commit `feat: панель оружия`.

---

### Task 9: Остальные 4 карты

**Files:** Create `js/maps/halloween.js`, `js/maps/pirates.js`, `js/maps/mine.js`, `js/maps/wildwest.js`. Modify `index.html`

**Interfaces:** формат `W.MAPS[id]` из Task 7.

Содержимое по референсам из спеки:
- **halloween** «Хэллоуин»: сливово-малиновое небо, тёмные облака-завитушки, силуэты замка и крестов. Земля: тёмная площадка, большие светящиеся тыквы, шляпа ведьмы, метла, два кривых дерева с дуплом-глазами, свечи, леденцы.
- **pirates** «Пиратский остров»: закатное фиолетово-оранжевое небо, силуэты пальм. Земля: песчаная горка, сундук с золотом на вершине, скелет, пальма, камни.
- **mine** «Шахта»: небо от бирюзового к песочному. Земля с туннелями и пещерами (Е-образная форма, как на референсе), кости динозавра в породе, рельсы с вагонеткой наверху, отдельный парящий остров с табличкой «Шахта», пальмы.
- **wildwest** «Дикий Запад»: голубое небо, сиреневые силуэты каньонов. Земля: салун, водонапорная башня с бочкой, мельница, шериф-офис со звездой, деревянные платформы.

Каждая карта даёт по 2 точки `spawnXs`, где червяки стоят на земле на заметном расстоянии друг от друга, и хотя бы 2 пути (через прыжки), чтобы добраться к врагу или укрыться.

- [ ] **Step 1:** Реализовать 4 карты.
- [ ] **Step 2: Проверка в браузере** — временно запустить каждую карту, скриншот каждой. Червяки появляются на земле, без урона. Взрывы выгрызают дыры. Стиль узнаваемо мультяшный (толстый контур, сочные цвета).
- [ ] **Step 3:** Commit `feat: карты Хэллоуин, Пиратский остров, Шахта, Дикий Запад`.

---

### Task 10: Меню и экран результата

**Files:** Modify `js/ui.js`, `js/main.js`, `css/style.css`, `index.html`

**Interfaces:**
- Produces:
  - `W.UI.showMenu(onStart({mapId, names}))` — заголовок «Червячки». Два поля имени (по умолчанию «Игрок 1», «Игрок 2»). Выбор карты: 5 карточек с мини-превью (`drawSky` + `drawBackdrop` + `drawTerrain`, уменьшенные) плюс «Случайная». Кнопка «Хотсит — в бой!». Кнопки «Создать игру» и «Подключиться» видны, но неактивны с подписью «скоро».
  - `W.UI.showResult(winnerName | null, onAgain, onMenu)` — «Победил <имя>!» или «Ничья!», кнопки «Ещё раз» (та же карта и имена) и «В меню».
- Убрать временный автозапуск из Task 7.

- [ ] **Step 1:** Реализовать.
- [ ] **Step 2: Проверка в браузере** — меню, выбор каждой карты, старт, бой до конца, «Ещё раз» запускает новый бой на свежей карте, «В меню» возвращает в меню.
- [ ] **Step 3:** Commit `feat: меню и экран результата`.

---

### Task 11: Звуки

**Files:** Create `js/audio.js`. Modify `js/main.js`, `index.html`

**Interfaces:**
- Produces: `W.Sfx = {unlock(), play(name, opts?), setMuted(bool)}`. `unlock()` создаёт `AudioContext` по первому клику/клавише. Имена: `bazookaShot, explosionSmall, explosionMedium, explosionBig, shotgun, sniper, throw, bounce, tick, fuse, plane, teleport, jump, step, hurt, splash, timerTick, win`. Синтез: взрывы — шум через низкочастотный фильтр с огибающей, сила зависит от радиуса. Выстрелы — короткие щелчки шума плюс тон. «Бульк» — тон с падением частоты. Писк червяка — короткий высокий тон с вибрато. Самолёт — пилообразный тон с доплером. Тиканье — короткие щелчки.
- `main.js` сопоставляет события: `shot` → звук оружия, `explosion` → по `r` (≤25 small, ≤45 medium, иначе big), `damage` → hurt, `drown` → splash, `land` с `fall>20` → step, отскок гранаты → bounce (событие `{type:'bounce'}` добавить в `stepProjectile`). Последние 5 с хода → `timerTick` раз в секунду, `gameover` → win.
- Кнопка звука 🔊/🔇 в углу HUD.

- [ ] **Step 1:** Добавить событие `bounce` в `stepProjectile` и тест: граната при отскоке пишет `{type:'bounce'}` в переданный массив событий. `node --test tests/` → FAIL, потом реализовать → PASS.
- [ ] **Step 2:** Реализовать `js/audio.js` и привязку.
- [ ] **Step 3: Проверка в браузере** — консоль без ошибок, каждое событие вызывает `W.Sfx.play` с ожидаемым именем (проверить логированием в консоль на время проверки). Кнопка мьюта работает. Качество звука на слух оценит владелец на этапе отладки.
- [ ] **Step 4:** Commit `feat: синтезированные звуки`.

---

### Task 12: Полировка вида и финальная проверка

**Files:** Modify `js/render.js`, `js/main.js`

- Червяки: розовое тело из сегментов с толстым контуром, большие глаза со зрачками, смотрящими по прицелу, покачивание в покое, «гусеничная» анимация ходьбы, гримаса и тряска при уроне, надгробие на месте погибшего.
- Эффекты: вспышка и огненный шар взрыва, разлетающиеся комочки земли цвета карты, дымок, всплеск в воде, трассеры, всплывающие цифры урона красным.
- Снаряды: дымный след у базуки и ракет, вращение гранаты и динамита.
- Плавное затемнение экрана при смене хода с плашкой «Ход: <имя>» на 1 с.

- [ ] **Step 1:** Реализовать.
- [ ] **Step 2:** `node --test tests/` → PASS.
- [ ] **Step 3: Проверка в браузере** — полный бой на каждой из 5 карт до победы без ошибок в консоли. Скриншоты стрельбы каждым видом оружия. FPS стабилен (нет заметных подвисаний при взрывах).
- [ ] **Step 4:** Commit `feat: полировка графики`.

---

После Task 12 игра передаётся владельцу на этап 2 (отладка по ощущениям). Мультиплеер (этап 3) — отдельный план.
