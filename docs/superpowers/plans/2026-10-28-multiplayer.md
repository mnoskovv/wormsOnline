# Мультиплеер по ссылке — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Два игрока в разных городах играют дуэль по ссылке: один создаёт комнату, второй открывает ссылку, игра лежит на GitHub Pages.

**Architecture:** Модель «авторитет у ходящего». Симуляцию (`W.stepGame`) крутит только клиент того, чей сейчас ход (`game.current === me`). Каждый кадр после шагов он отправляет второму снимок состояния (`W.snapshot`) и события кадра. Второй клиент не симулирует, а применяет снимок (`W.applySnapshot`) и проигрывает события ради эффектов и звуков. Когда ход переходит (`resolve` меняет `current`), старый авторитет отправляет последний снимок уже с новым `current` и перестаёт шагать, а получатель с этого снимка становится авторитетом. Расхождение состояния невозможно: в каждый момент истину держит один клиент. Команды по сети не ходят, ходит только состояние. Транспорт — PeerJS (WebRTC DataChannel, надёжный и упорядоченный) через бесплатный публичный брокер.

**Tech Stack:** чистый JS на классических `<script>`, Canvas 2D, PeerJS 1.5.4 с unpkg, `node --test`.

**Spec:** `docs/design.md`, раздел «Мультиплеер (этап 3)». Ловушки, найденные на этапе 1: память `chervyachki-stage3-notes`.

## Global Constraints

- Без сборки и npm-зависимостей для игры. PeerJS подключается тегом `<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js">`.
- Хотсит должен работать как раньше, в том числе при двойном клике по `index.html`. Если PeerJS не загрузился (нет сети), хотсит всё равно работает, а сетевые кнопки показывают ошибку.
- Логика (`core/terrain/physics/explosion/weapons/game/sync.js`) не трогает DOM и тестируется в Node.
- Ссылка комнаты: `<origin><pathname>?room=КОД`. КОД — 5 символов из `abcdefghjkmnpqrstuvwxyz23456789`. Id пира хоста — `chervyachki-КОД`.
- Хост — игрок 0, гость — игрок 1. Имена: хост берёт имя «Игрок 1» из меню, гость — из своего поля имени.
- Тексты интерфейса: «Создать игру», «Подключиться», «Ждём соперника…», «Скопировать ссылку», «Соперник отключился», «Комната не найдена», «Комната занята», «Разные версии игры — обновите страницу», «Твой ход!».
- Ветка `multiplayer` от `main`. Коммиты на русском, как раньше.

## Протокол (все сообщения — JSON-объекты с полем `t`)

| Сообщение | Кто → кому | Поля |
|---|---|---|
| `hello` | гость → хост | `v` (версия протокола, `W.NET_VERSION = 1`), `name` |
| `start` | хост → гость | `seed`, `mapId`, `names: [хост, гость]` |
| `state` | авторитет → другой | `s` (снимок), `ev` (закодированные события), `charge` (число или null) |
| `rematch` | любой → любой | — |
| `ping` | оба, раз в 1 с | — |
| `bye` | уходящий | — |
| `reject` | хост → гость | `reason`: `'busy'` или `'version'` |

Связь считается потерянной, если 8 с не пришло ни одного сообщения, или по событию `close`/`error` соединения.

## Review Focus

1. Окно авторитета свёрнуто или перекрыто посреди хода (rAF стоит) → игра продолжает идти, пусть и рывками, а не замирает у обоих навсегда. Пинится в Task 4 (проверка через `document.hidden`-ветку цикла).
2. Соперник закрыл вкладку посреди боя → у второго не дольше чем через 8 с «Соперник отключился» и кнопка «В меню». Task 5, проверка в браузере.
3. Запоздавший снимок от прошлого авторитета приходит после передачи хода → игнорируется, состояние нового авторитета не откатывается. Task 2, юнит-тест.
4. Третий человек открыл ту же ссылку во время боя → получает «Комната занята», бой не ломается. Task 5, проверка в браузере.
5. Бесконечный запас оружия проходит через JSON (`Infinity` → `null`) → после применения снимка базука всё ещё ∞, а не 0. Task 1, юнит-тест.

Известный риск без теста: маска земли строится растеризацией canvas и на разных машинах может отличаться на пиксель по краю. Модель авторитета делает это безвредным: позиции всегда берутся из снимка.

---

### Task 1: Снимок состояния игры

**Files:**
- Modify: `js/core.js` (ГСЧ с сохраняемым состоянием)
- Modify: `js/game.js` (снимок, применение, кодирование событий)
- Test: `tests/snapshot.test.js`

**Interfaces:**
- Produces:
  - `W.rng(seed)` возвращает функцию как раньше плюс методы `getState() → number` и `setState(n)`.
  - `W.snapshot(game, holesFrom = 0) → object` — JSON-безопасный снимок: `current, phase, turnTime, retreatTime, settleTime, wind, ammo, weapon, fuse, walkDir, winner, turnNumber, rng` (состояние ГСЧ), `worms` (все поля червяков), `projectiles` (все поля, `owner` → id червяка или null), `holesFrom`, `holes` (= `terrain.holes.slice(holesFrom)`). В `ammo` значение `Infinity` кодируется как `-1`.
  - `W.applySnapshot(game, snap)` — червяки обновляются на месте (`Object.assign`, объекты не пересоздаются), снаряды заменяются новыми объектами с `owner` → объект червяка, дыры с индексом `holesFrom + i >= terrain.holes.length` вырезаются через `terrain.carve`, `-1` в ammo → `Infinity`, ГСЧ получает `setState`.
  - `W.encodeEvent(e) → object` — копия события, где поле `worm` (объект) заменено на его `id`. `W.decodeEvent(game, e) → object` — обратно, `worm` → `game.worms[id]`.

- [ ] **Step 1: Написать падающие тесты** в `tests/snapshot.test.js` (загрузка как в `game.test.js`, плоская земля, `newGame(seed)`):
  - `rng state round-trips`: `r = W.rng(5)`; дважды `r()`; `s = r.getState()`; `a = r()`; `r.setState(s)`; `assert.strictEqual(r(), a)`.
  - `snapshot survives JSON and recreates the same game`: игра 1 стреляет базукой (`aim` −0.5, `fire` power 0.7), шагаем 0.3 с (снаряд в полёте); `g2` — новая игра с тем же сидом; `W.applySnapshot(g2, JSON.parse(JSON.stringify(W.snapshot(g1))))`; `assert.deepStrictEqual(JSON.parse(JSON.stringify(W.snapshot(g2))), JSON.parse(JSON.stringify(W.snapshot(g1))))`; затем обе шагаем 3 с и снова сравниваем снимки (детерминизм после применения, включая взрыв и дыры).
  - `infinite ammo stays infinite`: после round-trip `g2.ammo[0].bazooka === Infinity`, `g2.ammo[0].mortar === 3`.
  - `projectile owner becomes the receiving game's worm`: после round-trip с летящим снарядом `g2.projectiles[0].owner === g2.worms[g2.current]`.
  - `holes apply incrementally without duplicates`: в `g1` вырезать 3 дыры; применить `W.snapshot(g1, 0)` к `g2`; вырезать в `g1` ещё 1; применить `W.snapshot(g1, 3)`; `g2.terrain.holes.length === 4`; повторно применить тот же снимок — всё ещё 4; `Buffer.compare` масок `g1` и `g2` = 0.
  - `worm objects are updated in place`: ссылка `const w = g2.worms[0]` до применения; после — `g2.worms[0] === w`, и `w.x` равно `g1.worms[0].x`.
  - `events encode worm as id`: `e = {type:'damage', worm: g1.worms[1], dmg: 7}`; `enc = W.encodeEvent(e)`; `enc.worm === 1`, `e.worm` не изменён; `W.decodeEvent(g2, JSON.parse(JSON.stringify(enc))).worm === g2.worms[1]`; событие без `worm` проходит без изменений.

- [ ] **Step 2: Запустить, убедиться, что падают**

Run: `node --test tests/snapshot.test.js`
Expected: FAIL — `getState is not a function` / `W.snapshot is not a function`.

- [ ] **Step 3: Реализовать** `getState/setState` в `W.rng` и четыре функции в `js/game.js`.

- [ ] **Step 4: Прогнать все тесты**

Run: `node --test`
Expected: все проходят (49 старых + новые).

- [ ] **Step 5: Коммит** `feat: снимок состояния игры для сети`

---

### Task 2: Синхронизация авторитет → наблюдатель

**Files:**
- Create: `js/sync.js` (без DOM)
- Test: `tests/sync.test.js`

**Interfaces:**
- Consumes: `W.snapshot`, `W.applySnapshot`, `W.encodeEvent`, `W.decodeEvent` из Task 1.
- Produces: `class W.Sync` — `new W.Sync(game, me, send)`, где `send(msg)` отправляет объект.
  - `get authority → boolean` — `game.current === me` (на `gameover` `stepGame` сам ничего не делает, отдельная проверка не нужна).
  - `publish(events, charge)` — отправляет `{t:'state', s: W.snapshot(game, this.sentHoles), ev: events.map(W.encodeEvent), charge}` и запоминает `sentHoles = game.terrain.holes.length`. Вызывается авторитетом каждый кадр, в котором он шагал (включая кадр передачи хода).
  - `receive(msg) → {events, charge}` или `null` — для `t:'state'`: если `this.authority` или `msg.s.turnNumber < game.turnNumber` → `null` (игнор); иначе `applySnapshot`, `sentHoles = game.terrain.holes.length`, вернуть декодированные события и `charge`.

- [ ] **Step 1: Написать падающие тесты** в `tests/sync.test.js`. Помощник: две игры с одним сидом (`gA`, `gB`), канал-массив: `syncA = new W.Sync(gA, 0, m => toB.push(JSON.parse(JSON.stringify(m))))`, аналогично `syncB` с `me = 1`. Функция `pump()` шагает авторитетную сторону на `DT`, вызывает её `publish(game.events.splice(0), null)` и доставляет очередь другой стороне через `receive`. Сид подобрать так, чтобы первым ходил игрок 0 (проверить `assert.strictEqual(gA.current, 0)`).
  - `observer mirrors the authority`: игрок 0 целится и стреляет базукой; 120 вызовов `pump()`; `deepStrictEqual` снимков `gA` и `gB` (через JSON).
  - `turn hands over to the other client`: игрок 0 делает `skip`; `pump()` до тех пор, пока `gA.current === 1` (не больше 20 с); после доставки `syncB.authority === true`, `syncA.authority === false`; теперь `pump()` шагает `gB`; игрок 1 через `W.applyCommand(gB, 1, …)` стреляет; после 200 `pump()` снимки равны.
  - `stale state after handover is ignored`: сохранить сообщение `old` от `gA` из хода 1; довести до передачи хода; `gB` сдвинуть червяка командой `walk`, пошагать; `syncB.receive(old)` возвращает `null`, позиция червяка в `gB` не изменилась.
  - `events arrive decoded`: выстрел, который ранит червяка 1 (плоская земля, червяки рядом: спавн `[400, 470]`, `aim` 0, дробовик); среди событий, возвращённых `receive`, есть `damage` с `worm === gB.worms[1]`.
  - `authority ignores incoming state`: `syncA.receive({t:'state', s: W.snapshot(gB), ev: [], charge: null})` при ходе игрока 0 → `null`.

- [ ] **Step 2: Запустить, убедиться, что падают**

Run: `node --test tests/sync.test.js`
Expected: FAIL — `W.Sync is not a constructor`.

- [ ] **Step 3: Реализовать `js/sync.js`**, подключить в `index.html` после `game.js`.

- [ ] **Step 4: Прогнать все тесты**

Run: `node --test`
Expected: всё зелёное.

- [ ] **Step 5: Коммит** `feat: синхронизация состояния между клиентами`

---

### Task 3: Сетевой транспорт на PeerJS

**Files:**
- Create: `js/net.js`
- Modify: `index.html` (тег PeerJS перед `js/net.js`; `net.js` после `sync.js`)

**Interfaces:**
- Produces: `W.NET_VERSION = 1`; `W.Net`:
  - `W.Net.available() → boolean` — загружен ли `window.Peer`.
  - `W.Net.host(handlers) → conn-объект` — создаёт `Peer('chervyachki-' + код)`; при `unavailable-id` пробует новый код (до 3 раз). `handlers.onRoom(code)` вызывается, когда комната готова. Принимает только первое соединение; последующие получают `{t:'reject', reason:'busy'}` и закрываются.
  - `W.Net.join(code, handlers)` — подключается к `chervyachki-` + код; ошибка `peer-unavailable` → `handlers.onError('Комната не найдена')`.
  - Общие handlers: `onOpen()`, `onMessage(msg)`, `onClose()` (потеря связи: `close`/`error` соединения или 8 с тишины), `onError(text)`.
  - Объект сессии: `send(msg)`, `close()` (шлёт `bye`, закрывает пир, гасит таймеры). Пинг раз в 1 с через `setInterval` (работает и в скрытой вкладке, хоть и реже — 8 с запаса это покрывают). `bye` от соперника → `onClose()`.

- [ ] **Step 1: Реализовать `js/net.js`.** Юнит-тестов нет: модуль — тонкая обёртка над браузерным WebRTC.

- [ ] **Step 2: Проверить в браузере.** Поднять `python3 -m http.server 8765 --bind 127.0.0.1`, открыть две вкладки. В первой через консоль `s = W.Net.host({onRoom: c => console.log('room', c), onMessage: m => console.log('A got', m)})`, во второй `W.Net.join(код, {onOpen: () => ..send({t:'x'}), onMessage: ...})`.
Expected: обе стороны видят сообщения друг друга; третья вкладка с тем же кодом получает `reject busy`; закрытие второй вкладки → `onClose` у первой не позже чем через 8 с; несуществующий код → «Комната не найдена».

- [ ] **Step 3: Прогнать тесты** `node --test` — зелёные (загрузка Node не задета).

- [ ] **Step 4: Коммит** `feat: сетевой транспорт PeerJS`

---

### Task 4: Игровой цикл в сетевом режиме

**Files:**
- Modify: `js/main.js` (`W.startMatch`, цикл)
- Modify: `js/render.js` только если подпись хода требует (баннер)

**Interfaces:**
- Consumes: `W.Sync` (Task 2).
- Produces: `W.startMatch({ mapId, names, seed, net })`. `seed` необязателен (по умолчанию случайный, как сейчас). `net` необязателен: `{ me: 0|1, send(msg) }`. Возвращаемый `m` получает `m.sync` (если сеть) и метод `m.receive(msg)`, который вызывает `m.sync.receive`, кладёт события в `m.game.events` (они обработаются следующим тиком как обычно) и запоминает `m.remoteCharge`.

Поведение:
- Шаг симуляции выполняется, только если сети нет или `m.sync.authority`. После шагов авторитет вызывает `m.sync.publish(events, m.input.charge)` с событиями этого кадра (до того как они будут потрачены на эффекты), но только если в этом кадре был хотя бы один шаг.
- Ввод: `canControl: () => !net || m.game.current === net.me`.
- Наблюдатель рисует шкалу заряда соперника: `charge: m.sync && !m.sync.authority ? m.remoteCharge : m.input.charge`.
- Баннер `turnStart` в сетевом режиме: «Твой ход!», если `e.player === net.me`, иначе «Ход: имя».
- Скрытая вкладка: вынести тело кадра в `tick(now, draw)`. rAF вызывает `tick(now, true)`. Дополнительно `setInterval(() => document.hidden && tick(performance.now(), false), 100)`. Ограничение `dt` в `tick`: 0.25 с без сети, 1 с в сети (Chrome в фоне даёт таймерам ~1 раз в секунду). Интервал гасится в `W.stopMatch`.

- [ ] **Step 1: Реализовать** изменения в `js/main.js`.

- [ ] **Step 2: Проверить хотсит в браузере.** Бой ботов как на этапе 1 (базука, граната, смена хода) на одной карте.
Expected: работает как раньше, 0 ошибок в консоли.

- [ ] **Step 3: Проверить роли без настоящей сети** (полная проверка — в Task 5). Через консоль: `W.startMatch({mapId:'polyanka', names:['A','B'], seed: 1, net:{me:1, send(){}}})` при `current === 0` → червяки не двигаются, таймер не идёт, клавиши не действуют; при `me = current` — играется как обычно и `send` вызывается каждый кадр.

- [ ] **Step 4: Проверить скрытую вкладку.** Временно в консоли подменить `Object.defineProperty(document, 'hidden', {get: () => true, configurable: true})` и остановить rAF переключением на другую вкладку; через 5 с вернуться.
Expected: таймер хода ушёл примерно на 5 с вперёд (игра шла в фоне).

- [ ] **Step 5: Тесты и коммит.** `node --test` зелёные. Коммит `feat: сетевой режим игрового цикла и работа в фоне`.

---

### Task 5: Лобби, подключение, реванш, обрыв

**Files:**
- Create: `js/online.js` (сценарий сессии)
- Modify: `js/ui.js` (кнопки меню, экраны лобби/входа/уведомления, результат в сети)
- Modify: `css/style.css` (стили новых экранов в стиле меню)
- Modify: `index.html` (подключить `online.js` после `main.js`; запуск: `W.Online.boot()` вместо `W.showMenu()`)

**Interfaces:**
- Consumes: `W.Net` (Task 3), `W.startMatch({..., seed, net})` и `m.receive` (Task 4).
- Produces:
  - `W.Online.boot()` — если в URL есть `?room=КОД`, показывает экран входа (`UI.showJoin`), иначе `W.showMenu()`.
  - `UI.showMenu(onStart, onHost, onJoinCode)` — кнопки «Создать игру» (вызывает `onHost({mapId, name})`, где `mapId` может быть `'random'`) и «Подключиться» (поле для кода → `onJoinCode(code)`). Надпись «по сети — скоро» убрать. Если `!W.Net.available()`, сетевые кнопки неактивны с подписью «нет связи с сервером».
  - `UI.showLobby(link, onCancel)` — ссылка, кнопка «Скопировать ссылку» (`navigator.clipboard.writeText`, при ошибке — выделить текст), «Ждём соперника…», «Отмена».
  - `UI.showJoin(code, defaultName, onConnect, onMenu)` — поле имени (по умолчанию сохранённое «Игрок 2»), кнопка «В бой!». Клик нужен ещё и для разблокировки звука.
  - `UI.showNotice(text, onMenu)` — карточка с текстом и «В меню».
  - `UI.showResult(..., onAgain, onMenu)` — без изменений сигнатуры; в сети `onAgain` шлёт/обрабатывает реванш.

Сценарий (`js/online.js`):
- Хост: `W.Net.host` → `showLobby(link)`. На `hello`: если `v !== W.NET_VERSION` → `reject version`; иначе `mapId` (случайная — разыгрывается здесь), `seed = Math.floor(Math.random()*1e9)`, `names = [имяХоста, msg.name]`, отправить `start`, `W.startMatch({..., net:{me:0, send}})`.
- Гость: `W.Net.join(code)` → `onOpen` → `hello`. На `start` → `W.startMatch({..., net:{me:1, send}})`. На `reject` → `showNotice('Комната занята' | 'Разные версии игры — обновите страницу')`.
- `state` → `match.receive(msg)`.
- «Ещё раз»: хост сам начинает новый `start` (та же карта, новый сид); гость шлёт `rematch`, хост на `rematch` делает то же самое. Если хост уже начал — `rematch` от гостя после этого игнорируется (матч не в `gameover`).
- `onClose` во время лобби, боя или результата → `W.stopMatch()`, `showNotice('Соперник отключился', W.showMenu)`. Выход в меню самим игроком → `session.close()`.
- После выхода в меню параметр `?room` убрать из адреса (`history.replaceState`), чтобы перезагрузка не подключала снова.

- [ ] **Step 1: Реализовать** `js/online.js`, правки `ui.js`, `style.css`, `index.html`.

- [ ] **Step 2: Полная проверка в двух вкладках** (локальный сервер). Вкладка A: «Создать игру» → ссылка. Вкладка B: открыть ссылку → имя → «В бой!».
Expected:
  - обе вкладки в бою на одной карте, имена верные, у каждого свой червяк, чужой ход нельзя трогать;
  - выстрел базукой у A виден у B вживую (полёт, взрыв, дыра, урон, звук);
  - после передачи хода B играет, A смотрит; хп, позиции и дыры совпадают (сравнить `JSON.stringify(W.snapshot(W.match.game))` в обеих вкладках после успокоения);
  - бой доходит до победы, у обоих экран результата; «Ещё раз» у гостя запускает новый бой у обоих;
  - третья вкладка с той же ссылкой → «Комната занята», бой у A и B продолжается;
  - закрыть вкладку B → у A «Соперник отключился» не позже 8 с;
  - вкладка авторитета переключена на другую на 5 с посреди хода → у второго игра продолжает идти (рывками), не замирает;
  - 0 ошибок в консоли обеих вкладок.

- [ ] **Step 3: Проверить хотсит** — по-прежнему стартует из меню и доходит до результата.

- [ ] **Step 4: Тесты и коммит.** `node --test` зелёные. Коммит `feat: игра по ссылке — лобби, подключение, реванш, обрыв`.

---

### Task 6: Выкладка на GitHub Pages

**Files:**
- Create: `README.md` (как играть: ссылка на игру, управление, как создать комнату)

- [ ] **Step 1:** Влить `multiplayer` в `main` (после финального ревью), `git push`.
- [ ] **Step 2:** Владелец включает Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`. Это настройка его репозитория, делает он сам.
- [ ] **Step 3: Проверить** `https://mnoskovv.github.io/wormsOnline/` в двух вкладках: создать комнату, подключиться по ссылке, сделать по выстрелу.
Expected: всё как в Task 5, 0 ошибок в консоли, PeerJS грузится с unpkg.
- [ ] **Step 4: Коммит README** `docs: как играть по сети` и `git push`.
