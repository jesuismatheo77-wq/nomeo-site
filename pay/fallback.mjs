const w=(await import('./dist/worker.js')).default; const calls=[];
globalThis.fetch=async(u,o)=>{const b=decodeURIComponent(o.body||'');calls.push(b.match(/ui_mode=(\w+)/)[1]);
 if(/ui_mode=embedded&/.test(b)) return new Response(JSON.stringify({error:{message:'Invalid value for ui_mode: embedded. Supported values: hosted_page, embedded_page, custom'}}),{status:400});
 return new Response(JSON.stringify({id:'cs_test_1',client_secret:'cs_test_1_secret_x'}),{status:200});};
const r=await w.fetch(new Request('https://w/session',{method:'POST',headers:{Origin:'https://nomeo-atelier.com','Content-Type':'application/json'},body:JSON.stringify({items:[{id:'porte-cles',qty:1}],name:'A',email:'a@b.fr'})}),{STRIPE_SECRET_KEY:'sk',STRIPE_PUBLISHABLE_KEY:'pk'});
console.log(r.status,calls.join(' puis '),(await r.json()).clientSecret);
