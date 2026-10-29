const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'videohub.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  poster_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  download_480 TEXT NOT NULL DEFAULT '',
  download_720 TEXT NOT NULL DEFAULT '',
  download_1080 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
`);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\\nDisallow: /admin\\nDisallow: /admin/setup\\n');
});
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'videohub.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));

const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = esc;
const admin = (req, res, next) => req.session.adminId ? next() : res.redirect('/admin/login');
const layout = (title, body, adminMode=false) => `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — VideoHub</title><style>
:root{--bg:#0b1020;--panel:#141c30;--text:#f4f6fb;--muted:#aab4c8;--accent:#e63946;--line:#29344b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}a{color:inherit;text-decoration:none}.top{background:#080c17;border-bottom:1px solid var(--line);padding:16px max(18px,calc((100% - 1100px)/2));display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}.brand{font-weight:900;font-size:24px;letter-spacing:.4px}.brand span{color:var(--accent)}nav{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted)}main{max-width:1100px;margin:28px auto;padding:0 18px}.hero{padding:34px 26px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,#171f35,#101626)}h1{line-height:1.15;margin-top:0}p{color:var(--muted)}.btn,button{display:inline-block;border:0;border-radius:9px;padding:10px 15px;background:var(--accent);color:#fff;font-weight:700;cursor:pointer}.btn.secondary{background:#26334d}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px;margin-top:20px}.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}.poster{width:100%;height:230px;object-fit:cover;background:#202b40;display:block}.placeholder{height:230px;display:grid;place-items:center;background:linear-gradient(135deg,#26334d,#101626);font-size:44px;font-weight:900;color:#52627f}.card-body{padding:14px}.muted{color:var(--muted);font-size:14px}.form{display:grid;gap:12px;max-width:680px}.form label{display:grid;gap:5px;color:var(--muted);font-size:14px}input,textarea,select{width:100%;padding:11px;border:1px solid #35425c;background:#0b1222;color:var(--text);border-radius:8px;font:inherit}textarea{min-height:100px;resize:vertical}.panel{padding:20px;margin-bottom:18px}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.row>*{flex:1}.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:11px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted)}.danger{background:#7f1d2d}.notice{background:#1b3a2c;padding:12px;border-radius:8px;margin:12px 0}.error{background:#4b1c29;padding:12px;border-radius:8px;margin:12px 0}.video-frame{width:100%;aspect-ratio:16/9;background:#05070c;border:1px solid var(--line);border-radius:12px}.footer{text-align:center;color:var(--muted);padding:28px}.search{display:flex;gap:8px;margin-top:20px}.search input{flex:1}@media(max-width:600px){.poster,.placeholder{height:190px}main{margin:18px auto}.top{gap:10px}}
</style></head><body><header class="top"><a class="brand" href="/">Video<span>Hub</span></a><nav><a href="/">Home</a><a href="/videos">Videos</a>${adminMode?'<a href="/admin">Dashboard</a><form method="post" action="/admin/logout" style="display:inline"><button class="secondary">Logout</button></form>':'<a href="/terms">Terms</a><a href="/privacy">Privacy</a>'}</nav></header><main>${body}</main><footer class="footer">© ${new Date().getFullYear()} VideoHub · Demo starter project</footer></body></html>`;
const poster = v => v.poster_url ? `<img class="poster" src="${attr(v.poster_url)}" alt="${attr(v.title)} poster" loading="lazy">` : `<div class="placeholder">▶</div>`;
const videoCard = v => `<article class="card"><a href="/video/${v.id}">${poster(v)}<div class="card-body"><strong>${esc(v.title)}</strong><div class="muted">${esc(v.category)}</div></div></a></article>`;

app.get('/', (req,res) => {
 const videos = db.prepare('SELECT * FROM videos ORDER BY id DESC LIMIT 8').all();
 res.send(layout('Home', `<section class="hero"><h1>Apni pasand ke videos dekhein</h1><p>VideoHub par latest videos browse karein. Admin panel se aap apne videos manage kar sakte hain.</p><a class="btn" href="/videos">Videos dekhein</a></section><h2>Latest Videos</h2>${videos.length?`<div class="grid">${videos.map(videoCard).join('')}</div>`:'<div class="panel"><p>Abhi koi video add nahi hua. Admin panel se pehla video add karein.</p></div>'}`));
});
app.get('/videos', (req,res) => {
 const q = String(req.query.q||'').trim();
 const videos = q ? db.prepare('SELECT * FROM videos WHERE title LIKE ? OR category LIKE ? ORDER BY id DESC').all('%'+q+'%','%'+q+'%') : db.prepare('SELECT * FROM videos ORDER BY id DESC').all();
 res.send(layout('Videos', `<h1>All Videos</h1><form class="search" method="get"><input name="q" value="${attr(q)}" placeholder="Video ya category search karein"><button>Search</button></form>${videos.length?`<div class="grid">${videos.map(videoCard).join('')}</div>`:'<div class="panel"><p>Koi video nahi mila.</p></div>'}`));
});
app.get('/video/:id', (req,res) => {
 const v = db.prepare('SELECT * FROM videos WHERE id=?').get(Number(req.params.id));
 if(!v) return res.status(404).send(layout('Not found','<h1>Video nahi mila</h1><a class="btn" href="/videos">Back to videos</a>'));
 const downloads = [['480p',v.download_480],['720p',v.download_720],['1080p',v.download_1080]].filter(x=>x[1]);
 const media = v.video_url ? `<video class="video-frame" controls preload="metadata" src="${attr(v.video_url)}"></video>` : `<div class="panel"><p>Is video ka playback URL abhi add nahi hua.</p></div>`;
 res.send(layout(v.title, `<a href="/videos">← All videos</a><h1 style="margin-top:18px">${esc(v.title)}</h1><p>${esc(v.category)}</p>${media}<section class="panel"><h2>Description</h2><p>${esc(v.description)||'Description available nahi hai.'}</p>${downloads.length?'<h3>Download options</h3><div class="row">'+downloads.map(([q,u])=>`<a class="btn secondary" target="_blank" rel="noopener" href="${attr(u)}">${q} Download</a>`).join('')+'</div>':''}</section>`));
});
app.get('/terms', (req,res)=>res.send(layout('Terms','<h1>Terms of Use</h1><p>Sirf aisa content publish karein jiske rights ya permission aapke paas hon. Site ko apne local laws aur platform policies ke mutabik chalayein.</p>')));
app.get('/privacy', (req,res)=>res.send(layout('Privacy','<h1>Privacy Policy</h1><p>Yeh starter website admin login ke liye session cookie aur admin/video data ke liye local database use karti hai. Public launch se pehle apni actual privacy policy aur data practices add karein.</p>')));

app.get('/admin/setup', (req,res) => {
 if(db.prepare('SELECT COUNT(*) n FROM admins').get().n) return res.redirect('/admin/login');
 res.send(layout('Admin Setup', `<section class="panel"><h1>Create Admin Account</h1><p>Yeh page sirf pehla admin banane ke liye hai. Account banne ke baad setup band ho jayega.</p><form class="form" method="post"><label>Username<input name="username" required minlength="3" maxlength="40" autocomplete="username"></label><label>Password<input name="password" type="password" required minlength="10" autocomplete="new-password"></label><button>Create Admin</button></form></section>`));
});
app.post('/admin/setup', async (req,res) => {
 if(db.prepare('SELECT COUNT(*) n FROM admins').get().n) return res.redirect('/admin/login');
 const username = String(req.body.username||'').trim();
 const password = String(req.body.password||'');
 if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username) || password.length<10) return res.status(400).send(layout('Admin Setup','<div class="error">Username 3-40 characters ka ho aur password kam se kam 10 characters ka ho.</div><a href="/admin/setup">Try again</a>'));
 try { db.prepare('INSERT INTO admins(username,password_hash) VALUES(?,?)').run(username, await bcrypt.hash(password,12)); res.redirect('/admin/login'); }
 catch(e){ res.status(400).send(layout('Admin Setup','<div class="error">Account create nahi hua. Username check karein.</div><a href="/admin/setup">Try again</a>')); }
});
app.get('/admin/login',(req,res)=>{
 if(req.session.adminId) return res.redirect('/admin');
 res.send(layout('Admin Login',`<section class="panel"><h1>Admin Login</h1>${req.query.error?'<div class="error">Login details galat hain ya thodi der baad try karein.</div>':''}<form class="form" method="post"><label>Username<input name="username" required autocomplete="username"></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button>Login</button></form></section>`));
});
app.post('/admin/login', async (req,res)=>{
 const ip = req.ip;
 const now = Math.floor(Date.now()/1000);
 db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(now-900);
 const count = db.prepare('SELECT COUNT(*) n FROM login_attempts WHERE ip=? AND attempted_at>?').get(ip,now-900).n;
 if(count>=10) return res.redirect('/admin/login?error=1');
 db.prepare('INSERT INTO login_attempts(ip,attempted_at) VALUES(?,?)').run(ip,now);
 const u = db.prepare('SELECT * FROM admins WHERE username=?').get(String(req.body.username||'').trim());
 if(!u || !(await bcrypt.compare(String(req.body.password||''),u.password_hash))) return res.redirect('/admin/login?error=1');
 req.session.regenerate(err=>{
   if(err) return res.status(500).send('Session error');
   req.session.adminId=u.id;
   req.session.username=u.username;
   res.redirect('/admin');
 });
});
app.post('/admin/logout', admin, (req,res)=>req.session.destroy(()=>res.redirect('/')));
app.get('/admin', admin, (req,res)=>{
 const videos=db.prepare('SELECT * FROM videos ORDER BY id DESC').all();
 const rows=videos.map(v=>`<tr><td>${v.id}</td><td><strong>${esc(v.title)}</strong><br><span class="muted">${esc(v.category)}</span></td><td><a class="btn secondary" href="/admin/videos/${v.id}/edit">Edit</a> <form method="post" action="/admin/videos/${v.id}/delete" style="display:inline" onsubmit="return confirm('Is video ko delete karein?')"><button class="danger">Delete</button></form></td></tr>`).join('');
 res.send(layout('Admin Dashboard',`<h1>Admin Dashboard</h1><p>Logged in as ${esc(req.session.username)} · Total videos: ${videos.length}</p><section class="panel"><div class="row"><div><h2>Videos</h2><p>Website par dikhne wale videos manage karein.</p></div><div style="text-align:right"><a class="btn" href="/admin/videos/new">+ Add Video</a></div></div><div class="tablewrap"><table><thead><tr><th>ID</th><th>Video</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Abhi koi video nahi hai.</td></tr>'}</tbody></table></div></section>`,true));
});
function videoForm(v={}, edit=false) {
 return `<section class="panel"><h1>${edit?'Edit Video':'Add Video'}</h1><form class="form" method="post"><label>Video title *<input name="title" required maxlength="180" value="${attr(v.title||'')}"></label><label>Category<input name="category" maxlength="80" value="${attr(v.category||'General')}"></label><label>Description<textarea name="description" maxlength="5000">${esc(v.description||'')}</textarea></label><label>Poster image URL<input type="url" name="poster_url" value="${attr(v.poster_url||'')}" placeholder="https://..."></label><label>Video playback URL<input type="url" name="video_url" value="${attr(v.video_url||'')}" placeholder="https://...mp4"></label><label>480p download URL<input type="url" name="download_480" value="${attr(v.download_480||'')}"></label><label>720p download URL<input type="url" name="download_720" value="${attr(v.download_720||'')}"></label><label>1080p download URL<input type="url" name="download_1080" value="${attr(v.download_1080||'')}"></label><div class="row"><button>Save Video</button><a class="btn secondary" href="/admin">Cancel</a></div></form></section>`;
}
app.get('/admin/videos/new',admin,(req,res)=>res.send(layout('Add Video',videoForm(),true)));
app.post('/admin/videos/new',admin,(req,res)=>{
 const b=req.body;
 if(!String(b.title||'').trim()) return res.status(400).send(layout('Add Video','<div class="error">Title required hai.</div>'+videoForm(b),true));
 db.prepare(`INSERT INTO videos(title,description,category,poster_url,video_url,download_480,download_720,download_1080) VALUES(?,?,?,?,?,?,?,?)`).run(String(b.title).trim(),String(b.description||''),String(b.category||'General'),String(b.poster_url||''),String(b.video_url||''),String(b.download_480||''),String(b.download_720||''),String(b.download_1080||''));
 res.redirect('/admin');
});
app.get('/admin/videos/:id/edit',admin,(req,res)=>{
 const v=db.prepare('SELECT * FROM videos WHERE id=?').get(Number(req.params.id));
 if(!v) return res.status(404).send(layout('Not found','<h1>Video not found</h1>',true));
 res.send(layout('Edit Video',videoForm(v,true),true));
});
app.post('/admin/videos/:id/edit',admin,(req,res)=>{
 const b=req.body;
 db.prepare(`UPDATE videos SET title=?,description=?,category=?,poster_url=?,video_url=?,download_480=?,download_720=?,download_1080=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(String(b.title||'').trim(),String(b.description||''),String(b.category||'General'),String(b.poster_url||''),String(b.video_url||''),String(b.download_480||''),String(b.download_720||''),String(b.download_1080||''),Number(req.params.id));
 res.redirect('/admin');
});
app.post('/admin/videos/:id/delete',admin,(req,res)=>{db.prepare('DELETE FROM videos WHERE id=?').run(Number(req.params.id));res.redirect('/admin');});
app.use((req,res)=>res.status(404).send(layout('Not found','<h1>Page nahi mila</h1><a class="btn" href="/">Home</a>')));
app.listen(PORT,'0.0.0.0',()=>console.log(`VideoHub running on http://localhost:${PORT}`));
