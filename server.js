const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WWW_DIR = path.join(__dirname, 'www');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]; // ignora query string
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(WWW_DIR, urlPath);

  // Segurança: não sair da pasta www
  if (!filePath.startsWith(WWW_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Arquivo nao encontrado: ' + urlPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ================================');
  console.log('   AppEntrega - Servidor Local');
  console.log('  ================================');
  console.log('  URL: http://localhost:' + PORT);
  console.log('  Pasta: ' + WWW_DIR);
  console.log('  Pressione CTRL+C para parar.');
  console.log('');
});
