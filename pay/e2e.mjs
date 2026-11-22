import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root='/home/claude/nomeo-site'; const ORIGIN='http://localhost:8768';
const mod=await import('./dist/worker.js'); const worker=mod.default;
const stripeCalls=[]; const realFetch=globalThis.fetch;
globalThis.fetch=async (u,o)=>{ if(String(u).startsWith('https://api.stripe.com')){ stripeCalls.push({u:String(u),method:o.method,raw:o.body||'',body:decodeURIComponent((o.body||'').replace(/\+/g,' '))});
  if(o.method==='POST') return new Response(JSON.stringify({id:'cs_test_abc123',client_secret:'cs_test_abc123_secret_xyz'}),{status:200});
  return new Response(JSON.stringify({id:'cs_test_abc123',status:'complete',payment_status:'paid',amount_total:1234,metadata:stripeCalls.find(c=>c.method==='POST')._meta,customer_details:{email:'lea@mail.fr'}}),{status:200}); }
  return realFetch(u,o); };
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
  let t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream';
  if(p.endsWith('js/pay.js')) d=Buffer.from(d.toString().replace(/var PAY_API = '[^']*';/,"var PAY_API = 'https://mock.workers.dev';").replace('/^https:\\/\\/[a-z0-9.-]+$/i','/./'));
  r.writeHead(200,{'Content-Type':t});r.end(d);});}).listen(8768);
const env={STRIPE_SECRET_KEY:'sk_test_x',STRIPE_PUBLISHABLE_KEY:'pk_test_x',ALLOWED_ORIGINS:ORIGIN};
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:420,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await pg.route('https://mock.workers.dev/**',async route=>{const rq=route.request();const u=new URL(rq.url());
  const wreq=new Request('https://w.example'+u.pathname+u.search,{method:rq.method(),headers:{'Origin':ORIGIN,'Content-Type':'application/json'},body:rq.method()==='POST'?rq.postData():undefined});
  if(u.pathname==='/session'){}
  const res=await worker.fetch(wreq,env);const text=await res.text();
  if(u.pathname==='/session'){const sc=stripeCalls.filter(c=>c.method==='POST').pop();const m={};for(const [k,v] of new URLSearchParams(sc.raw)){const mm=/^metadata\[(.+?)\]$/.exec(k);if(mm)m[mm[1]]=v;}sc._meta=m;}
  await route.fulfill({status:res.status,headers:{'Access-Control-Allow-Origin':ORIGIN,'Content-Type':'application/json'},body:text});});
await pg.route('https://js.stripe.com/v3/',r=>r.fulfill({contentType:'text/javascript',body:"window.Stripe=function(pk){return{initEmbeddedCheckout:async function(o){return{mount:function(s){document.querySelector(s).textContent='[stripe]';window.__complete=o.onComplete;},destroy:function(){}}}}}"}));
let mail=null;await pg.route('https://api.web3forms.com/submit',r=>{mail=JSON.parse(r.request().postData());r.fulfill({contentType:'application/json',body:'{"success":true}'});});
await pg.goto(ORIGIN+'/index.html');await pg.waitForTimeout(2500);
await pg.evaluate(()=>localStorage.setItem('nomeo-panier-v1',JSON.stringify([{id:'noel-boule',text:'LÉA',combo:'jaune-noir',qty:3,sz:'m',fo:'',dg:'2'},{id:'porte-cles',text:'ACME',combo:'rouge-blanc',qty:12,sz:'',fo:'',dg:''}])));
await pg.reload();await pg.waitForTimeout(1500);
await pg.evaluate(()=>document.getElementById('cart').showModal());
console.log('bouton:',await pg.textContent('#pay-go'));
console.log('colis:',await pg.textContent('#pay-colis-t'));
await pg.click('#pay-go');console.log('sans nom ->',await pg.textContent('#pay-msg'));
await pg.fill('#c-name','Léa Martin');await pg.fill('#c-email','lea@mail.fr');await pg.click('#pay-go');console.log('sans cgv ->',await pg.textContent('#pay-msg'));
await pg.check('#pay-cgv');await pg.check('input[value=colis]');await pg.click('#pay-go');await pg.waitForTimeout(1200);
console.log('fenêtre:',await pg.textContent('#pay-dlg'));
const sc=stripeCalls.find(c=>c.method==='POST');console.log('--- Stripe reçoit ---');console.log(sc.body.split('&').filter(x=>/ui_mode|unit_amount|name\]|shipping|return_url|customer_email|description\]|locale|mode=|redirect/.test(x)).join('\n'));
await pg.evaluate(()=>window.__complete());await pg.waitForTimeout(1500);
console.log('fin:',(await pg.textContent('#pay-dlg')).slice(0,200));console.log('mail sujet:',mail&&mail.subject);console.log(mail&&mail.message);
console.log('panier vidé:',await pg.evaluate(()=>localStorage.getItem('nomeo-panier-v1')));
console.log('erreurs page:',errs.join(' | ')||'aucune');await b.close();srv.close();
