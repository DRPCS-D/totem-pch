/* Totem PCH - pantalla publicitaria (kiosco). Sin dependencias.
   Lee su contenido del backend (Apps Script / Google Sheets) y lo guarda en caché local:
   si se cae internet sigue mostrando lo último que descargó. */
(function () {
  'use strict';
  var API = window.TOTEM_API || '';
  var CACHE_KEY = 'totem-pch:contenido';
  var REV_INTERVALO = 3600000;   // consulta de cambios: cada hora
  var REV_MIN_VISIBLE = 600000;  // al volver a la pantalla, no consultar si fue hace menos de 10 min
  var ultimaRev = Date.now();

  var $ = function (s) { return document.querySelector(s); };
  var stage = $('#stage');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var DEF = {
    config: { nombre: 'Totem', logoText: '', logoUrl: '', primary: '#008fca', accent: '#d91571', showClock: true, ctaText: 'TOCA PARA JUGAR', tickerEnabled: false, tickerText: '', idleSeconds: 45, showLogo: true, videoSound: true, videoVolume: 100, raffleEnabled: false, raffleTitle: '', raffleSubtitle: '', askName: true, askPhone: true, loseMessage: '' },
    anuncios: [], premios: [], rev: ''
  };
  var data = DEF, pendiente = null;

  function leerCache() { try { var c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c && c.config) return c; } catch (e) {} return null; }
  function guardarCache(d) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- API ---------- */
  function api(action, payload, ms) {
    if (!API) return Promise.reject(new Error('Falta configurar la dirección del servidor.'));
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, ms || 25000);
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, payload || {})), signal: ctl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || j.ok !== true) { var e = new Error((j && j.error) || 'Error del servidor.'); e.servidor = true; throw e; } return j; })
      .catch(function (e) { if (e.servidor) throw e; var n = new Error('Sin conexión con el servidor.'); n.red = true; throw n; })
      .finally(function () { clearTimeout(t); });
  }

  function setOffline(v) { $('#offline').style.display = v ? 'block' : 'none'; }

  function descargar() {
    return api('totemConfig').then(function (j) {
      var d = { config: j.config, anuncios: j.anuncios, premios: j.premios, rev: j.rev };
      guardarCache(d); setOffline(false); aplicarContenido(d);
    }).catch(function () { setOffline(true); });
  }
  function revisar() {
    ultimaRev = Date.now();
    api('totemRev').then(function (j) { setOffline(false); if (j.rev !== data.rev) descargar(); }).catch(function () { setOffline(true); });
  }

  /* ---------- Escala ---------- */
  function fit() { var s = Math.min(innerWidth / 1080, innerHeight / 1920); stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')'; }
  addEventListener('resize', fit); fit();

  /* ---------- Contenido ---------- */
  function aplicarContenido(d) {
    // No se cambia nada a mitad de una jugada: se aplica al cerrar el juego.
    if (game.on) { pendiente = d; return; }
    data = d; pendiente = null;
    var g = d.config;
    document.documentElement.style.setProperty('--primary', g.primary);
    document.documentElement.style.setProperty('--accent', g.accent);
    var verLogo = g.showLogo !== false;
    $('#logo').innerHTML = verLogo ? (g.logoUrl ? '<img src="' + esc(g.logoUrl) + '" alt="">' : esc(g.logoText)) : '';
    $('#clock').style.display = g.showClock ? '' : 'none';
    stage.classList.toggle('sin-cabecera', !verLogo && !g.showClock);
    stage.classList.toggle('sin-cinta', !g.tickerEnabled);
    $('#tickerText').textContent = g.tickerText;
    $('#cta').setAttribute('aria-label', g.ctaText);
    $('#cta').style.display = g.raffleEnabled && d.premios.length >= 2 ? '' : 'none';
    document.title = g.nombre;
    nextAd(true);
    precargarVideos();
  }
  setInterval(function () { $('#clock').textContent = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }); }, 1000);

  /* ---------- Anuncios ---------- */
  var idx = -1, adTimer, galeria = [];
  function activos() {
    var d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return data.anuncios.filter(function (a) { return a.activo !== false && (!a.desde || a.desde <= t) && (!a.hasta || a.hasta >= t); });
  }
  /* Enlaces de Google Drive (compartir > «Cualquier persona con el enlace») -> id del archivo */
  function driveId(u) {
    var m = /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/.exec(String(u || ''));
    return m ? m[1] : null;
  }
  /* Videos de Drive: el servidor los entrega (Apps Script), se guardan en caché del navegador
     y se reproducen desde ahí: arrancan solos, avisan cuándo terminan y funcionan sin internet. */
  var VCACHE = 'totem-pch-videos', vurls = {}, vbajando = {};
  var vkey = function (id) { return '/__video/' + id; };
  function videoURL(id) {
    if (vurls[id]) return Promise.resolve(vurls[id]);
    if (vbajando[id]) return vbajando[id];
    var p = (window.caches ? caches.open(VCACHE).then(function (c) { return c.match(vkey(id)); }).catch(function () { return null; }) : Promise.resolve(null))
      .then(function (r) { return r ? r.blob() : null; })
      .then(function (blob) {
        if (blob) return blob;
        return api('totemVideo', { id: id }, 240000).then(function (j) {
          var bin = atob(j.base64), u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          var b = new Blob([u8], { type: j.mime || 'video/mp4' });
          if (window.caches) caches.open(VCACHE).then(function (c) { return c.put(vkey(id), new Response(b, { headers: { 'Content-Type': b.type } })); }).catch(function () {});
          return b;
        });
      })
      .then(function (blob) { vurls[id] = URL.createObjectURL(blob); return vurls[id]; });
    vbajando[id] = p;
    p.then(function () { delete vbajando[id]; }, function () { delete vbajando[id]; });
    return p;
  }
  /* Baja en segundo plano los videos de los anuncios (uno por uno) y borra del caché los que ya no se usan. */
  function precargarVideos() {
    var ids = data.anuncios.filter(function (a) { return a.tipo === 'video' && a.activo !== false; }).map(function (a) { return driveId(a.src); }).filter(Boolean);
    if (window.caches) caches.open(VCACHE).then(function (c) {
      return c.keys().then(function (ks) { ks.forEach(function (k) { var id = k.url.split('/__video/')[1]; if (id && ids.indexOf(id) < 0) c.delete(k); }); });
    }).catch(function () {});
    ids.reduce(function (p, id) { return p.then(function () { return videoURL(id).catch(function () {}); }); }, Promise.resolve());
  }
  /* Sonido: se intenta con audio; si el navegador lo bloquea (aún nadie tocó la pantalla) arranca en silencio
     y se activa con el primer toque. Después de ese toque, los videos siguientes ya suenan solos. */
  function arrancar(v) {
    var c = data.config, vol = c.videoVolume == null ? 100 : Math.min(100, Math.max(0, Number(c.videoVolume) || 0));
    var quiere = c.videoSound !== false && vol > 0;
    v.volume = vol / 100; v.muted = !quiere;
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      if (!quiere) return;
      v.muted = true; v.setAttribute('data-sonido', '1');
      var q = v.play(); if (q && q.catch) q.catch(function () {});
    });
  }
  addEventListener('pointerdown', function () {
    document.querySelectorAll('video[data-sonido]').forEach(function (v) { v.muted = false; v.removeAttribute('data-sonido'); });
  }, true);
  function reproductorDrive(el, did, a) {
    // Último recurso (p. ej. el video pesa demasiado): reproductor incrustado de Drive; dura lo configurado.
    if (!el.classList.contains('in')) return;
    el.innerHTML = '<iframe src="https://drive.google.com/file/d/' + did + '/preview" allow="autoplay"></iframe>';
    clearTimeout(adTimer); adTimer = setTimeout(function () { nextAd(); }, (a.duracion > 0 ? a.duracion : 60) * 1000);
  }
  function buildSlide(a) {
    var el = document.createElement('div'); el.className = 'slide';
    if (a.tipo === 'imagen') {
      var urls = String(a.src || '').split('\n').map(function (u) { return u.trim(); }).filter(Boolean);
      el.innerHTML = urls.map(function (u, i) { return '<div class="ph' + (i === 0 ? ' on' : '') + '"><div class="bgi" style="background-image:url(&quot;' + esc(u) + '&quot;)"></div><img src="' + esc(u) + '" alt=""></div>'; }).join('') + (a.titulo ? '<div class="cap">' + esc(a.titulo) + '</div>' : '');
      el.dataset.n = urls.length;
      if (!urls.length) setTimeout(function () { nextAd(); }, 0);
      else el.querySelector('img').onerror = function () { if (urls.length === 1) nextAd(); };
    } else if (a.tipo === 'video') {
      var did = driveId(a.src);
      el.innerHTML = '<video playsinline' + (did ? '' : ' src="' + esc(a.src) + '"') + '></video>';
      var v = el.querySelector('video'); v.onended = function () { nextAd(); };
      v.onerror = function () { if (did) reproductorDrive(el, did, a); else nextAd(); };
      if (did) videoURL(did).then(function (u) { v.src = u; arrancar(v); }).catch(function () { reproductorDrive(el, did, a); });
      else arrancar(v);
    } else {
      el.style.background = 'linear-gradient(160deg,' + a.color + ',#000 140%)';
      el.innerHTML = '<h1>' + esc(a.titulo) + '</h1>' + (a.subtitulo ? '<h2>' + esc(a.subtitulo) + '</h2>' : '') + (a.precio ? '<div class="price">' + esc(a.precio) + '</div>' : '');
    }
    return el;
  }
  function nextAd(restart) {
    clearTimeout(adTimer); galeria.forEach(clearTimeout); galeria = [];
    var list = activos(), box = $('#ads');
    if (!list.length) { box.innerHTML = '<div class="empty">' + esc(data.config.nombre) + '</div>'; adTimer = setTimeout(function () { nextAd(); }, 10000); return; }
    if (restart) idx = -1;
    idx = (idx + 1) % list.length;
    var a = list[idx], old = box.querySelectorAll('.slide,.empty'), el = buildSlide(a);
    box.appendChild(el); void el.offsetWidth; el.classList.add('in');
    old.forEach(function (o) { o.classList.remove('in'); setTimeout(function () { o.remove(); }, 900); });
    var seg = Math.max(2, a.duracion || 8), n = a.tipo === 'imagen' ? Math.max(1, Number(el.dataset.n) || 1) : 1;
    if (n > 1) {
      var fotos = el.querySelectorAll('.ph');
      for (var k = 1; k < n; k++) (function (k) { galeria.push(setTimeout(function () { fotos.forEach(function (f, j) { f.classList.toggle('on', j === k); }); }, k * seg * 1000)); })(k);
    }
    if (a.tipo === 'video' && (!(a.duracion > 0) || driveId(a.src))) adTimer = setTimeout(function () { nextAd(); }, 180000);
    else adTimer = setTimeout(function () { nextAd(); }, seg * n * 1000);
  }

  /* ---------- Juego ---------- */
  var game = { on: false, idleT: null, data: { name: '', phone: '' }, focus: null, rot: 0, spinning: false };
  function resetIdle() {
    clearTimeout(game.idleT);
    if (game.on && !game.spinning) game.idleT = setTimeout(closeGame, data.config.idleSeconds * 1000);
  }
  addEventListener('pointerdown', resetIdle);
  function openGame() { game.on = true; game.data = { name: '', phone: '' }; $('#game').classList.add('on'); renderForm(); resetIdle(); }
  function closeGame() {
    game.on = false; game.spinning = false; clearTimeout(game.idleT);
    $('#game').classList.remove('on'); $('#result').classList.remove('on'); hideKb();
    if (pendiente) aplicarContenido(pendiente);
  }
  $('#cta').onclick = openGame; $('#closeGame').onclick = closeGame; $('#result').onclick = closeGame;

  /* Acceso al panel: 5 toques en la esquina superior izquierda (zona invisible, donde va el logo) */
  var taps = 0, tapT;
  $('#acceso').addEventListener('pointerdown', function () { taps++; clearTimeout(tapT); tapT = setTimeout(function () { taps = 0; }, 2000); if (taps >= 5) location.href = '/'; });

  function renderForm(msg) {
    var c = data.config, body = $('#gameBody');
    body.innerHTML = '<h1>' + esc(c.raffleTitle) + '</h1><div class="sub">' + esc(c.raffleSubtitle) + '</div>' +
      (c.askName ? '<div class="field"><label>Nombre</label><div class="inp" data-f="name"></div></div>' : '') +
      (c.askPhone ? '<div class="field"><label>Teléfono</label><div class="inp" data-f="phone"></div></div>' : '') +
      '<div class="err" id="err">' + esc(msg || '') + '</div><button class="btn" id="go">CONTINUAR</button>';
    body.querySelectorAll('.inp').forEach(function (i) { i.onclick = function () { focusField(i.dataset.f); }; });
    $('#go').onclick = submitForm;
    if (c.askName) focusField('name'); else if (c.askPhone) focusField('phone');
    paintFields();
    if (!c.askName && !c.askPhone) renderWheel();
  }
  function paintFields() {
    document.querySelectorAll('.inp').forEach(function (i) { i.textContent = game.data[i.dataset.f]; i.classList.toggle('focus', game.focus === i.dataset.f); });
  }
  /* Acceso oculto: 5 toques en la esquina superior derecha fuerzan la actualización del contenido */
  var tapsF = 0, tapFT;
  $('#forzar').addEventListener('pointerdown', function () {
    tapsF++; clearTimeout(tapFT); tapFT = setTimeout(function () { tapsF = 0; }, 2000);
    if (tapsF < 5) return;
    tapsF = 0; aviso('Actualizando…');
    api('totemConfig').then(function (j) {
      var d = { config: j.config, anuncios: j.anuncios, premios: j.premios, rev: j.rev };
      guardarCache(d); setOffline(false); aplicarContenido(d); ultimaRev = Date.now(); aviso('Contenido actualizado ✓');
    }).catch(function () { setOffline(true); aviso('No se pudo actualizar'); });
  });
  function aviso(t) { var e = $('#aviso'); e.textContent = t; e.style.display = 'block'; clearTimeout(aviso.t); aviso.t = setTimeout(function () { e.style.display = 'none'; }, 2500); }

  function err(m) { var e = $('#err'); if (e) e.textContent = m; }
  function submitForm() {
    var c = data.config, d = game.data;
    if (c.askName && d.name.trim().length < 2) return err('Ingresá tu nombre');
    if (c.askPhone && d.phone.replace(/\D/g, '').length < 7) return err('Ingresá un teléfono válido');
    hideKb(); renderWheel();
  }

  var ROWS = { alpha: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'], num: ['123', '456', '789', '0'] };
  function focusField(f) { game.focus = f; paintFields(); showKb(f === 'phone' ? 'num' : 'alpha'); }
  function showKb(mode) {
    var kb = $('#kb'); kb.className = 'on';
    kb.innerHTML = ROWS[mode].map(function (r) { return '<div class="row">' + r.split('').map(function (c) { return '<button class="k" data-k="' + c + '">' + c + '</button>'; }).join('') + '</div>'; }).join('') +
      '<div class="row">' + (mode === 'alpha' ? '<button class="k w" data-k=" ">espacio</button>' : '') + '<button class="k" data-k="⌫">⌫</button><button class="k ok" data-k="ok">OK</button></div>';
    kb.onclick = function (e) {
      var k = e.target.dataset && e.target.dataset.k; if (k == null) return;
      var v = game.data[game.focus === 'phone' ? 'phone' : 'name'];
      if (k === '⌫') v = v.slice(0, -1);
      else if (k === 'ok') { if (game.focus === 'name' && data.config.askPhone) return focusField('phone'); return hideKb(); }
      else if (v.length < 30) v += (game.focus === 'name' && (!v || v.slice(-1) === ' ') ? k.toUpperCase() : k);
      game.data[game.focus === 'phone' ? 'phone' : 'name'] = v; paintFields();
    };
  }
  function hideKb() { $('#kb').className = ''; game.focus = null; paintFields(); }

  /* ---------- Ruleta ---------- */
  function renderWheel() {
    var n = (game.data.name || '').split(' ')[0];
    $('#gameBody').innerHTML = '<h1>' + esc(data.config.raffleTitle) + '</h1><div class="sub">¡Mucha suerte' + (n ? ', ' + esc(n) : '') + '!</div>' +
      '<div id="wheelWrap"><div id="pointer"></div><canvas id="wheel" width="880" height="880"></canvas><div id="hub">GIRAR</div></div>' +
      '<div class="err" id="err"></div><button class="btn" id="spin">¡GIRAR!</button>';
    game.rot = 0; drawWheel(); $('#spin').onclick = $('#hub').onclick = spin;
  }
  function wrap(t, max) { var w = t.split(' '), out = [], l = ''; w.forEach(function (s) { if ((l + ' ' + s).trim().length > max) { out.push(l); l = s; } else l = (l + ' ' + s).trim(); }); if (l) out.push(l); return out; }
  function textoSobre(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#0a021c' : '#fff';
  }
  function drawWheel() {
    var c = $('#wheel'), x = c.getContext('2d'), P = data.premios, n = P.length, seg = 2 * Math.PI / n, R = 440;
    x.clearRect(0, 0, 880, 880);
    P.forEach(function (p, i) {
      var a0 = -Math.PI / 2 + i * seg;
      x.beginPath(); x.moveTo(R, R); x.arc(R, R, R, a0, a0 + seg); x.closePath();
      x.fillStyle = p.color; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke();
      x.save(); x.translate(R, R); x.rotate(a0 + seg / 2); x.textAlign = 'right'; var tc = textoSobre(p.color); x.fillStyle = tc;
      x.font = '600 40px Poppins, Rubik, sans-serif'; x.shadowColor = tc === '#fff' ? '#0006' : 'transparent'; x.shadowBlur = 5;
      var ls = wrap(p.etiqueta, 12);
      ls.forEach(function (l, j) { x.fillText(l, R - 44, 14 + (j - (ls.length - 1) / 2) * 46); });
      x.restore();
    });
  }
  /* Al pulsar GIRAR la ruleta empieza a girar de inmediato (acelera) mientras el servidor decide el resultado
     (puede tardar 1-3 s); cuando llega, frena suavemente hasta el premio. */
  function spin() {
    if (game.spinning) return;
    game.spinning = true; clearTimeout(game.idleT);
    $('#spin').disabled = true; err('');
    var w = $('#wheel'), ang = game.rot % 360, vel = 0, t0 = null, esperando = true, raf = 0;
    w.style.transition = 'none';
    function tick(t) {
      if (!esperando) return;
      var dt = t0 === null ? 16 : Math.min(50, t - t0); t0 = t;
      vel = Math.min(1.1, vel + dt * 0.003);          // grados por ms; llega a ~3 vueltas/s en 0,4 s
      ang += vel * dt; w.style.transform = 'rotate(' + ang + 'deg)';
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    api('girar', { nombre: game.data.name, telefono: game.data.phone }).then(function (r) {
      esperando = false; cancelAnimationFrame(raf);
      var i = data.premios.findIndex(function (p) { return p.id === r.premioId; });
      if (i < 0) i = 0;
      var seg = 360 / data.premios.length, center = (i + .5) * seg, jitter = (Math.random() - .5) * seg * .7;
      var objetivo = ((360 - center + jitter) % 360 + 360) % 360;
      var final = ang - (ang % 360) + objetivo + 360 * 4;
      while (final < ang + 360 * 3) final += 360;
      w.style.transform = 'rotate(' + ang + 'deg)'; void w.offsetWidth;   // parte desde donde va, sin salto
      w.style.transition = 'transform 5s cubic-bezier(.12,.7,.1,1)';
      w.style.transform = 'rotate(' + final + 'deg)';
      game.rot = final;
      setTimeout(function () { finish(r); }, 5300);
    }).catch(function (e) {
      esperando = false; cancelAnimationFrame(raf);
      game.spinning = false; resetIdle();
      renderForm(e.message);
    });
  }
  function finish(r) {
    game.spinning = false;
    var win = r.gano;
    $('#result .card').innerHTML = '<div class="emoji">' + (win ? '🎉' : '🙂') + '</div><h2>' + (win ? '¡Ganaste!' : esc(data.config.loseMessage)) + '</h2><p>' +
      (win ? esc(r.etiqueta) + '<br><br>Presentá tu nombre en caja para retirarlo.' : 'Seguí participando en tu próxima visita.') + '</p>';
    $('#result').classList.add('on'); if (win) confetti();
    clearTimeout(game.idleT); game.idleT = setTimeout(closeGame, 9000);
  }
  function confetti() {
    var cols = ['#d91571', '#008fca', '#f5a43b', '#0a021c', '#ffffff'];
    for (var k = 0; k < 90; k++) {
      var d = document.createElement('div'); d.className = 'conf';
      d.style.cssText = 'left:' + Math.random() * 100 + '%;background:' + cols[k % 5] + ';animation-duration:' + (2 + Math.random() * 2.5) + 's;animation-delay:' + Math.random() + 's';
      stage.appendChild(d); (function (e) { setTimeout(function () { e.remove(); }, 6000); })(d);
    }
  }

  /* ---------- Pantalla completa y que no se apague ---------- */
  var wl = null;
  function mantenerEncendida() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () {}); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { mantenerEncendida(); if (Date.now() - ultimaRev > REV_MIN_VISIBLE) revisar(); } });
  addEventListener('pointerdown', function () {
    var enMarco = window.top !== window.self;
    if (!enMarco && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  }, { once: true });
  mantenerEncendida();
  // Al cargar las tipografías de Google, la ruleta se vuelve a dibujar con ellas.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if ($('#wheel')) drawWheel(); });

  /* ---------- Service worker (modo sin conexión) ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/totem/sw.js', { scope: '/totem/' }).catch(function () {});

  /* ---------- Inicio ---------- */
  var c0 = leerCache();
  if (c0) aplicarContenido(c0); else aplicarContenido(DEF);
  descargar();
  setInterval(revisar, REV_INTERVALO);
})();
