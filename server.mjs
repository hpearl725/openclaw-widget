import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.join(__dirname, '..');
const PORT = 9876;

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json' };

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // API
  if (url === '/api/status' && method === 'GET') {
    const status = fs.existsSync(path.join(WORKSPACE,'rooney-status.txt'))
      ? fs.readFileSync(path.join(WORKSPACE,'rooney-status.txt'),'utf8').replace(/^\uFEFF/,'').trim()
      : 'IDLE';
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({ status }));
  }

  if (url === '/api/tasks' && method === 'GET') {
    const f = path.join(WORKSPACE,'rooney-tasks.json');
    const data = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'')) : {tasks:[],archive:[]};
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify(data));
  }

  if (url === '/api/tasks' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const f = path.join(WORKSPACE,'rooney-tasks.json');
      fs.writeFileSync(f, JSON.stringify(JSON.parse(body), null, 2), 'utf8');
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true}));
    });
    return;
  }

  if (url === '/api/status' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { status } = JSON.parse(body);
      const clean = (status||'').replace(/^\uFEFF/,'');
      fs.writeFileSync(path.join(WORKSPACE,'rooney-status.txt'), clean, 'utf8');
      fs.writeFileSync(path.join(WORKSPACE,'rooney-active-task.txt'), clean === 'IDLE' ? '' : clean, 'utf8');
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true}));
    });
    return;
  }

  if (url === '/api/uptime' && method === 'GET') {
    import('child_process').then(({execSync}) => {
      try {
        const out = execSync(
          'powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1 | ForEach-Object { $_.StartTime.ToString(\'M/d/yyyy H:mm:ss\') }"',
          {timeout:3000}
        ).toString().trim();
        if (!out) { res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify({uptime:'DOWN'})); }
        const start = new Date(out);
        const secs = Math.floor((Date.now() - start.getTime()) / 1000);
        const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
        const uptime = h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({uptime}));
      } catch {
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({uptime:'?'}));
      }
    });
    return;
  }

  // Static files
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('Not found'); }
  const ext = path.extname(filePath);
  res.writeHead(200, {'Content-Type': MIME[ext]||'text/plain'});
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`Rooney widget server: http://127.0.0.1:${PORT}`));
