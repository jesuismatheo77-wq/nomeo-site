import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const NP = process.argv[2];
const root = '/home/claude/nomeo-site';
const mod = await import('./dist/worker.js');
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[path.extname(p)] || 'application/octet-stream'; r.writeHead(200, {'Content-Type': t}); r.end(d); }); }).listen(8766);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 420, height: 900 } });
await pg.goto('http://localhost:8766/index.html'); await pg.waitForTimeout(2500);
const n = await pg.evaluate(() => document.querySelectorAll('#shop-packs .pkc').length); console.log('packs affichés', n);
for (let i = 0; i < n; i++) for (const times of [1, 2]) {
  await pg.evaluate(() => { localStorage.setItem('nomeo-panier-v1', '[]'); }); await pg.reload(); await pg.waitForTimeout(800);
  for (let t = 0; t < times; t++) {
    const card = pg.locator('#shop-packs .pkc').nth(i);
    await card.scrollIntoViewIfNeeded();
    await card.locator('.sp-open').click({timeout:3000}).catch(()=>{}); await pg.waitForTimeout(300);
    const inp = pg.locator('input.pk-a:visible, input.pk-b:visible, input.pk-i:visible'); const c = await inp.count();
    for (let k = 0; k < c; k++) await inp.nth(k).fill('Léa').catch(()=>{});
    const btn = pg.locator('button:visible').filter({ hasText: /^\s*Ajouter le pack/ }).first();
    await btn.click({ timeout: 3000 }).catch(e => console.log('clic impossible', i, e.message.split('\n')[0]));
    await pg.waitForTimeout(2100);
  }
  const cart = await pg.evaluate(() => JSON.parse(localStorage.getItem('nomeo-panier-v1') || '[]'));
  await pg.evaluate(() => document.getElementById('cart').showModal && document.getElementById('cart').showModal());
  const tot = await pg.evaluate(() => document.getElementById('cart-total').textContent);
  const web = Math.round(parseFloat(tot.replace(/\s|€/g,'').replace(',','.'))*100);
  let s; try { s = mod.priceCart(mod.normalize(cart)).reduce((a,l)=>a+l.cents,0); } catch (e) { s = 'ERR ' + e.message; }
  console.log('pack', i, '×' + times, 'lignes', cart.length, 'site', web, 'serveur', s, web === s ? 'OK' : '<<< ÉCART');
}
await b.close(); srv.close();
