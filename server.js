/* server.js — static file server ขนาดเล็กสำหรับรันแอปบนเครื่อง
 * ใช้เฉพาะ Node built-in ไม่ต้องติดตั้ง dependency ใด ๆ
 *
 *   node server.js            → http://localhost:5173
 *   node server.js 8080       → เปลี่ยนพอร์ต
 *
 * ฟังบน 0.0.0.0 เพื่อให้เปิดจากมือถือในวง Wi-Fi เดียวกันได้
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // กัน path traversal ออกนอกโฟลเดอร์ app
  if (!path.resolve(file).startsWith(path.resolve(ROOT))) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ไม่พบไฟล์: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(buf);
  });
}).listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flat()
    .filter(n => n && n.family === 'IPv4' && !n.internal)
    .map(n => n.address);

  console.log('ประกันไปกับคุณ — เซิร์ฟเวอร์ทำงานแล้ว');
  console.log('  บนเครื่องนี้ : http://localhost:' + PORT);
  lan.forEach(ip => console.log('  บนมือถือ    : http://' + ip + ':' + PORT + '  (ต้องอยู่ Wi-Fi เดียวกัน)'));
  console.log('\nกด Ctrl+C เพื่อหยุด');
});
