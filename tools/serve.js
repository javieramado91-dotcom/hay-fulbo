/* Servidor estático mínimo para previsualizar el sitio en local. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__save') return savePng(req, res);
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => console.log('hayfulbo dev server → http://localhost:' + PORT));

/* Guarda un dataURL enviado por el banco de pruebas (solo desarrollo local). */
function savePng(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 30e6) req.destroy(); });
  req.on('end', () => {
    try {
      const { name, dataUrl } = JSON.parse(body);
      const safe = String(name).replace(/[^a-z0-9_-]/gi, '_') + '.png';
      const dir = path.join(ROOT, 'tools', 'out');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, safe), Buffer.from(String(dataUrl).split(',')[1], 'base64'));
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, file: safe }));
    } catch (err) {
      res.writeHead(400).end(String(err));
    }
  });
}
