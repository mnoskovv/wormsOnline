// Связь двух браузеров через PeerJS (WebRTC). Своего сервера нет: брокер PeerJS только знакомит.
(function (W) {
  W.NET_VERSION = 3;
  const PREFIX = 'chervyachki-';
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  const PING_MS = 1000, SILENCE_MS = 8000, JOIN_TIMEOUT_MS = 15000;

  function randomCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }

  function errorText(err) {
    switch (err && err.type) {
      case 'peer-unavailable': return 'Комната не найдена';
      case 'browser-incompatible': return 'Браузер не поддерживает игру по сети';
      default: return 'Нет связи с сервером игры';
    }
  }

  // Общая часть: одно соединение, пинг, обрыв по тишине.
  function makeSession(h) {
    const s = { peer: null, conn: null, closed: false, opened: false, timers: [] };
    s.send = (msg) => { if (s.conn && s.conn.open) s.conn.send(msg); };
    s.shutdown = () => {
      s.closed = true;
      s.timers.forEach(clearInterval);
      s.timers.forEach(clearTimeout);
      clearInterval(s.ping);
      if (s.peer) setTimeout(() => s.peer.destroy(), 300);
    };
    s.close = () => {
      if (s.closed) return;
      s.send({ t: 'bye' });
      s.shutdown();
    };
    s.lost = () => {
      if (s.closed) return;
      s.shutdown();
      h.onClose && h.onClose();
    };
    s.fail = (text) => {
      if (s.closed) return;
      s.shutdown();
      h.onError && h.onError(text);
    };
    // Хост: забыть гостя и ждать следующего.
    s.drop = () => {
      clearInterval(s.ping);
      s.conn = null;
      s.opened = false;
    };
    s.reject = (reason) => {
      const conn = s.conn;
      s.send({ t: 'reject', reason });
      s.drop();
      if (conn) setTimeout(() => conn.close(), 500);
    };
    // События от уже забытого соединения не считаются.
    s.attach = (conn, isHost) => {
      s.conn = conn;
      let lastSeen = Date.now();
      const broken = () => {
        if (conn !== s.conn) return;
        if (s.opened) s.lost();
        else if (isHost) s.drop();
        else s.fail('Не удалось соединиться напрямую');
      };
      conn.on('open', () => {
        if (conn !== s.conn) return;
        s.opened = true;
        lastSeen = Date.now();
        s.ping = setInterval(() => {
          s.send({ t: 'ping' });
          if (Date.now() - lastSeen > SILENCE_MS) s.lost();
        }, PING_MS);
        h.onOpen && h.onOpen();
      });
      conn.on('data', (msg) => {
        if (s.closed || conn !== s.conn || !msg || typeof msg !== 'object') return;
        lastSeen = Date.now();
        if (msg.t === 'ping') return;
        if (msg.t === 'bye') { s.lost(); return; }
        if (msg.t === 'reject') s.shutdown(); // дальше сообщит onMessage, без «отключился»
        h.onMessage && h.onMessage(msg);
      });
      conn.on('close', broken);
      conn.on('error', broken);
    };
    return s;
  }

  W.Net = {
    available: () => typeof window.Peer === 'function',

    host(h) {
      const s = makeSession(h);
      let tries = 3;
      function start() {
        const code = randomCode();
        const peer = s.peer = new window.Peer(PREFIX + code);
        // После переподключения к своднику 'open' приходит снова — лобби показываем один раз.
        peer.on('open', () => {
          if (s.code) return;
          s.code = code;
          h.onRoom && h.onRoom(code);
        });
        peer.on('connection', (conn) => {
          if (s.closed) return;
          if (s.conn) {
            // Второй гость: вежливо отказать.
            conn.on('open', () => {
              conn.send({ t: 'reject', reason: 'busy' });
              setTimeout(() => conn.close(), 500);
            });
            return;
          }
          s.attach(conn, true);
        });
        peer.on('error', (err) => {
          if (s.closed || peer !== s.peer) return;
          if (err.type === 'unavailable-id') {
            // Код занят при создании — берём другой. После создания комнаты пира не трогаем: в нём живой бой.
            if (!s.code && --tries > 0) { peer.destroy(); start(); }
            else if (!s.code) s.fail(errorText(err));
            return;
          }
          if (!s.opened) s.fail(errorText(err));
        });
        // Сводник отвалился: открытое соединение живёт само, переподключаемся для новых гостей.
        peer.on('disconnected', () => { if (!s.closed && peer === s.peer && !peer.destroyed) peer.reconnect(); });
      }
      start();
      return s;
    },

    join(code, h) {
      const s = makeSession(h);
      s.code = code;
      s.peer = new window.Peer();
      s.peer.on('open', () => {
        if (s.closed) return;
        s.attach(s.peer.connect(PREFIX + code, { serialization: 'json', reliable: true }));
      });
      s.peer.on('error', (err) => { if (!s.opened) s.fail(errorText(err)); });
      s.timers.push(setTimeout(() => { if (!s.opened) s.fail('Не удалось соединиться напрямую'); }, JOIN_TIMEOUT_MS));
      return s;
    },
  };
})(window.W = window.W || {});
