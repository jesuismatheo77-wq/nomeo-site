/* Noméo – paiement en ligne (Stripe Embedded Checkout).
   Lit le panier du site (localStorage), demande une session de paiement au serveur
   (qui recalcule les prix), affiche le paiement dans la page, puis envoie la commande par e-mail.
   Tant que PAY_API n'est pas renseigné, ce fichier ne fait rien : le site garde son fonctionnement actuel. */
(function () {
  'use strict';
  var PAY_API = 'https://nomeo-pay.jesuismatheo77.workers.dev';                         // ex. https://nomeo-pay.compte.workers.dev (sans « / » final)
  var CART_KEY = 'nomeo-panier-v1';
  var MAIL_KEY = '027d9344-9e05-43ea-8a2f-2f5c3c5cd6e5';   // clé publique Web3Forms, la même que dans ui.js
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(PAY_API)) return;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('cart-form'); if (!form) return;
  var cfg = null, stripeP = null, checkout = null;

  function eur(c) { return (c / 100).toFixed(2).replace('.', ',') + ' €'; }
  function readCart() { try { var a = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function api(path, opt) {
    return fetch(PAY_API + path, opt).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Erreur'); return j; }); });
  }
  function el(t, a, kids) {
    var n = document.createElement(t); Object.keys(a || {}).forEach(function (k) { if (k === 'text') n.textContent = a[k]; else n.setAttribute(k, a[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); }); return n;
  }

  // ---------- styles ----------
  var st = document.createElement('style');
  st.textContent = '.pay-box{border:1px solid var(--field-line,#e2e5e9);border-radius:14px;padding:12px 14px;display:grid;gap:10px;margin:4px 0 0;min-width:0}' +
    '.pay-box legend{font-weight:700;font-size:.9rem;padding:0 6px}' +
    '.pay-box label{display:flex;gap:10px;align-items:flex-start;font-size:.92rem;line-height:1.35}' +
    '.pay-box input[type=radio],.pay-box input[type=checkbox]{margin-top:3px;flex:none;width:18px;height:18px}' +
    '.pay-msg{font-size:.88rem;color:var(--warn,#7a5200);margin:0;min-height:1.2em}' +
    '.pay-sub{display:grid;gap:6px;margin:-2px 0 4px 28px;min-width:0}.pay-first{margin-left:0}.pay-choice{margin:4px 0 0}.pay-box>*{min-width:0}.pay-box label span{min-width:0;overflow-wrap:anywhere}.pay-sub[hidden]{display:none}.pay-row{display:flex;gap:8px;min-width:0}.pay-row input{flex:1;min-width:0;width:100%}.pay-sub input{width:100%;box-sizing:border-box}' +
    '.pay-sub input{padding:10px 12px;border-radius:12px;border:1.5px solid #dcdfe4;font:inherit;font-size:1rem;color:var(--ink);background:#fff}' +
    '.pay-sub .btn-s{min-height:44px;padding:0 14px;border-radius:12px;border:2px solid var(--ink,#16181b);background:#fff;font-weight:700;font:inherit;font-weight:700}' +
    '.pay-note{font-size:.84rem;color:var(--ink-2,#474b52);margin:0}.pay-free{margin:0;font-size:.9rem;font-weight:700}' +
    '#pay-dlg{border:0;border-radius:18px;padding:0;width:min(560px,calc(100vw - 20px));max-height:92vh;overflow:auto;background:var(--white,#fff);color:var(--ink,#16181b)}' +
    '#pay-dlg::backdrop{background:var(--scrim,rgba(20,20,20,.55))}' +
    '.pay-in{padding:16px 16px 20px;display:grid;gap:12px}.pay-in h3{margin:0;font-size:1.15rem}' +
    '.pay-x{justify-self:end}.pay-ok{display:grid;gap:10px}.pay-ok b{font-size:1.1rem}';
  document.head.appendChild(st);

  // ---------- interface dans le panier ----------
  var act = form.querySelector('.cart-act'), send = $('c-send');
  var box = el('fieldset', { class: 'pay-box' }, [el('legend', { text: 'Livraison' })]);
  var shipLine = el('p', { class: 'pay-note', id: 'pay-ship', role: 'status', text: '' });
  var freeMsg = el('p', { class: 'pay-free', id: 'pay-free', hidden: '' });
  var adrBox = el('div', { class: 'pay-sub pay-first' }, [freeMsg, shipLine]);
  var cgvA = el('button', { type: 'button', class: 'text-btn', 'data-legal': 'cgv', text: 'conditions de vente' });
  var lCgv = el('label', {}, [el('input', { type: 'checkbox', id: 'pay-cgv' }), el('span', {}, [document.createTextNode('J’ai lu et j’accepte les '), cgvA])]);
  var go = el('button', { type: 'button', class: 'btn btn-y', id: 'pay-go', text: 'Payer en ligne' });
  var msg = el('p', { class: 'pay-msg', id: 'pay-msg', role: 'status' });
  [adrBox, lCgv, go, msg].forEach(function (n) { box.appendChild(n); });
  function pieces() { return readCart().reduce(function (a, it) { return a + (parseInt(it.qty, 10) || 1); }, 0); }
  function shipCents() { var g = cfg && cfg.gratuitDes, c = goodsCents(); return g && c >= g ? 0 : (cfg && cfg.shipCents) || 0; }
  act.parentNode.insertBefore(box, act);
  var fine = [].slice.call(form.querySelectorAll('.cart-fine')).filter(function (p) { return /paiement en ligne arrive/i.test(p.textContent); })[0];
  if (fine) fine.textContent = 'Paiement sécurisé par Stripe : carte, Apple Pay ou Google Pay. Avant l’impression, on vous envoie l’aperçu 3D de votre pièce, et vous pouvez modifier ou annuler sur simple message. Pour une création sur mesure ou un devis, utilisez « Envoyer ma commande ».';
  document.documentElement.classList.add('pay-on');

  function totalText() { var t = $('cart-total'); return t ? t.textContent : ''; }
  function goodsCents() { return Math.round(parseFloat((totalText() || '0').replace(/[^0-9,]/g, '').replace(',', '.')) * 100) || 0; }
  function freeNote() {
    var g = cfg && cfg.gratuitDes; if (!g) { freeMsg.hidden = true; return; }
    var c = goodsCents(); freeMsg.hidden = false;
    freeMsg.textContent = c >= g ? 'Livraison offerte pour cette commande.' : 'Livraison offerte dès ' + eur(g) + ' d’achat : plus que ' + eur(g - c) + '.';
  }
  function refreshBtn() {
    freeNote();
    var s = totalText(), c = Math.round(parseFloat((s || '0').replace(/[^0-9,]/g, '').replace(',', '.')) * 100) || 0;
    var sh = c ? shipCents() : 0;
    if (cfg) shipLine.textContent = 'Livraison : ' + (c && !sh ? 'offerte' : eur((cfg && cfg.shipCents) || 0)) + '. Adresse demandée à l’étape de paiement.';
    go.textContent = 'Payer en ligne' + (c ? ' · ' + eur(c + sh) : '');
  }
  var tot = $('cart-total'); if (tot && window.MutationObserver) new MutationObserver(refreshBtn).observe(tot, { childList: true, characterData: true, subtree: true });
  refreshBtn();
  api('/config').then(function (c) {
    if (!c.livraison) c.shipCents = c.shipColisCents || 490; // ancien serveur : tarif colis
    cfg = c; refreshBtn();
  }).catch(function () { box.hidden = true; document.documentElement.classList.remove('pay-on'); });

  // ---------- fenêtre de paiement ----------
  var dlg = el('dialog', { id: 'pay-dlg', 'aria-label': 'Paiement' });
  var inner = el('div', { class: 'pay-in' });
  dlg.appendChild(inner); document.body.appendChild(dlg);
  function openDlg() { try { if (!dlg.open) dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  function closeDlg() { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } }
  function destroyCheckout() { try { if (checkout) checkout.destroy(); } catch (e) {} checkout = null; }
  dlg.addEventListener('close', destroyCheckout);

  function loadStripe() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripeP) return stripeP;
    stripeP = new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = function () { ok(window.Stripe); }; s.onerror = function () { stripeP = null; ko(new Error('Stripe indisponible')); };
      document.head.appendChild(s);
    }); return stripeP;
  }

  function sendMail(info, sid) {
    var mk = 'nomeo-mailed-' + sid; try { if (localStorage.getItem(mk)) return Promise.resolve(true); } catch (e) {}
    var body = ['COMMANDE PAYÉE EN LIGNE n° ' + info.orderNo, '', info.message, '',
      'Total payé : ' + eur(info.totalCents), 'Livraison : ' + 'à livrer ou à expédier en Mondial Relay selon l’adresse' + (info.where ? ' (' + info.where + ')' : ''),
      info.address ? 'Adresse : ' + info.address : '', '', 'Nom : ' + info.name, info.email ? 'E-mail : ' + info.email : '', info.tel ? 'Téléphone : ' + info.tel : '',
      info.more ? 'Remise, remarques : ' + info.more : '', '', giftTxt(info), '', 'Paiement Stripe : ' + sid].filter(function (x, i, a) { return x !== '' || a[i - 1] !== ''; }).join('\n');
    var payload = { access_key: MAIL_KEY, subject: 'Commande payée Noméo ' + info.orderNo + ' : ' + info.name, from_name: 'Site Noméo', name: info.name, phone: info.tel || '', message: body };
    if (info.email) payload.email = info.email;
    return fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j.success; }); })
      .then(function (ok) { if (ok) { try { localStorage.setItem(mk, '1'); } catch (e) {} } return ok; }).catch(function () { return false; });
  }

  function giftTxt(info) {
    var g = info.gift; if (!g) return '';
    if (!g.minis || !g.minis.length) return '';
    return 'CADEAUX À GLISSER DANS LE COLIS :\n' + g.minis.map(function (m) { return '- Mini N°' + m.no + ' ' + m.name + ' (' + m.rar + ')'; }).join('\n') + (g.gold ? '\n*** ZESTE DORÉ GAGNÉ : envoyer la carte cadeau de 20 € ***' : '');
  }
  var FIG = { '001': 'flocon', '002': 'zeste', '003': 'dodo', '004': 'flocon-noel', '005': 'zeste-pizzaiolo', '006': 'dodo-fantome', '007': 'zeste-dore', '008': 'flocon-neige', '009': 'zeste-renne', '010': 'dodo-nuit', '011': 'zeste-skieur', '012': 'flocon-ange', '013': 'trio-luge', '014': 'secret' };
  function figSrc(no) { return 'img/fig-' + no + '-' + (FIG[no] || 'secret') + '.webp'; }
  var COL_DEF = { chances: { l: 0.005, sr: 0.05, r: 0.2 }, figurines: { c: [['001', 'Flocon'], ['002', 'Zeste'], ['003', 'Dodo'], ['008', 'Flocon bonhomme de neige'], ['010', 'Dodo bonnet de nuit']], r: [['004', 'Flocon de Noël'], ['005', 'Zeste pizzaïolo'], ['009', 'Zeste renne'], ['011', 'Zeste skieur']], sr: [['006', 'Dodo fantôme'], ['012', 'Flocon ange'], ['013', 'Le trio en luge']], l: [['007', 'Zeste doré']] } };
  var colP = null;
  function loadCol() {
    if (!colP) colP = fetch('collection.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (c) { if (!c || !c.figurines || !c.chances) throw 0; return c; }).catch(function () { return COL_DEF; });
    return colP;
  }
  var RCOL = { c: '#FFFFFF', r: '#7DB7FF', sr: '#C79BFF', l: '#FFD24A' };
  // Une part par figurine, taille = sa vraie chance ; les petites parts sont réparties entre les grandes.
  function slices(col) {
    var F = col.figurines, P = col.chances, pr = { l: P.l || 0, sr: P.sr || 0, r: P.r || 0 };
    pr.c = 1 - pr.l - pr.sr - pr.r;
    var one = function (k) { return (F[k] || []).map(function (f) { return { no: f[0], name: f[1], r: k, p: (F[k].length ? pr[k] / F[k].length : 0) }; }); };
    var C = one('c'), R = one('r'), small = one('sr').concat(one('l')), others = [];
    while (R.length || small.length) { if (R.length) others.push(R.shift()); if (small.length) others.push(small.shift()); }
    var seq = [], per = C.length ? Math.ceil(others.length / C.length) : others.length;
    C.forEach(function (c) { seq.push(c); for (var k = 0; k < per && others.length; k++) seq.push(others.shift()); });
    seq = seq.concat(others).filter(function (s) { return s.p > 0; });
    var tot = seq.reduce(function (a, s) { return a + s.p; }, 0), a0 = 0;
    seq.forEach(function (s) { s.a0 = a0; s.a1 = a0 + s.p / tot * 360; a0 = s.a1; });
    return seq;
  }
  var NS = 'http://www.w3.org/2000/svg';
  function sv(t, a) { var n = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { n.setAttribute(k, a[k]); }); return n; }
  function pt(a, r) { var t = a * Math.PI / 180; return (r * Math.sin(t)).toFixed(2) + ' ' + (-r * Math.cos(t)).toFixed(2); }
  function pct(p) { return (Math.round(p * 1000) / 10).toString().replace('.', ',') + ' %'; }
  function drawWheel(seq) {
    var R = 128, svg = sv('svg', { viewBox: '-172 -172 344 344', class: 'wh-svg', role: 'img', 'aria-label': 'Roue des mini-figurines : chaque part a la taille de sa chance' });
    var defs = sv('defs', {}); svg.appendChild(defs);
    var g = sv('g', { class: 'wh-rot' }); svg.appendChild(g);
    g.appendChild(sv('circle', { r: R + 4, fill: '#141414' }));
    seq.forEach(function (s, i) {
      var big = s.a1 - s.a0 > 180 ? 1 : 0;
      s.path = sv('path', { d: 'M0 0 L' + pt(s.a0, R) + ' A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + pt(s.a1, R) + ' Z', fill: RCOL[s.r], stroke: '#141414', 'stroke-width': 1.6, class: 'wh-sl' });
      g.appendChild(s.path);
      var mid = (s.a0 + s.a1) / 2, w = s.a1 - s.a0, gi = sv('g', { transform: 'rotate(' + mid.toFixed(2) + ')' });
      if (w >= 14) {
        var rr = w > 40 ? 80 : 98, sz = Math.min(w > 40 ? 66 : 40, 2 * rr * Math.sin(w * Math.PI / 360) * 1.05);
        gi.appendChild(sv('image', { href: figSrc(s.no), x: -sz / 2, y: -rr - sz / 2, width: sz, height: sz, preserveAspectRatio: 'xMidYMid meet' }));
      } else {
        // part trop fine : médaillon au bord de la roue, aligné sur sa part
        var id = 'whc' + i, cy = -(R + 22), rad = s.r === 'l' ? 17 : 15;
        var cp = sv('clipPath', { id: id }); cp.appendChild(sv('circle', { cx: 0, cy: cy, r: rad - 2 })); defs.appendChild(cp);
        gi.appendChild(sv('path', { d: 'M0 ' + (-R + 2) + ' L0 ' + (cy + rad), stroke: '#141414', 'stroke-width': 2 }));
        gi.appendChild(sv('circle', { cx: 0, cy: cy, r: rad, fill: RCOL[s.r], stroke: s.r === 'l' ? '#B07D00' : '#141414', 'stroke-width': 2.5 }));
        gi.appendChild(sv('image', { href: figSrc(s.no), x: -rad, y: cy - rad + 1, width: rad * 2, height: rad * 2 - 2, preserveAspectRatio: 'xMidYMid meet', 'clip-path': 'url(#' + id + ')' }));
      }
      g.appendChild(gi);
    });
    g.appendChild(sv('circle', { r: 20, fill: '#FFC61A', stroke: '#141414', 'stroke-width': 3 }));
    g.appendChild(sv('circle', { r: 6, fill: '#141414' }));
    svg.appendChild(sv('path', { d: 'M-13 -170 L13 -170 L0 -138 Z', fill: '#141414', stroke: '#FFFDF6', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    return { svg: svg, g: g };
  }
  function legend(seq) {
    var by = {}; seq.forEach(function (s) { (by[s.r] = by[s.r] || s); });
    var ul = el('ul', { class: 'wh-leg' });
    [['c', 'Commune'], ['r', 'Rare'], ['sr', 'Super rare'], ['l', 'Légendaire']].forEach(function (k) {
      if (!by[k[0]]) return; ul.appendChild(el('li', { class: 'wk-' + k[0] }, [el('i', {}), el('span', { text: k[1] + ' : ' + pct(by[k[0]].p) + (k[0] === 'l' ? '' : ' chacune') })]));
    });
    return ul;
  }

  function wheel(g) {
    var box = el('div', { class: 'wh' });
    if (!g || !g.minis || !g.minis.length) return el('span');
    var n = g.minis.length, i = 0, rot = 0;
    box.appendChild(el('p', { class: 'wh-h', text: '🎁 Vous avez gagné ' + (n > 1 ? n + ' mini-figurines' : 'une mini-figurine') + ' ! Tournez la roue pour découvrir ' + (n > 1 ? 'lesquelles' : 'laquelle') + '.' }));
    var stage = el('div', { class: 'wh-stage' }); box.appendChild(stage);
    var btn = el('button', { type: 'button', class: 'btn btn-y wh-go', text: 'Tourner la roue' + (n > 1 ? ' (1/' + n + ')' : '') }), res = el('ul', { class: 'wh-res' });
    btn.disabled = true; box.appendChild(btn); box.appendChild(res);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, seq = [], W = null, last = null;
    loadCol().then(function (col) {
      seq = slices(col); W = drawWheel(seq); stage.appendChild(W.svg); box.insertBefore(legend(seq), btn); btn.disabled = false;
    });
    btn.addEventListener('click', function () {
      if (i >= n || !W) return; var m = g.minis[i]; btn.disabled = true;
      if (last) last.classList.remove('wh-win');
      var s = seq.filter(function (x) { return x.no === m.no; })[0] || seq.filter(function (x) { return x.r === m.r; })[0] || seq[0];
      var target = s.a0 + (s.a1 - s.a0) * (0.3 + Math.random() * 0.4);
      rot += 360 * 5 + ((360 - target) - (rot % 360) + 360) % 360;
      W.g.style.transition = reduce ? 'none' : 'transform 4s cubic-bezier(.12,.7,.12,1)'; W.g.style.transform = 'rotate(' + rot + 'deg)';
      setTimeout(function () {
        s.path.classList.add('wh-win'); last = s.path;
        var li = el('li', { class: 'wh-card wk-' + m.r }, [el('img', { src: figSrc(m.no), alt: '' }), el('span', { class: 'wh-no', text: 'N°' + m.no }), el('b', { text: m.name }), el('span', { class: 'wh-rar', text: m.rar })]);
        res.appendChild(li); i++;
        if (m.r === 'l') box.appendChild(el('p', { class: 'wh-gold', text: '✨ INCROYABLE : vous avez trouvé l’unique Zeste doré ! Il vous sera envoyé avec une carte cadeau de 20 € à utiliser sur le site.' }));
        if (i < n) { btn.disabled = false; btn.textContent = 'Tourner encore (' + (i + 1) + '/' + n + ')'; } else { btn.remove(); box.appendChild(el('p', { class: 'wh-end', text: 'Vos figurines seront glissées dans votre colis.' })); }
      }, reduce ? 300 : 4100);
    });
    return box;
  }

  function showDone(info, mailed) {
    destroyCheckout(); inner.textContent = '';
    var wrap = el('div', { class: 'pay-ok' }, [
      el('b', { text: 'Paiement reçu, merci !' }),
      el('p', { text: 'Commande n° ' + info.orderNo + ' · ' + eur(info.totalCents) + '. Un reçu vous est envoyé par e-mail.' }),
      el('p', { text: 'On prépare l’aperçu 3D de votre pièce et on vous l’envoie avant de l’imprimer. Pour toute modification, écrivez-nous en indiquant votre numéro de commande.' }),
      mailed ? el('span') : el('p', { class: 'pay-msg', text: 'Votre paiement est bien enregistré. Si vous ne recevez pas de nouvelles sous 24 h, écrivez-nous avec ce numéro de commande.' }),
      wheel(info.gift)
    ]);
    var b = el('button', { type: 'button', class: 'btn btn-y', text: 'Terminer' });
    b.addEventListener('click', function () { closeDlg(); location.reload(); });
    wrap.appendChild(b); inner.appendChild(wrap); openDlg();
  }

  function finalize(sid) {
    inner.textContent = ''; inner.appendChild(el('p', { text: 'Vérification du paiement…' })); openDlg();
    return api('/status?session_id=' + encodeURIComponent(sid)).then(function (info) {
      if (!info.paid) { inner.textContent = ''; inner.appendChild(el('p', { text: 'Le paiement n’est pas terminé. Vous pouvez recommencer depuis votre panier.' })); return; }
      try { localStorage.setItem(CART_KEY, '[]'); } catch (e) {}
      return sendMail(info, sid).then(function (ok) { showDone(info, ok); });
    }).catch(function () { inner.textContent = ''; inner.appendChild(el('p', { text: 'Impossible de vérifier le paiement pour l’instant. Si vous avez payé, écrivez-nous avec votre reçu Stripe.' })); });
  }

  go.addEventListener('click', function () {
    msg.textContent = '';
    var name = ($('c-name').value || '').trim(), email = ($('c-email').value || '').trim(), tel = ($('c-tel').value || '').trim();
    if (!name) { msg.textContent = 'Écrivez votre prénom et votre nom.'; $('c-name').focus(); return; }
    if (!email && !tel) { msg.textContent = 'Ajoutez un e-mail ou un téléphone.'; $('c-email').focus(); return; }
    if (!$('pay-cgv').checked) { msg.textContent = 'Cochez la case des conditions de vente pour payer.'; return; }
    var cart = readCart(); if (!cart.length) { msg.textContent = 'Votre panier est vide.'; return; }
    var delivery = 'livraison';
    go.disabled = true; var old = go.textContent; go.textContent = 'Préparation du paiement…';
    api('/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      items: cart, name: name, email: email, tel: tel, more: ($('c-more').value || '').trim(), delivery: delivery }) })
      .then(function (s) {
        inner.textContent = '';
        var x = el('button', { type: 'button', class: 'icon-btn pay-x', 'aria-label': 'Fermer', text: '×' });
        x.addEventListener('click', closeDlg);
        inner.appendChild(x);
        inner.appendChild(el('h3', { text: 'Paiement sécurisé · ' + eur(s.totalCents) }));
        inner.appendChild(el('div', { id: 'pay-mount' })); openDlg();
        return loadStripe().then(function (S) {
          var sid = s.clientSecret.split('_secret_')[0];
          return S(cfg.pk).initEmbeddedCheckout({ clientSecret: s.clientSecret, onComplete: function () { finalize(sid); } });
        }).then(function (c) { checkout = c; c.mount('#pay-mount'); });
      })
      .catch(function (e) { closeDlg(); msg.textContent = e.message || 'Paiement indisponible.'; })
      .then(function () { go.disabled = false; go.textContent = old; refreshBtn(); });
  });

  // retour après un paiement qui passe par une autre page (banque, etc.)
  var q = new URLSearchParams(location.search);
  if (q.get('paiement') === 'ok' && /^cs_(test|live)_/.test(q.get('session_id') || '')) {
    var sid = q.get('session_id'); history.replaceState(null, '', location.pathname + location.hash); finalize(sid);
  }
})();
