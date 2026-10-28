// Игра по ссылке: хост создаёт комнату, гость входит по ?room=КОД.
(function (W) {
  const UI = W.UI;
  let session = null;
  let role = null; // 'host' | 'guest'
  let hostInfo = null; // { mapId, name }
  let guestName = null;

  const pageUrl = () => location.href.split('?')[0].split('#')[0];
  const roomParam = () => new URLSearchParams(location.search).get('room');
  function clearRoomParam() {
    if (roomParam()) history.replaceState(null, '', location.pathname);
  }

  // PeerJS грузится асинхронно — ждём до 5 с.
  function whenNetReady(cb) {
    const t0 = Date.now();
    (function check() {
      if (W.Net.available()) cb();
      else if (Date.now() - t0 > 5000) UI.showNotice('Нет связи с сервером игры', toMenu);
      else setTimeout(check, 100);
    })();
  }

  function leave() {
    if (session) session.close();
    session = null;
    role = null;
    clearRoomParam();
  }

  function toMenu() {
    leave();
    W.showMenu();
  }

  function lost() {
    session = null;
    W.stopMatch();
    UI.showNotice('Соперник отключился', toMenu);
  }

  function failed(text) {
    session = null;
    W.stopMatch();
    UI.showNotice(text, toMenu);
  }

  function play(start, me) {
    UI.hideScreens();
    W.startMatch({ mapId: start.mapId, names: start.names, seed: start.seed, net: { me, send: session.send } });
  }

  function hostStart() {
    const order = UI.MAP_ORDER;
    const mapId = hostInfo.mapId === 'random' ? order[Math.floor(Math.random() * order.length)] : hostInfo.mapId;
    const start = { t: 'start', seed: Math.floor(Math.random() * 1e9), mapId, names: [hostInfo.name, guestName] };
    session.send(start);
    play(start, 0);
  }

  const inGameOver = () => !W.match || !W.match.running || W.match.game.phase === 'gameover';

  function onMessage(msg) {
    switch (msg.t) {
      case 'hello':
        if (role !== 'host' || W.match && W.match.running) return;
        if (msg.v !== W.NET_VERSION) {
          session.reject('version');
          return;
        }
        guestName = String(msg.name || 'Игрок 2').slice(0, 14);
        hostStart();
        break;
      case 'start':
        if (role === 'guest') play(msg, 1);
        break;
      case 'state':
        if (W.match && W.match.running && W.match.receive) W.match.receive(msg);
        break;
      case 'rematch':
        if (role === 'host' && inGameOver()) hostStart();
        break;
      case 'reject':
        failed(msg.reason === 'version' ? 'Разные версии игры — обновите страницу' : 'Комната занята');
        break;
    }
  }

  W.Online = {
    boot() {
      const code = roomParam();
      if (code) W.Online.joinCode(code.toLowerCase());
      else W.showMenu();
    },

    host({ mapId, name }) {
      leave();
      role = 'host';
      hostInfo = { mapId, name };
      UI.showNotice('Создаём комнату…', toMenu, 'Отмена');
      whenNetReady(() => {
        if (role !== 'host') return;
        session = W.Net.host({
          onRoom: code => UI.showLobby(`${pageUrl()}?room=${code}`, toMenu),
          onMessage, onClose: lost, onError: failed,
        });
      });
    },

    joinCode(code) {
      const names = UI.store.get('names', ['Игрок 1', 'Игрок 2']);
      UI.showJoin(code, names[1], (name) => {
        names[1] = name;
        UI.store.set('names', names);
        leave();
        role = 'guest';
        guestName = name;
        UI.showNotice('Подключаемся…', toMenu, 'Отмена');
        whenNetReady(() => {
          if (role !== 'guest') return;
          session = W.Net.join(code, {
            onOpen: () => session.send({ t: 'hello', v: W.NET_VERSION, name }),
            onMessage, onClose: lost, onError: failed,
          });
        });
      }, toMenu);
    },

    // «Ещё раз» на экране результата.
    again() {
      if (!session) return toMenu();
      if (role === 'host') hostStart();
      else {
        session.send({ t: 'rematch' });
        UI.showNotice('Ждём соперника…', null);
      }
    },

    toMenu,
  };
})(window.W = window.W || {});
