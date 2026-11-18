/**
 * Totem PCH - Backend (Google Apps Script sobre Google Sheets)
 *
 * Guarda anuncios, configuración, premios de la ruleta y participantes del totem,
 * y administra los usuarios del panel.
 *
 * Despliegue:
 *   1. Crea una hoja de cálculo vacía (o un proyecto en script.google.com).
 *   2. Extensiones > Apps Script > pega este archivo y appsscript.json.
 *   3. Ejecuta la función `instalar` una vez (acepta permisos).
 *   4. Implementar > Aplicación web > Ejecutar como: Yo | Acceso: Cualquier usuario.
 *   5. Copia la URL /exec en VITE_APPS_SCRIPT_URL (Vercel).
 *
 * Pestañas (fila 1 = encabezados):
 *   Config:        clave | valor
 *   Anuncios:      id | tipo | titulo | subtitulo | precio | color | src | duracion | activo | desde | hasta | orden | nombre
 *   Ruletas:       id | nombre | activa   (plantillas de premios; solo una activa)
 *   Premios:       id | etiqueta | color | peso | stock | gana | activo | ruletaId
 *   Participantes: id | fecha | nombre | telefono | premio | gano | entregado | ruleta
 *   Usuarios:      usuario | password | rol | activo | nombre
 *
 * Roles: admin (todo) | editor (anuncios, ruleta, participantes, apariencia).
 *
 * Acciones PÚBLICAS (las usa el totem, sin login): totemConfig, totemRev, girar.
 * El sorteo se decide aquí (servidor), nunca en el navegador del totem.
 */

var SHEET_CONFIG = 'Config';
var SHEET_ANUNCIOS = 'Anuncios';
var SHEET_PREMIOS = 'Premios';
var SHEET_PARTICIPANTES = 'Participantes';
var SHEET_USUARIOS = 'Usuarios';
var SHEET_RULETAS = 'Ruletas';

var COL_ANU = { id: 0, tipo: 1, titulo: 2, subtitulo: 3, precio: 4, color: 5, src: 6, duracion: 7, activo: 8, desde: 9, hasta: 10, orden: 11, nombre: 12 };
var COL_PRE = { id: 0, etiqueta: 1, color: 2, peso: 3, stock: 4, gana: 5, activo: 6, ruletaId: 7, sonido: 8 };
var COL_RUL = { id: 0, nombre: 1, activa: 2, fondo: 3, sonidoFondo: 4, sonidoGana: 5, sonidoPierde: 6, elegible: 7 };
var COL_PAR = { id: 0, fecha: 1, nombre: 2, telefono: 3, premio: 4, gano: 5, entregado: 6, ruleta: 7 };
var COL_USR = { usuario: 0, password: 1, rol: 2, activo: 3, nombre: 4 };

var TIPOS_ANUNCIO = ['texto', 'imagen', 'video'];
var REVS = ['config', 'anuncios', 'premios', 'ruletas', 'participantes', 'usuarios'];

var CONFIG_DEFECTO = {
  nombre: 'Patachoca',
  logoText: 'PATACHOCA',
  logoUrl: 'https://www.patachoca.com.py/assets/patachoca/images/logo.png',
  primary: '#008fca',
  accent: '#d91571',
  showLogo: true,
  showClock: true,
  ctaText: 'TOCA PARA JUGAR Y GANAR',
  tickerEnabled: true,
  tickerText: '¡Bienvenido! · Participá del sorteo y ganá premios increíbles',
  idleSeconds: 45,
  videoSound: true,
  videoVolume: 100,
  gameSound: true,
  gameVolume: 80,
  ruletaSelector: false,
  datosOpcionales: false,
  raffleEnabled: true,
  raffleTitle: '¡GIRÁ LA RULETA!',
  raffleSubtitle: 'Completá tus datos y probá tu suerte',
  maxSpins: 1,
  askName: true,
  askPhone: true,
  loseMessage: '¡Gracias por participar!'
};

function doGet() {
  return jsonOut_({ ok: true, service: 'totem-pch' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Solicitud inválida' });
  }

  try {
    switch (body.action) {
      // Públicas (totem)
      case 'totemConfig':       return handleTotemConfig_();
      case 'totemRev':          return handleTotemRev_();
      case 'girar':             return handleGirar_(body);
      case 'totemVideo':        return handleTotemVideo_(body);
      case 'totemAudio':        return handleTotemAudio_(body);
      // Panel
      case 'login':             return handleLogin_(body);
      case 'getRevisions':      return handleGetRevisions_(body);
      case 'getConfig':         return handleGetConfig_(body);
      case 'saveConfig':        return handleSaveConfig_(body);
      case 'listAnuncios':      return handleListAnuncios_(body);
      case 'createAnuncio':     return handleSaveAnuncio_(body, true);
      case 'updateAnuncio':     return handleSaveAnuncio_(body, false);
      case 'deleteAnuncio':     return handleDeleteAnuncio_(body);
      case 'reordenarAnuncios': return handleReordenarAnuncios_(body);
      case 'subirImagen':       return handleSubirImagen_(body);
      case 'listRuletas':       return handleListRuletas_(body);
      case 'createRuleta':      return handleCreateRuleta_(body);
      case 'updateRuleta':      return handleUpdateRuleta_(body);
      case 'deleteRuleta':      return handleDeleteRuleta_(body);
      case 'activarRuleta':     return handleActivarRuleta_(body);
      case 'ajustesRuleta':     return handleAjustesRuleta_(body);
      case 'elegibleRuleta':    return handleElegibleRuleta_(body);
      case 'subirSonido':       return handleSubirSonido_(body);
      case 'listPremios':       return handleListPremios_(body);
      case 'createPremio':      return handleSavePremio_(body, true);
      case 'updatePremio':      return handleSavePremio_(body, false);
      case 'deletePremio':      return handleDeletePremio_(body);
      case 'listParticipantes': return handleListParticipantes_(body);
      case 'marcarEntregado':   return handleMarcarEntregado_(body);
      case 'clearParticipantes': return handleClearParticipantes_(body);
      case 'listUsuarios':      return handleListUsuarios_(body);
      case 'createUsuario':     return handleCreateUsuario_(body);
      case 'updateUsuario':     return handleUpdateUsuario_(body);
      case 'deleteUsuario':     return handleDeleteUsuario_(body);
      case 'cambiarMiPassword': return handleCambiarMiPassword_(body);
      default:                  return jsonOut_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message || ('Error del servidor: ' + err), codigo: err.codigo || '' });
  }
}

// ---------- Autenticación ----------

function handleLogin_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) return jsonOut_({ ok: false, error: 'Usuario o contraseña incorrectos' });
  return jsonOut_({ ok: true, usuario: user.usuario, nombre: user.nombre, rol: user.rol });
}

function requireAuth_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) {
    var e = new Error('Sesión no válida. Vuelve a iniciar sesión.');
    e.codigo = 'SESION';
    throw e;
  }
  return user;
}

function requireAdmin_(body) {
  var user = requireAuth_(body);
  if (user.rol !== 'admin') throw new Error('No autorizado para esta acción.');
  return user;
}

var CACHE_AUTH_SEG = 300;
var CLAVE_VERSION_AUTH = 'auth_version';

function claveAuth_(nombre, pass) {
  var huella = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, nombre.toUpperCase() + '\n' + pass, Utilities.Charset.UTF_8);
  return 'auth_' + Utilities.base64Encode(huella);
}

function invalidarAuth_() {
  try { CacheService.getScriptCache().put(CLAVE_VERSION_AUTH, Utilities.getUuid(), 21600); } catch (e) {}
}

function findUser_(usuario, password) {
  var nombre = String(usuario || '').trim();
  var pass = String(password || '');
  if (!nombre || !pass) return null;

  var cache = null, clave = '', version = '';
  try {
    cache = CacheService.getScriptCache();
    clave = claveAuth_(nombre, pass);
    var guardado = cache.getAll([clave, CLAVE_VERSION_AUTH]);
    version = guardado[CLAVE_VERSION_AUTH] || '';
    if (!version) {
      version = Utilities.getUuid();
      cache.put(CLAVE_VERSION_AUTH, version, 21600);
    } else if (guardado[clave]) {
      var c = JSON.parse(guardado[clave]);
      if (c.v === version) return c.u;
    }
  } catch (e) {
    cache = null;
  }

  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var rowUsuario = String(rows[i][COL_USR.usuario]).trim();
    if (rowUsuario.toUpperCase() === nombre.toUpperCase() && String(rows[i][COL_USR.password]) === pass && esActivo_(rows[i][COL_USR.activo])) {
      var encontrado = {
        usuario: rowUsuario,
        rol: normalizarRol_(rows[i][COL_USR.rol]),
        activo: true,
        nombre: String(rows[i][COL_USR.nombre] || '').trim()
      };
      if (cache) { try { cache.put(clave, JSON.stringify({ v: version, u: encontrado }), CACHE_AUTH_SEG); } catch (e) {} }
      return encontrado;
    }
  }
  return null;
}

// ---------- Revisiones (sincronización) ----------

var REVISIONES_PENDIENTES_ = [];
var PROPS_RECIENTES_ = null;

function bumpRevision_(key) {
  if (REVISIONES_PENDIENTES_.indexOf(key) === -1) REVISIONES_PENDIENTES_.push(key);
}

function aplicarRevisiones_() {
  var claves = REVISIONES_PENDIENTES_;
  REVISIONES_PENDIENTES_ = [];
  if (!claves.length) return;
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var nuevas = {};
  claves.forEach(function (k) { nuevas['rev_' + k] = String((Number(todas['rev_' + k]) || 0) + 1); });
  props.setProperties(nuevas);
  Object.keys(nuevas).forEach(function (k) { todas[k] = nuevas[k]; });
  PROPS_RECIENTES_ = todas;
  if (claves.indexOf('usuarios') !== -1) invalidarAuth_();
}

function liberar_(lock) {
  try { aplicarRevisiones_(); } finally { lock.releaseLock(); }
}

/** Ejecuta fn dentro del lock del script; sube las revisiones pendientes al terminar. */
function conLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { liberar_(lock); }
}

function handleGetRevisions_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, revisiones: revisionesActuales_() });
}

function revisionesActuales_() {
  var props = PROPS_RECIENTES_ || PropertiesService.getScriptProperties().getProperties();
  var r = {};
  REVS.forEach(function (k) { r[k] = Number(props['rev_' + k]) || 0; });
  return r;
}

// ---------- Totem (público) ----------

/** Revisión combinada de lo que muestra el totem; el totem la consulta cada minuto. */
function handleTotemRev_() {
  var r = revisionesActuales_();
  return jsonOut_({ ok: true, rev: r.config + '.' + r.anuncios + '.' + r.premios });
}

function handleTotemConfig_() {
  var r = revisionesActuales_();
  var anuncios = leerAnuncios_().filter(function (a) { return a.activo; });
  var activa = ruletaActiva_();
  var premios = leerPremios_(activa.id).filter(function (p) { return p.activo; }).map(function (p) {
    return { id: p.id, etiqueta: p.etiqueta, color: p.color, gana: p.gana, sonido: p.sonido };
  });
  var cfg = leerConfig_();
  var salida = {
    ok: true,
    rev: r.config + '.' + r.anuncios + '.' + r.premios,
    config: cfg,
    anuncios: anuncios,
    premios: premios,
    ruleta: { nombre: activa.nombre, fondo: activa.fondo, sonidoFondo: activa.sonidoFondo, sonidoGana: activa.sonidoGana, sonidoPierde: activa.sonidoPierde },
    ruletas: []
  };
  // Con el selector activado, el totem deja elegir entre las ruletas marcadas como disponibles (más la activa).
  if (cfg.ruletaSelector) {
    var todas = leerPremios_();
    ruletasElegibles_().forEach(function (x) {
      salida.ruletas.push({
        id: x.id, nombre: x.nombre, fondo: x.fondo, sonidoFondo: x.sonidoFondo, sonidoGana: x.sonidoGana, sonidoPierde: x.sonidoPierde,
        premios: todas.filter(function (p) { return p.ruletaId === x.id && p.activo; }).map(function (p) {
          return { id: p.id, etiqueta: p.etiqueta, color: p.color, gana: p.gana, sonido: p.sonido };
        })
      });
    });
  }
  return jsonOut_(salida);
}

/** Ruletas que el totem ofrece cuando el selector está activo: la activa y las marcadas «disponible», con al menos 2 premios. */
function ruletasElegibles_() {
  return leerRuletas_().filter(function (x) { return (x.activa || x.elegible) && x.premios >= 2; });
}

var MAX_VIDEO_BYTES = 20 * 1024 * 1024;

function driveIdDe_(u) {
  var m = /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/.exec(String(u || ''));
  return m ? m[1] : null;
}

/**
 * Entrega al totem un video de Drive (base64). Solo sirve archivos que estén en un anuncio de video activo,
 * para que nadie pueda pedir cualquier archivo de Drive conociendo su ID. Corre como el dueño del script,
 * así que el archivo no necesita estar compartido públicamente (sí accesible por la cuenta que publica el script).
 */
function handleTotemVideo_(body) {
  var id = String(body.id || '');
  if (!/^[\w-]{10,}$/.test(id)) throw new Error('Video inválido.');
  var permitido = leerAnuncios_().some(function (a) { return a.tipo === 'video' && a.activo && driveIdDe_(a.src) === id; });
  if (!permitido) throw new Error('Ese video no pertenece a un anuncio activo.');
  var archivo = DriveApp.getFileById(id);
  if (archivo.getSize() > MAX_VIDEO_BYTES) throw new Error('El video pesa más de 20 MB.');
  var blob = archivo.getBlob();
  return jsonOut_({ ok: true, mime: blob.getContentType() || 'video/mp4', base64: Utilities.base64Encode(blob.getBytes()) });
}

function handleGirar_(body) {
  var cfg = leerConfig_();
  if (!cfg.raffleEnabled) throw new Error('El sorteo no está habilitado.');
  var nombre = String(body.nombre || '').trim().slice(0, 60);
  var telefono = String(body.telefono || '').trim().slice(0, 30);
  var digitos = telefono.replace(/\D/g, '');
  // Con «datos opcionales» se puede jugar sin nombre ni teléfono (si se escribe algo, igual debe ser válido).
  var opcional = cfg.datosOpcionales;
  if (cfg.askName && nombre.length < 2 && !(opcional && !nombre)) throw new Error('Ingresá tu nombre.');
  if (cfg.askPhone && digitos.length < 7 && !(opcional && !digitos)) throw new Error('Ingresá un teléfono válido.');

  return conLock_(function () {
    var sheetP = getSheet_(SHEET_PARTICIPANTES);
    if (cfg.askPhone && cfg.maxSpins > 0 && digitos) {
      var filas = sheetP.getDataRange().getValues();
      var usados = 0;
      for (var i = 1; i < filas.length; i++) {
        if (String(filas[i][COL_PAR.telefono]).replace(/\D/g, '') === digitos) usados++;
      }
      if (usados >= cfg.maxSpins) throw new Error('Este número ya participó. ¡Gracias!');
    }

    var activa = ruletaActiva_();
    var pedida = String(body.ruletaId || '').trim();
    if (pedida && cfg.ruletaSelector) {
      var elegida = ruletasElegibles_().filter(function (x) { return x.id === pedida; })[0];
      if (!elegida) throw new Error('Esa ruleta ya no está disponible.');
      activa = elegida;
    }
    var sheetPr = getSheet_(SHEET_PREMIOS);
    var rows = sheetPr.getDataRange().getValues();
    var todos = [];
    for (var j = 1; j < rows.length; j++) {
      var p = rowToPremio_(rows[j]);
      if (p.id && p.activo && p.ruletaId === activa.id) { p.fila = j + 1; todos.push(p); }
    }
    if (todos.length < 2) throw new Error('El sorteo no está configurado.');

    var pool = todos.filter(function (p) { return p.stock !== 0 && p.peso > 0; });
    if (!pool.length) pool = todos.filter(function (p) { return !p.gana; });
    if (!pool.length) pool = todos;
    var total = pool.reduce(function (s, p) { return s + Math.max(p.peso, 0.0001); }, 0);
    var t = Math.random() * total, elegido = pool[pool.length - 1];
    for (var k = 0; k < pool.length; k++) {
      t -= Math.max(pool[k].peso, 0.0001);
      if (t <= 0) { elegido = pool[k]; break; }
    }

    if (elegido.stock > 0) {
      sheetPr.getRange(elegido.fila, COL_PRE.stock + 1).setValue(elegido.stock - 1);
      bumpRevision_('premios');
    }
    sheetP.appendRow([Utilities.getUuid().slice(0, 8), new Date().toISOString(), nombre, telefono, elegido.etiqueta, elegido.gana, false, activa.nombre]);
    bumpRevision_('participantes');
    return jsonOut_({ ok: true, premioId: elegido.id, etiqueta: elegido.etiqueta, gano: elegido.gana });
  });
}

// ---------- Configuración ----------

function leerConfig_() {
  var cfg = JSON.parse(JSON.stringify(CONFIG_DEFECTO));
  var rows = getSheet_(SHEET_CONFIG).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var k = String(rows[i][0]).trim();
    if (!(k in CONFIG_DEFECTO)) continue;
    var def = CONFIG_DEFECTO[k], v = rows[i][1];
    if (typeof def === 'boolean') cfg[k] = esActivo_(v);
    else if (typeof def === 'number') cfg[k] = isNaN(Number(v)) ? def : Number(v);
    else cfg[k] = String(v == null ? '' : v);
  }
  return cfg;
}

function handleGetConfig_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, config: [leerConfig_()] });
}

function handleSaveConfig_(body) {
  requireAuth_(body);
  var nuevo = body.config || {};
  conLock_(function () {
    var sheet = getSheet_(SHEET_CONFIG);
    var rows = sheet.getDataRange().getValues();
    var fila = {};
    for (var i = 1; i < rows.length; i++) fila[String(rows[i][0]).trim()] = i + 1;
    Object.keys(CONFIG_DEFECTO).forEach(function (k) {
      if (!(k in nuevo)) return;
      var def = CONFIG_DEFECTO[k], v = nuevo[k];
      if (typeof def === 'boolean') v = v === true;
      else if (typeof def === 'number') v = Math.max(0, Number(v) || 0);
      else v = String(v == null ? '' : v).slice(0, 500);
      if (fila[k]) sheet.getRange(fila[k], 2).setValue(v);
      else sheet.appendRow([k, v]);
    });
    bumpRevision_('config');
  });
  return jsonOut_({ ok: true });
}

// ---------- Anuncios ----------

function rowToAnuncio_(row) {
  var tipo = String(row[COL_ANU.tipo]).trim();
  return {
    id: String(row[COL_ANU.id]).trim(),
    tipo: TIPOS_ANUNCIO.indexOf(tipo) === -1 ? 'texto' : tipo,
    titulo: String(row[COL_ANU.titulo] || ''),
    subtitulo: String(row[COL_ANU.subtitulo] || ''),
    precio: String(row[COL_ANU.precio] || ''),
    color: String(row[COL_ANU.color] || '#1d4ed8'),
    src: String(row[COL_ANU.src] || ''),
    duracion: Number(row[COL_ANU.duracion]) || 0,
    activo: esActivo_(row[COL_ANU.activo]),
    desde: fechaTexto_(row[COL_ANU.desde]),
    hasta: fechaTexto_(row[COL_ANU.hasta]),
    orden: Number(row[COL_ANU.orden]) || 0,
    nombre: String(row[COL_ANU.nombre] || '')
  };
}

function leerAnuncios_() {
  var rows = getSheet_(SHEET_ANUNCIOS).getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_ANU.id]).trim()) lista.push(rowToAnuncio_(rows[i]));
  }
  lista.sort(function (a, b) { return a.orden - b.orden; });
  return lista;
}

function handleListAnuncios_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, anuncios: leerAnuncios_() });
}

function handleSaveAnuncio_(body, crear) {
  requireAuth_(body);
  var tipo = String(body.tipo || 'texto');
  if (TIPOS_ANUNCIO.indexOf(tipo) === -1) throw new Error('Tipo de anuncio inválido.');
  var src = String(body.src || '').trim();
  if (tipo !== 'texto' && !src) throw new Error(tipo === 'imagen' ? 'Falta la imagen.' : 'Falta la URL del video.');
  if (tipo === 'texto' && !String(body.titulo || '').trim()) throw new Error('El título es obligatorio.');
  var desde = String(body.desde || ''), hasta = String(body.hasta || '');
  if ((desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) || (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta))) throw new Error('Fecha inválida.');
  if (desde && hasta && hasta < desde) throw new Error('"Hasta" no puede ser anterior a "Desde".');

  return conLock_(function () {
    var sheet = getSheet_(SHEET_ANUNCIOS);
    // Hojas creadas antes de existir la columna «nombre»: se agrega el encabezado sin tener que reinstalar.
    if (!String(sheet.getRange(1, COL_ANU.nombre + 1).getValue()).trim()) sheet.getRange(1, COL_ANU.nombre + 1).setValue('nombre').setFontWeight('bold').setBackground('#e8eaf6');
    var datos = function (id, orden) {
      return [id, tipo, String(body.titulo || '').slice(0, 120), String(body.subtitulo || '').slice(0, 200),
        String(body.precio || '').slice(0, 40), String(body.color || '#1d4ed8').slice(0, 9), src,
        Math.max(0, Number(body.duracion) || 0), body.activo !== false, desde, hasta, orden, String(body.nombre || '').trim().slice(0, 80)];
    };
    if (crear) {
      var rows = sheet.getDataRange().getValues(), max = 0;
      for (var i = 1; i < rows.length; i++) max = Math.max(max, Number(rows[i][COL_ANU.orden]) || 0);
      sheet.appendRow(datos(Utilities.getUuid().slice(0, 8), max + 1));
    } else {
      var f = filaPorId_(sheet, COL_ANU.id, body.id);
      if (!f) throw new Error('El anuncio ya no existe.');
      sheet.getRange(f.indice, 1, 1, 13).setValues([datos(f.valores[COL_ANU.id], f.valores[COL_ANU.orden])]);
    }
    bumpRevision_('anuncios');
    return jsonOut_({ ok: true });
  });
}

function handleDeleteAnuncio_(body) {
  requireAuth_(body);
  return conLock_(function () {
    var sheet = getSheet_(SHEET_ANUNCIOS);
    var f = filaPorId_(sheet, COL_ANU.id, body.id);
    if (!f) throw new Error('El anuncio ya no existe.');
    borrarFila_(sheet, f.indice);
    bumpRevision_('anuncios');
    return jsonOut_({ ok: true });
  });
}

function handleReordenarAnuncios_(body) {
  requireAuth_(body);
  var ids = Array.isArray(body.ids) ? body.ids : [];
  return conLock_(function () {
    var sheet = getSheet_(SHEET_ANUNCIOS);
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var pos = ids.indexOf(String(rows[i][COL_ANU.id]).trim());
      if (pos !== -1) sheet.getRange(i + 1, COL_ANU.orden + 1).setValue(pos + 1);
    }
    bumpRevision_('anuncios');
    return jsonOut_({ ok: true });
  });
}

/** Guarda una imagen (base64) en Drive, carpeta "Totem PCH", y devuelve una URL pública. */
function handleSubirImagen_(body) {
  requireAuth_(body);
  var mime = String(body.mime || '');
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) throw new Error('Formato de imagen no permitido.');
  var datos = String(body.base64 || '');
  if (!datos || datos.length > 12 * 1024 * 1024) throw new Error('Imagen vacía o demasiado grande.');
  var carpetas = DriveApp.getFoldersByName('Totem PCH');
  var carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder('Totem PCH');
  var blob = Utilities.newBlob(Utilities.base64Decode(datos), mime, 'anuncio-' + Date.now());
  var archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return jsonOut_({ ok: true, url: 'https://lh3.googleusercontent.com/d/' + archivo.getId() });
}

// ---------- Premios ----------

function rowToPremio_(row) {
  var stock = row[COL_PRE.stock];
  return {
    id: String(row[COL_PRE.id]).trim(),
    etiqueta: String(row[COL_PRE.etiqueta] || ''),
    color: String(row[COL_PRE.color] || '#3b82f6'),
    peso: Number(row[COL_PRE.peso]) || 0,
    stock: stock === '' || isNaN(Number(stock)) ? -1 : Number(stock),
    gana: esActivo_(row[COL_PRE.gana]),
    activo: esActivo_(row[COL_PRE.activo]),
    ruletaId: String(row[COL_PRE.ruletaId] || '').trim(),
    sonido: String(row[COL_PRE.sonido] || '').trim()
  };
}

/** Premios de una ruleta (o de todas si no se indica). */
function leerPremios_(ruletaId) {
  asegurarRuletas_();
  var rows = getSheet_(SHEET_PREMIOS).getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_PRE.id]).trim()) continue;
    var p = rowToPremio_(rows[i]);
    if (!ruletaId || p.ruletaId === ruletaId) lista.push(p);
  }
  return lista;
}

function handleListPremios_(body) {
  requireAuth_(body);
  var id = String(body.ruletaId || '').trim() || ruletaActiva_().id;
  return jsonOut_({ ok: true, premios: leerPremios_(id) });
}

function handleSavePremio_(body, crear) {
  requireAuth_(body);
  var etiqueta = String(body.etiqueta || '').trim().slice(0, 40);
  if (!etiqueta) throw new Error('El nombre del premio es obligatorio.');
  var peso = Number(body.peso);
  if (isNaN(peso) || peso < 0) throw new Error('El peso debe ser 0 o mayor.');
  var stock = Number(body.stock);
  if (isNaN(stock) || stock < -1) throw new Error('El stock debe ser -1 (ilimitado) o mayor.');
  var ruletaId = String(body.ruletaId || '').trim();
  var sonido = validarSonido_(body.sonido);
  if (crear && !ruletaPorId_(leerRuletas_(), ruletaId)) throw new Error('La ruleta no existe.');
  return conLock_(function () {
    var sheet = getSheet_(SHEET_PREMIOS);
    var datos = function (id, rid) {
      return [id, etiqueta, String(body.color || '#3b82f6').slice(0, 9), peso, stock, body.gana !== false, body.activo !== false, rid, sonido];
    };
    if (crear) sheet.appendRow(datos(Utilities.getUuid().slice(0, 8), ruletaId));
    else {
      var f = filaPorId_(sheet, COL_PRE.id, body.id);
      if (!f) throw new Error('El premio ya no existe.');
      sheet.getRange(f.indice, 1, 1, 9).setValues([datos(f.valores[COL_PRE.id], String(f.valores[COL_PRE.ruletaId] || '').trim())]);
    }
    bumpRevision_('premios');
    return jsonOut_({ ok: true });
  });
}

function handleDeletePremio_(body) {
  requireAuth_(body);
  return conLock_(function () {
    var sheet = getSheet_(SHEET_PREMIOS);
    var f = filaPorId_(sheet, COL_PRE.id, body.id);
    if (!f) throw new Error('El premio ya no existe.');
    // Solo la ruleta activa (la que ve el totem) debe conservar al menos 2 premios activos.
    var rid = String(f.valores[COL_PRE.ruletaId] || '').trim();
    var activos = leerPremios_(rid).filter(function (p) { return p.activo; }).length;
    if (rid === ruletaActiva_().id && activos <= 2 && esActivo_(f.valores[COL_PRE.activo])) throw new Error('La ruleta activa necesita al menos 2 premios activos.');
    borrarFila_(sheet, f.indice);
    bumpRevision_('premios');
    return jsonOut_({ ok: true });
  });
}

// ---------- Ruletas (plantillas de premios) ----------
// Cada ruleta es un conjunto de premios con nombre. Solo una está activa: es la que muestra el totem.
// Hojas anteriores a las ruletas se migran solas: los premios existentes pasan a «Ruleta principal».

var RULETAS_OK_ = false;

function encabezadoSiFalta_(sheet, col, nombre) {
  if (!String(sheet.getRange(1, col).getValue()).trim()) {
    sheet.getRange(1, col).setValue(nombre).setFontWeight('bold').setBackground('#e8eaf6');
  }
}

function asegurarRuletas_() {
  if (RULETAS_OK_) return;
  var ss = getSpreadsheet_(false);
  var hoja = ss.getSheetByName(SHEET_RULETAS);
  if (!hoja) {
    hoja = ss.insertSheet(SHEET_RULETAS);
    hoja.getRange(1, 1, 1, ENCABEZADOS.Ruletas.length).setValues([ENCABEZADOS.Ruletas]).setFontWeight('bold').setBackground('#e8eaf6');
    hoja.setFrozenRows(1);
    hoja.getRange(2, COL_RUL.activa + 1, 100, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  var pre = getSheet_(SHEET_PREMIOS);
  encabezadoSiFalta_(pre, COL_PRE.ruletaId + 1, 'ruletaId');
  encabezadoSiFalta_(pre, COL_PRE.sonido + 1, 'sonido');
  ['fondo', 'sonidoFondo', 'sonidoGana', 'sonidoPierde', 'elegible'].forEach(function (k) { encabezadoSiFalta_(hoja, COL_RUL[k] + 1, k); });
  encabezadoSiFalta_(getSheet_(SHEET_PARTICIPANTES), COL_PAR.ruleta + 1, 'ruleta');

  var rows = hoja.getDataRange().getValues(), activaId = '', primeraId = '', primeraFila = 0;
  for (var i = 1; i < rows.length; i++) {
    var id = String(rows[i][COL_RUL.id]).trim();
    if (!id) continue;
    if (!primeraId) { primeraId = id; primeraFila = i + 1; }
    if (!activaId && esActivo_(rows[i][COL_RUL.activa])) activaId = id;
  }
  if (!primeraId) {
    primeraId = Utilities.getUuid().slice(0, 8);
    hoja.appendRow([primeraId, 'Ruleta principal', true]);
    activaId = primeraId;
  } else if (!activaId) {
    hoja.getRange(primeraFila, COL_RUL.activa + 1).setValue(true);
    activaId = primeraId;
  }

  // Premios sin ruleta (hoja anterior a las ruletas, o cargados a mano) pasan a la ruleta activa.
  var n = pre.getLastRow() - 1;
  if (n > 0) {
    var rng = pre.getRange(2, 1, n, COL_PRE.ruletaId + 1), vals = rng.getValues(), cambio = false;
    vals.forEach(function (f) {
      if (String(f[COL_PRE.id]).trim() && !String(f[COL_PRE.ruletaId]).trim()) { f[COL_PRE.ruletaId] = activaId; cambio = true; }
    });
    if (cambio) rng.setValues(vals);
  }
  RULETAS_OK_ = true;
}

/** [{ id, nombre, activa, premios (cantidad de premios activos) }] */
function leerRuletas_() {
  asegurarRuletas_();
  var rows = getSheet_(SHEET_RULETAS).getDataRange().getValues();
  var premios = leerPremios_();
  var lista = [];
  for (var i = 1; i < rows.length; i++) {
    var id = String(rows[i][COL_RUL.id]).trim();
    if (!id) continue;
    lista.push({
      id: id,
      nombre: String(rows[i][COL_RUL.nombre] || ''),
      activa: esActivo_(rows[i][COL_RUL.activa]),
      fondo: String(rows[i][COL_RUL.fondo] || '').trim(),
      sonidoFondo: String(rows[i][COL_RUL.sonidoFondo] || '').trim(),
      sonidoGana: String(rows[i][COL_RUL.sonidoGana] || '').trim(),
      sonidoPierde: String(rows[i][COL_RUL.sonidoPierde] || '').trim(),
      elegible: esActivo_(rows[i][COL_RUL.elegible]),
      premios: premios.filter(function (p) { return p.ruletaId === id && p.activo; }).length
    });
  }
  return lista;
}

function ruletaActiva_() {
  var lista = leerRuletas_();
  for (var i = 0; i < lista.length; i++) if (lista[i].activa) return lista[i];
  return lista[0];
}

function ruletaPorId_(lista, id) {
  for (var i = 0; i < lista.length; i++) if (lista[i].id === String(id || '').trim()) return lista[i];
  return null;
}

function nombreRuletaValido_(body, lista, excluirId) {
  var nombre = String(body.nombre || '').trim().slice(0, 40);
  if (!nombre) throw new Error('El nombre de la ruleta es obligatorio.');
  lista.forEach(function (r) {
    if (r.id !== excluirId && r.nombre.toLowerCase() === nombre.toLowerCase()) throw new Error('Ya existe una ruleta con ese nombre.');
  });
  return nombre;
}

function handleListRuletas_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, ruletas: leerRuletas_() });
}

function handleCreateRuleta_(body) {
  requireAuth_(body);
  var lista = leerRuletas_();
  var nombre = nombreRuletaValido_(body, lista, '');
  var copiarDe = String(body.copiarDe || '').trim();
  if (copiarDe && !ruletaPorId_(lista, copiarDe)) throw new Error('La ruleta a copiar ya no existe.');
  return conLock_(function () {
    var id = Utilities.getUuid().slice(0, 8);
    var origenR = copiarDe ? ruletaPorId_(lista, copiarDe) : null;
    getSheet_(SHEET_RULETAS).appendRow([id, nombre, false, origenR ? origenR.fondo : '', origenR ? origenR.sonidoFondo : '', origenR ? origenR.sonidoGana : '', origenR ? origenR.sonidoPierde : '']);
    if (copiarDe) {
      var filas = leerPremios_(copiarDe).map(function (p) {
        return [Utilities.getUuid().slice(0, 8), p.etiqueta, p.color, p.peso, p.stock, p.gana, p.activo, id, p.sonido];
      });
      if (filas.length) {
        var pre = getSheet_(SHEET_PREMIOS);
        pre.getRange(pre.getLastRow() + 1, 1, filas.length, 9).setValues(filas);
        bumpRevision_('premios');
      }
    }
    bumpRevision_('ruletas');
    return jsonOut_({ ok: true, id: id });
  });
}

function handleUpdateRuleta_(body) {
  requireAuth_(body);
  var lista = leerRuletas_();
  var r = ruletaPorId_(lista, body.id);
  if (!r) throw new Error('La ruleta ya no existe.');
  var nombre = nombreRuletaValido_(body, lista, r.id);
  return conLock_(function () {
    var hoja = getSheet_(SHEET_RULETAS);
    var f = filaPorId_(hoja, COL_RUL.id, r.id);
    hoja.getRange(f.indice, COL_RUL.nombre + 1).setValue(nombre);
    bumpRevision_('ruletas');
    return jsonOut_({ ok: true });
  });
}

function handleDeleteRuleta_(body) {
  requireAuth_(body);
  var lista = leerRuletas_();
  var r = ruletaPorId_(lista, body.id);
  if (!r) throw new Error('La ruleta ya no existe.');
  if (r.activa) throw new Error('No puedes borrar la ruleta activa. Activa otra primero.');
  return conLock_(function () {
    var pre = getSheet_(SHEET_PREMIOS);
    var rows = pre.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][COL_PRE.ruletaId]).trim() === r.id) borrarFila_(pre, i + 1);
    }
    var hoja = getSheet_(SHEET_RULETAS);
    var f = filaPorId_(hoja, COL_RUL.id, r.id);
    if (f) borrarFila_(hoja, f.indice);
    bumpRevision_('ruletas');
    bumpRevision_('premios');
    return jsonOut_({ ok: true });
  });
}

/** Deja activa solo la ruleta indicada (la que muestra el totem). */
function handleActivarRuleta_(body) {
  requireAuth_(body);
  var lista = leerRuletas_();
  var r = ruletaPorId_(lista, body.id);
  if (!r) throw new Error('La ruleta ya no existe.');
  if (r.premios < 2) throw new Error('La ruleta necesita al menos 2 premios activos para poder usarse.');
  return conLock_(function () {
    var hoja = getSheet_(SHEET_RULETAS);
    var rows = hoja.getDataRange().getValues();
    if (rows.length > 1) {
      hoja.getRange(2, COL_RUL.activa + 1, rows.length - 1, 1).setValues(
        rows.slice(1).map(function (f) { return [String(f[COL_RUL.id]).trim() === r.id]; })
      );
    }
    bumpRevision_('ruletas');
    bumpRevision_('premios');   // el totem detecta el cambio de ruleta con esta revisión
    return jsonOut_({ ok: true });
  });
}

/** Marca o desmarca una ruleta como disponible para elegir en el totem. */
function handleElegibleRuleta_(body) {
  requireAuth_(body);
  var r = ruletaPorId_(leerRuletas_(), body.id);
  if (!r) throw new Error('La ruleta ya no existe.');
  return conLock_(function () {
    var hoja = getSheet_(SHEET_RULETAS);
    var f = filaPorId_(hoja, COL_RUL.id, r.id);
    hoja.getRange(f.indice, COL_RUL.elegible + 1).setValue(!!body.elegible);
    bumpRevision_('ruletas');
    bumpRevision_('premios');
    return jsonOut_({ ok: true });
  });
}

// ---------- Sonidos e imagen de fondo de cada ruleta ----------
// Los sonidos se guardan como "https://drive.google.com/file/d/ID/view|nombre.mp3" (url + nombre original).
// Se suben a Drive (carpeta «Totem PCH») y el totem los pide a este script (totemAudio), que solo entrega
// archivos referenciados por una ruleta o un premio.

var MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function validarSonido_(valor) {
  var v = String(valor || '').trim();
  if (!v) return '';
  if (v.length > 400) throw new Error('Sonido inválido.');
  if (!driveIdDe_(v.split('|')[0])) throw new Error('Sonido inválido.');
  return v;
}

function handleAjustesRuleta_(body) {
  requireAuth_(body);
  var r = ruletaPorId_(leerRuletas_(), body.id);
  if (!r) throw new Error('La ruleta ya no existe.');
  var fondo = String(body.fondo || '').trim();
  if (fondo && !/^https:\/\//.test(fondo)) throw new Error('Imagen de fondo inválida.');
  if (fondo.length > 500) throw new Error('Imagen de fondo inválida.');
  var valores = [fondo, validarSonido_(body.sonidoFondo), validarSonido_(body.sonidoGana), validarSonido_(body.sonidoPierde)];
  return conLock_(function () {
    var hoja = getSheet_(SHEET_RULETAS);
    var f = filaPorId_(hoja, COL_RUL.id, r.id);
    hoja.getRange(f.indice, COL_RUL.fondo + 1, 1, 4).setValues([valores]);
    bumpRevision_('ruletas');
    bumpRevision_('premios');   // el totem detecta el cambio con esta revisión
    return jsonOut_({ ok: true });
  });
}

/** Guarda un audio (base64) en Drive y devuelve su enlace. */
function handleSubirSonido_(body) {
  requireAuth_(body);
  var mime = String(body.mime || '').toLowerCase();
  if (!/^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|ogg|wav|x-wav|wave|webm)$/.test(mime)) throw new Error('Formato de audio no permitido (usa MP3, WAV, OGG o M4A).');
  var datos = String(body.base64 || '');
  if (!datos || datos.length > MAX_AUDIO_BYTES * 1.4) throw new Error('El audio está vacío o pesa más de 8 MB.');
  var bytes = Utilities.base64Decode(datos);
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('El audio pesa más de 8 MB.');
  var carpetas = DriveApp.getFoldersByName('Totem PCH');
  var carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder('Totem PCH');
  var archivo = carpeta.createFile(Utilities.newBlob(bytes, mime, 'sonido-' + Date.now()));
  return jsonOut_({ ok: true, url: 'https://drive.google.com/file/d/' + archivo.getId() + '/view' });
}

function idsSonidoPermitidos_() {
  var ids = {};
  var agregar = function (v) { var i = driveIdDe_(String(v || '').split('|')[0]); if (i) ids[i] = 1; };
  leerRuletas_().forEach(function (r) { agregar(r.sonidoFondo); agregar(r.sonidoGana); agregar(r.sonidoPierde); });
  leerPremios_().forEach(function (p) { agregar(p.sonido); });
  return ids;
}

/** Entrega al totem (y a la vista previa del panel) un audio de Drive en base64. Público, pero solo de archivos en uso. */
function handleTotemAudio_(body) {
  var id = String(body.id || '');
  if (!/^[\w-]{10,}$/.test(id)) throw new Error('Sonido inválido.');
  if (!idsSonidoPermitidos_()[id]) throw new Error('Ese sonido no está en uso.');
  var archivo = DriveApp.getFileById(id);
  if (archivo.getSize() > MAX_AUDIO_BYTES) throw new Error('El audio pesa más de 8 MB.');
  var blob = archivo.getBlob();
  return jsonOut_({ ok: true, mime: blob.getContentType() || 'audio/mpeg', base64: Utilities.base64Encode(blob.getBytes()) });
}

// ---------- Participantes ----------

function handleListParticipantes_(body) {
  requireAuth_(body);
  var rows = getSheet_(SHEET_PARTICIPANTES).getDataRange().getValues();
  var lista = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    if (!String(r[COL_PAR.id]).trim()) continue;
    lista.push({
      id: String(r[COL_PAR.id]).trim(),
      fecha: r[COL_PAR.fecha] instanceof Date ? r[COL_PAR.fecha].toISOString() : String(r[COL_PAR.fecha]),
      nombre: String(r[COL_PAR.nombre] || ''),
      telefono: String(r[COL_PAR.telefono] || ''),
      premio: String(r[COL_PAR.premio] || ''),
      gano: esActivo_(r[COL_PAR.gano]),
      entregado: esActivo_(r[COL_PAR.entregado]),
      ruleta: String(r[COL_PAR.ruleta] || '')
    });
  }
  return jsonOut_({ ok: true, participantes: lista });
}

function handleMarcarEntregado_(body) {
  requireAuth_(body);
  return conLock_(function () {
    var sheet = getSheet_(SHEET_PARTICIPANTES);
    var f = filaPorId_(sheet, COL_PAR.id, body.id);
    if (!f) throw new Error('El registro ya no existe.');
    sheet.getRange(f.indice, COL_PAR.entregado + 1).setValue(body.entregado === true);
    bumpRevision_('participantes');
    return jsonOut_({ ok: true });
  });
}

function handleClearParticipantes_(body) {
  requireAdmin_(body);
  return conLock_(function () {
    var sheet = getSheet_(SHEET_PARTICIPANTES);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).clearContent();
    bumpRevision_('participantes');
    return jsonOut_({ ok: true });
  });
}

// ---------- Usuarios del panel ----------

function handleListUsuarios_(body) {
  requireAdmin_(body);
  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  var usuarios = [];
  for (var i = 1; i < rows.length; i++) {
    var nombre = String(rows[i][COL_USR.usuario]).trim();
    if (!nombre) continue;
    usuarios.push({
      usuario: nombre,
      rol: normalizarRol_(rows[i][COL_USR.rol]),
      nombre: String(rows[i][COL_USR.nombre] || '').trim(),
      activo: esActivo_(rows[i][COL_USR.activo])
    });
  }
  return jsonOut_({ ok: true, usuarios: usuarios });
}

function handleCreateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var password = String(body.nuevaPassword || '');
  if (!nombre) throw new Error('El nombre de usuario es obligatorio.');
  if (!password) throw new Error('La contraseña inicial es obligatoria.');
  var sheet = getSheet_(SHEET_USUARIOS);
  if (usuarioPorNombre_(sheet, nombre)) throw new Error('Ya existe un usuario con ese nombre.');
  return conLock_(function () {
    sheet.appendRow([nombre, password, normalizarRol_(body.rol), body.activo !== false, String(body.nombre || '').trim().slice(0, 80)]);
    bumpRevision_('usuarios');
    return jsonOut_({ ok: true });
  });
}

function handleUpdateUsuario_(body) {
  requireAdmin_(body);
  var objetivo = String(body.targetUsuario || '').trim();
  if (!objetivo) throw new Error('Falta el usuario a editar.');
  var rol = normalizarRol_(body.rol), activo = body.activo !== false;
  var nuevoNombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var sheet = getSheet_(SHEET_USUARIOS);
  var f = usuarioPorNombre_(sheet, objetivo);
  if (!f) throw new Error('El usuario ya no existe.');
  var eraAdmin = normalizarRol_(f.valores[COL_USR.rol]) === 'admin' && esActivo_(f.valores[COL_USR.activo]);
  if (eraAdmin && !(rol === 'admin' && activo) && contarAdminsActivos_(sheet) <= 1) throw new Error('No puedes quitar el último administrador activo.');
  var seRenombra = !!nuevoNombre && nuevoNombre !== objetivo.toUpperCase();
  if (seRenombra && usuarioPorNombre_(sheet, nuevoNombre)) throw new Error('Ya existe un usuario con ese nombre.');
  return conLock_(function () {
    if (seRenombra) sheet.getRange(f.indice, COL_USR.usuario + 1).setValue(nuevoNombre);
    sheet.getRange(f.indice, COL_USR.rol + 1).setValue(rol);
    sheet.getRange(f.indice, COL_USR.activo + 1).setValue(activo);
    sheet.getRange(f.indice, COL_USR.nombre + 1).setValue(String(body.nombre || '').trim().slice(0, 80));
    if (body.nuevaPassword) sheet.getRange(f.indice, COL_USR.password + 1).setValue(String(body.nuevaPassword));
    bumpRevision_('usuarios');
    return jsonOut_({ ok: true, usuario: seRenombra ? nuevoNombre : objetivo.toUpperCase() });
  });
}

function handleDeleteUsuario_(body) {
  var actual = requireAdmin_(body);
  var nombre = String(body.targetUsuario || '').trim();
  if (nombre.toUpperCase() === actual.usuario.toUpperCase()) throw new Error('No puedes borrarte a ti mismo.');
  var sheet = getSheet_(SHEET_USUARIOS);
  var f = usuarioPorNombre_(sheet, nombre);
  if (!f) throw new Error('El usuario ya no existe.');
  if (normalizarRol_(f.valores[COL_USR.rol]) === 'admin' && esActivo_(f.valores[COL_USR.activo]) && contarAdminsActivos_(sheet) <= 1) {
    throw new Error('No puedes borrar el último administrador activo.');
  }
  return conLock_(function () {
    borrarFila_(sheet, f.indice);
    bumpRevision_('usuarios');
    return jsonOut_({ ok: true });
  });
}

function handleCambiarMiPassword_(body) {
  var user = requireAuth_(body);
  var nueva = String(body.nuevaPassword || '');
  if (!nueva) throw new Error('La nueva contraseña es obligatoria.');
  var sheet = getSheet_(SHEET_USUARIOS);
  var f = usuarioPorNombre_(sheet, user.usuario);
  if (!f) throw new Error('El usuario ya no existe.');
  return conLock_(function () {
    sheet.getRange(f.indice, COL_USR.password + 1).setValue(nueva);
    invalidarAuth_();
    return jsonOut_({ ok: true });
  });
}

// ---------- Instalación ----------

var ENCABEZADOS = {
  Config: ['clave', 'valor'],
  Anuncios: ['id', 'tipo', 'titulo', 'subtitulo', 'precio', 'color', 'src', 'duracion', 'activo', 'desde', 'hasta', 'orden', 'nombre'],
  Ruletas: ['id', 'nombre', 'activa', 'fondo', 'sonidoFondo', 'sonidoGana', 'sonidoPierde', 'elegible'],
  Premios: ['id', 'etiqueta', 'color', 'peso', 'stock', 'gana', 'activo', 'ruletaId', 'sonido'],
  Participantes: ['id', 'fecha', 'nombre', 'telefono', 'premio', 'gano', 'entregado', 'ruleta'],
  Usuarios: ['usuario', 'password', 'rol', 'activo', 'nombre']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Totem PCH').addItem('Instalar / reparar hoja', 'instalar').addToUi();
}

/** Crea pestañas, encabezados, datos de ejemplo y un admin inicial. Es idempotente. */
function instalar() {
  var ss = getSpreadsheet_(true);
  var creadas = [];
  Object.keys(ENCABEZADOS).forEach(function (nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      var primera = ss.getSheets()[0];
      var vacia = ss.getSheets().length === 1 && primera.getLastRow() === 0 && primera.getName() !== nombre;
      sheet = vacia ? primera.setName(nombre) : ss.insertSheet(nombre);
      creadas.push(nombre);
    }
    var cols = ENCABEZADOS[nombre];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8eaf6');
    sheet.setFrozenRows(1);
  });

  // Fechas y teléfonos como texto, para que Sheets no los convierta.
  ss.getSheetByName(SHEET_ANUNCIOS).getRange(2, COL_ANU.desde + 1, 1000, 2).setNumberFormat('@');
  ss.getSheetByName(SHEET_PARTICIPANTES).getRange(2, COL_PAR.telefono + 1, 5000, 1).setNumberFormat('@');
  var casilla = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  ss.getSheetByName(SHEET_ANUNCIOS).getRange(2, COL_ANU.activo + 1, 1000, 1).setDataValidation(casilla);
  ss.getSheetByName(SHEET_PREMIOS).getRange(2, COL_PRE.gana + 1, 200, 2).setDataValidation(casilla);
  ss.getSheetByName(SHEET_USUARIOS).getRange(2, COL_USR.activo + 1, 200, 1).setDataValidation(casilla);

  var mensaje = creadas.length ? 'Pestañas creadas: ' + creadas.join(', ') + '. ' : 'Las pestañas ya existían. ';

  var anu = ss.getSheetByName(SHEET_ANUNCIOS);
  if (anu.getLastRow() < 2) {
    var ej = [['a1', 'texto', 'CYBER DAY', 'Hasta 14% de descuento en toda la tienda', '', '#008fca', '', 8, true, '', '', 1, 'Cyber Day'],
              ['a2', 'texto', 'Combo Familiar', 'Llevá 2 y pagá 1 solo hoy', '45.000 Gs.', '#d91571', '', 8, true, '', '', 2, 'Combo familiar']];
    anu.getRange(2, 1, ej.length, 13).setValues(ej);
    mensaje += 'Anuncios de ejemplo creados. ';
  }
  var pre = ss.getSheetByName(SHEET_PREMIOS);
  if (pre.getLastRow() < 2) {
    var pr = [['p1', 'Gift Card 50.000', '#d91571', 5, 5, true, true],
              ['p2', 'Sigue intentando', '#0a021c', 30, -1, false, true],
              ['p3', '10% de descuento', '#008fca', 25, -1, true, true],
              ['p4', 'Sigue intentando', '#4c5a67', 30, -1, false, true],
              ['p5', 'Descuento 5%', '#f5a43b', 15, 20, true, true],
              ['p6', 'Premio mayor', '#d91571', 1, 1, true, true]];
    pre.getRange(2, 1, pr.length, 7).setValues(pr);
    mensaje += 'Premios de ejemplo creados. ';
  }
  asegurarRuletas_();   // crea «Ruleta principal» y le asigna los premios
  var cfg = ss.getSheetByName(SHEET_CONFIG);
  if (cfg.getLastRow() < 2) {
    var filas = Object.keys(CONFIG_DEFECTO).map(function (k) { return [k, CONFIG_DEFECTO[k]]; });
    cfg.getRange(2, 1, filas.length, 2).setValues(filas);
  }

  var usuarios = ss.getSheetByName(SHEET_USUARIOS);
  if (contarAdminsActivos_(usuarios) === 0) {
    var password = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    usuarios.appendRow(['ADMIN', password, 'admin', true, 'Administrador']);
    mensaje += 'Admin inicial: usuario ADMIN, contraseña ' + password + ' (también en la pestaña Usuarios; cámbiala al entrar). ';
  }

  mensaje += 'Hoja: ' + ss.getUrl();
  Logger.log(mensaje);
  try { ss.toast(mensaje, 'Totem PCH', 30); } catch (e) {}
  return mensaje;
}

// ---------- Helpers ----------

var SS_ = null;
var HOJAS_ = {};

function getSpreadsheet_(crear) {
  if (!SS_) SS_ = abrirSpreadsheet_(crear);
  return SS_;
}

function abrirSpreadsheet_(crear) {
  var activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { throw new Error('No se pudo abrir la hoja (SPREADSHEET_ID). Revisa el ID y los permisos.'); }
  }
  if (!crear) throw new Error('El backend no está configurado: ejecuta la función "instalar" una vez.');
  var ss = SpreadsheetApp.create('Totem PCH');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getSheet_(name) {
  if (HOJAS_[name]) return HOJAS_[name];
  var sheet = getSpreadsheet_(false).getSheetByName(name);
  if (!sheet) throw new Error('No existe la pestaña "' + name + '". Ejecuta la función "instalar".');
  HOJAS_[name] = sheet;
  return sheet;
}

function borrarFila_(sheet, fila) {
  if (sheet.getMaxRows() - sheet.getFrozenRows() <= 1) sheet.insertRowAfter(sheet.getMaxRows());
  sheet.deleteRow(fila);
}

/** { indice (1-based), valores } de la fila cuya columna `col` vale `id`, o null. */
function filaPorId_(sheet, col, id) {
  var buscado = String(id || '').trim();
  if (!buscado) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][col]).trim() === buscado) return { indice: i + 1, valores: rows[i] };
  }
  return null;
}

function usuarioPorNombre_(sheet, nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_USR.usuario]).trim().toUpperCase() === buscado) return { indice: i + 1, valores: rows[i] };
  }
  return null;
}

function contarAdminsActivos_(sheet) {
  var rows = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < rows.length; i++) {
    if (normalizarRol_(rows[i][COL_USR.rol]) === 'admin' && esActivo_(rows[i][COL_USR.activo])) total++;
  }
  return total;
}

function normalizarRol_(valor) {
  return String(valor || '').trim().toLowerCase() === 'admin' ? 'admin' : 'editor';
}

function esActivo_(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  var t = String(valor).trim().toUpperCase().replace('Í', 'I');
  return t === 'TRUE' || t === 'SI' || t === 'X' || t === '1';
}

/** Sheets puede convertir 'yyyy-MM-dd' en Date; se normaliza de vuelta a texto. */
function fechaTexto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').trim();
}

function jsonOut_(obj) {
  if (PROPS_RECIENTES_ && obj && obj.ok === true && !obj.revisiones) obj.revisiones = revisionesActuales_();
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
