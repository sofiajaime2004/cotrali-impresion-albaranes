// Cotrali · servicio de lectura de hojas (OCR) para Cloudflare Workers.
// Recibe una imagen, la envía a Google Cloud Vision (endpoint de la UE) y devuelve el texto.
// No guarda nada: ni imágenes, ni texto, ni registros del contenido.
//
// Secretos y variables (Cloudflare → Workers → Settings → Variables):
//   VISION_KEY      (secreto)  clave de API de Google Cloud, restringida a "Cloud Vision API"
//   ACCESS_CODE     (secreto)  código de acceso que se comparte con el equipo
//   ALLOWED_ORIGIN  (variable) dirección de la página, p. ej. https://TU-USUARIO.github.io

const MAX_BYTES = 8 * 1024 * 1024;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status: status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors(origin)) });
}
function sameCode(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default {
  async fetch(req, env) {
    var origin = req.headers.get('Origin') || '';
    var allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!allowed.includes(origin)) return new Response('Origen no autorizado', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405, origin);
    if (!sameCode(req.headers.get('X-Access-Code') || '', String(env.ACCESS_CODE || ''))) return json({ error: 'Código de acceso incorrecto' }, 401, origin);
    var len = Number(req.headers.get('Content-Length') || 0);
    if (len > MAX_BYTES * 1.4) return json({ error: 'Imagen demasiado grande' }, 413, origin);

    var image;
    try { image = (await req.json()).image; } catch (e) { return json({ error: 'Petición no válida' }, 400, origin); }
    if (typeof image !== 'string' || image.length < 100 || image.length > MAX_BYTES * 1.4) return json({ error: 'Imagen no válida' }, 400, origin);

    var r = await fetch('https://eu-vision.googleapis.com/v1/images:annotate?key=' + encodeURIComponent(env.VISION_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ image: { content: image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], imageContext: { languageHints: ['es'] } }] })
    });
    if (!r.ok) return json({ error: 'Error del servicio de lectura' }, 502, origin);
    var j = await r.json();
    var resp = (j.responses && j.responses[0]) || {};
    if (resp.error) return json({ error: 'Error del servicio de lectura' }, 502, origin);
    return json({ text: (resp.fullTextAnnotation && resp.fullTextAnnotation.text) || '' }, 200, origin);
  }
};
