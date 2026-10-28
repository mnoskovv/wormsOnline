// Связь двух браузеров через PeerJS (WebRTC). Своего сервера нет: брокер PeerJS только знакомит.
(function (W) {
  W.NET_VERSION = 1;
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
    s.attach = (conn) => {
      s.conn = conn;
      let lastSeen = Date.now();
      conn.on('open', () => {
        s.opened = true;
        lastSeen = Date.now();
        s.timers.push(setInterval(() => {
          s.send({ t: 'ping' });
          if (Date.now() - lastSeen > SILENCE_MS) s.lost();
        }, PING_MS));
        h.onOpen && h.onOpen();
      });
      conn.on('data', (msg) => {
        if (s.closed || !msg || typeof msg !== 'object') return;
        lastSeen = Date.now();
        if (msg.t === 'ping') return;
        if (msg.t === 'bye') { s.lost(); return; }
        if (msg.t === 'reject') s.shutdown(); // дальше сообщит onMessage, без «отключился»
        h.onMessage && h.onMessage(msg);
      });
      conn.on('close', () => (s.opened ? s.lost() : s.fail('Не удалось соединиться напрямую')));
      conn.on('error', () => (s.opened ? s.lost() : s.fail('Не удалось соединиться напрямую')));
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
        peer.on('open', () => { s.code = code; h.onRoom && h.onRoom(code); });
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
          s.attach(conn);
        });
        peer.on('error', (err) => {
          if (s.closed || peer !== s.peer) return;
          if (err.type === 'unavailable-id' && --tries > 0) { peer.destroy(); start(); return; }
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
