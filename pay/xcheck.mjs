// Compare les prix du serveur avec ceux affichés par le vrai site (navigateur headless)
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = '/home/claude/nomeo-site';
const mod = await import('./dist/worker.js');
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[path.extname(p)] || 'application/octet-stream'; r.writeHead(200, {'Content-Type': t}); r.end(d); }); }).listen(8765);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 420, height: 900 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(2500);
const ids = ['noel-boule','noel-etoile','noel-boule-logo','porte-cles','sous-verre','plaque','c-coeur','noel-mini-bonnets','prenom-volume','noel-bonhomme','noel-etiquette','noel-cadeau','tirelire','noel-calendrier','logo-resine'];
let bad = 0, n = 0;
function rnd(a){return a[Math.floor(Math.random()*a.length)];}
for (let t = 0; t < 40; t++) {
  const cart = []; const k = 1 + Math.floor(Math.random()*5);
  for (let i = 0; i < k; i++) { const id = rnd(ids); const q = rnd([1,2,3,5,9,10,12,24,25,30,50,60,100,120]);
    cart.push({ id, text: 'LÉA', combo: 'jaune-noir', qty: id==='noel-mini-bonnets'?Math.max(4,Math.min(20,q)):q, sz: rnd(['s','m','l']), fo: '', dg: id==='noel-boule'?'2':'' }); }
  await pg.evaluate(c => { localStorage.setItem('nomeo-panier-v1', JSON.stringify(c)); }, cart);
  await pg.reload(); await pg.waitForTimeout(700);
  await pg.evaluate(() => document.getElementById('cart').showModal && document.getElementById('cart').showModal());
  const shown = await pg.evaluate(() => { const c = JSON.parse(localStorage.getItem('nomeo-panier-v1')||'[]'); return { c, total: document.getElementById('cart-total').textContent }; });
  const web = Math.round(parseFloat(shown.total.replace(/\s|€/g,'').replace(',','.'))*100);
  let srvC; try { srvC = mod.priceCart(mod.normalize(shown.c)).reduce((a,l)=>a+l.cents,0); } catch(e) { srvC = 'ERR '+e.message; }
  n++; if (srvC !== web) { bad++; console.log('ÉCART', web, srvC, JSON.stringify(shown.c)); }
}
console.log('paniers testés', n, 'écarts', bad, errs.length ? 'erreurs page: '+errs.slice(0,3).join(' | ') : '');
await b.close(); srv.close();
