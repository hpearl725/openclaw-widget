const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const WORKSPACE = path.join(__dirname, '..');

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 720,
    height: 120,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setAlwaysOnTop(true, 'screen-saver');

  ipcMain.handle('read-status', () => {
    const f = path.join(WORKSPACE, 'rooney-status.txt');
    return fs.existsSync(f) ? fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim() : 'IDLE';
  });

  ipcMain.handle('read-tasks', () => {
    const f = path.join(WORKSPACE, 'rooney-tasks.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'')) : {tasks:[],archive:[]};
  });

  ipcMain.handle('write-tasks', (_, data) => {
    fs.writeFileSync(path.join(WORKSPACE,'rooney-tasks.json'), JSON.stringify(data,null,2), 'utf8');
    return true;
  });

  ipcMain.handle('write-status', (_, status) => {
    const clean = (status||'').replace(/^\uFEFF/,'');
    fs.writeFileSync(path.join(WORKSPACE,'rooney-status.txt'), clean, 'utf8');
    fs.writeFileSync(path.join(WORKSPACE,'rooney-active-task.txt'), clean==='IDLE'?'':clean, 'utf8');
    return true;
  });

  ipcMain.handle('get-uptime', () => {
    try {
      const out = execSync(
        `powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1 | ForEach-Object { $_.StartTime.ToString('M/d/yyyy H:mm:ss') }"`,
        {timeout:3000}
      ).toString().trim();
      if (!out) return 'DOWN';
      const start = new Date(out);
      const secs = Math.floor((Date.now()-start.getTime())/1000);
      const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
      return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
    } catch { return '?'; }
  });

  ipcMain.handle('move-window', (_, {x, y}) => win.setPosition(Math.round(x), Math.round(y)));
  ipcMain.handle('snap-window', () => win.setPosition(0, 0));
  ipcMain.handle('resize-window', (_, h) => { const [w] = win.getSize(); win.setSize(w, Math.max(Math.round(h), 110)); });
  ipcMain.handle('resize-window-full', (_, {w, h}) => { win.setSize(Math.round(w), Math.max(Math.round(h), 110)); });
  ipcMain.handle('get-position', () => win.getPosition());

  ipcMain.handle('publish-event', (_, evt) => {
    const f = path.join(WORKSPACE, 'rooney-events.jsonl');
    const line = JSON.stringify({ ...evt, ts: new Date().toISOString() }) + '\n';
    fs.appendFileSync(f, line, 'utf8');
    return true;
  });

  // Cache crons — refresh every 60s in background, serve cache instantly
  let cronCache = { jobs: [] };
  function refreshCronCache() {
    try {
      const node = 'C:\\Program Files\\nodejs\\node.exe';
      const openclaw = 'C:\\Users\\OpenClaw\\AppData\\Roaming\\npm\\node_modules\\openclaw\\openclaw.mjs';
      const out = execSync(`"${node}" "${openclaw}" cron list --json`, { timeout: 8000, windowsHide: true }).toString().trim();
      cronCache = JSON.parse(out);
    } catch(e) { console.error('cron refresh error:', e.message); }
  }
  refreshCronCache(); // initial load
  setInterval(refreshCronCache, 60000);

  ipcMain.handle('get-crons', () => cronCache);
  ipcMain.handle('refresh-crons', () => { refreshCronCache(); return cronCache; });

  // Weather — cache 10 min
  let weatherCache = { temp: '--', desc: '--', updated: 0 };
  ipcMain.handle('get-weather', () => {
    const now = Date.now();
    if (now - weatherCache.updated < 600000) return weatherCache;
    try {
      const raw = execSync('powershell -Command "Invoke-RestMethod \'https://wttr.in/Culver+City?format=%t+%C\'"', { timeout: 5000 }).toString().trim();
      const parts = raw.replace(/[^\x20-\x7E]/g, '').trim().split(' ');
      weatherCache = { temp: parts[0] || '--', desc: parts.slice(1).join(' ') || '--', updated: now };
    } catch { weatherCache.updated = now; }
    return weatherCache;
  });
});

app.on('window-all-closed', () => app.quit());
