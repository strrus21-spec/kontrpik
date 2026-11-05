const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFile = () => path.join(app.getPath('userData'), 'stats.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1320, height: 900, minWidth: 420, minHeight: 500,
    backgroundColor: '#111316', title: 'Контрпик', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.on('load-data', (e) => {
  try { e.returnValue = fs.existsSync(dataFile()) ? fs.readFileSync(dataFile(), 'utf8') : null; }
  catch { e.returnValue = null; }
});
ipcMain.handle('reset-data', () => { try { fs.unlinkSync(dataFile()); } catch {} return true; });

// ---------- обновление статистики с OpenDota ----------
const API = 'https://api.opendota.com/api';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (err) { if (i === tries - 1) throw err; await sleep(2000 * (i + 1)); }
  }
}
const sql = (q) => getJSON(API + '/explorer?sql=' + encodeURIComponent(q));

ipcMain.handle('refresh', async (e, opts) => {
  const send = (msg) => { try { e.sender.send('progress', msg); } catch {} };
  const old = (() => { try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return null; } })();
  const embeddedIcons = opts.icons || {};

  send('Загружаю список героев…');
  const hs = (await getJSON(API + '/heroStats')).sort((a, b) => a.localized_name.localeCompare(b.localized_name));
  const ids = hs.map(h => h.id), N = ids.length, ix = new Map(ids.map((id, i) => [id, i]));

  const heroes = [];
  for (const h of hs) {
    let img = embeddedIcons[h.localized_name] || (old && old.heroes.find(x => x[0] === h.localized_name) || [])[3];
    if (!img) {
      try {
        const r = await fetch('https://cdn.cloudflare.steamstatic.com' + h.icon.replace(/\?$/, ''));
        img = 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
      } catch { img = ''; }
    }
    heroes.push([h.localized_name, h.primary_attr, h.roles, img]);
  }

  // паблик
  send('Ищу последние матчи…');
  const latest = (await sql('SELECT match_id FROM public_matches ORDER BY match_id DESC LIMIT 1')).rows[0].match_id;
  const B = { all: () => true, low: t => t < 40, mid: t => t >= 40 && t < 60, high: t => t >= 60 };
  const acc = {}, counts = {};
  for (const b in B) { acc[b] = { vs: new Array(N * N * 2).fill(0), with: new Array(N * N * 2).fill(0), solo: new Array(N * 2).fill(0) }; counts[b] = 0; }
  let minT = Infinity, maxT = 0;
  const CH = 20, SIZE = 200000, top = latest - 300000;
  for (let c = 0; c < CH; c++) {
    send(`Скачиваю матчи пабликов: часть ${c + 1} из ${CH}…`);
    const a = top - (c + 1) * SIZE, b = a + SIZE - 1;
    let rows = [];
    try {
      rows = (await sql(`SELECT radiant_win r,avg_rank_tier t,radiant_team a,dire_team d,start_time s FROM public_matches WHERE match_id BETWEEN ${a} AND ${b} AND lobby_type=7 AND game_mode IN (2,22)`)).rows || [];
    } catch { continue; }
    for (const r of rows) {
      if (!r.a || !r.d || r.a.length !== 5 || r.d.length !== 5) continue;
      const A = r.a.map(x => ix.get(x)), D = r.d.map(x => ix.get(x));
      if (A.includes(undefined) || D.includes(undefined)) continue;
      const t = r.t || 0;
      minT = Math.min(minT, r.s); maxT = Math.max(maxT, r.s);
      for (const bk in B) {
        if (!B[bk](t)) continue;
        counts[bk]++; const M = acc[bk];
        for (const [team, opp, won] of [[A, D, r.r], [D, A, !r.r]]) {
          const w = won ? 1 : 0;
          for (const x of team) {
            M.solo[2 * x]++; M.solo[2 * x + 1] += w;
            for (const y of opp) { const k = 2 * (x * N + y); M.vs[k]++; M.vs[k + 1] += w; }
            for (const y of team) if (y !== x) { const k = 2 * (x * N + y); M.with[k]++; M.with[k + 1] += w; }
          }
        }
      }
    }
    await sleep(1000);
  }
  if (counts.all < 50000) throw new Error('OpenDota вернул слишком мало матчей. Попробуй позже.');

  // про-сцена
  const pro = new Array(N * N * 2).fill(0), prosolo = new Array(N * 2).fill(0);
  for (let i = 0; i < N; i++) {
    send(`Скачиваю матчапы про-сцены: ${i + 1} из ${N}…`);
    try {
      const mu = await getJSON(`${API}/heroes/${ids[i]}/matchups`);
      for (const m of mu) {
        const y = ix.get(m.hero_id); if (y === undefined) continue;
        const k = 2 * (i * N + y); pro[k] = m.games_played; pro[k + 1] = m.wins;
        prosolo[2 * i] += m.games_played; prosolo[2 * i + 1] += m.wins;
      }
    } catch {}
    await sleep(1100);
  }

  const out = { heroes, n: N, counts, pub: acc, pro: { vs: pro, solo: prosolo }, from: minT, to: maxT, updated: Math.floor(Date.now() / 1000) };
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.writeFileSync(dataFile(), JSON.stringify(out));
  send('Готово');
  return JSON.stringify(out);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
