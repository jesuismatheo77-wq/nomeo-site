/* Noméo – paiement en ligne (Stripe Embedded Checkout).
   Lit le panier du site (localStorage), demande une session de paiement au serveur
   (qui recalcule les prix), affiche le paiement dans la page, puis envoie la commande par e-mail.
   Tant que PAY_API n'est pas renseigné, ce fichier ne fait rien : le site garde son fonctionnement actuel. */
(function () {
  'use strict';
  var PAY_API = '';                         // ex. https://nomeo-pay.compte.workers.dev (sans « / » final)
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
    '#pay-dlg{border:0;border-radius:18px;padding:0;width:min(560px,calc(100vw - 20px));max-height:92vh;overflow:auto;background:var(--white,#fff);color:var(--ink,#16181b)}' +
    '#pay-dlg::backdrop{background:var(--scrim,rgba(20,20,20,.55))}' +
    '.pay-in{padding:16px 16px 20px;display:grid;gap:12px}.pay-in h3{margin:0;font-size:1.15rem}' +
    '.pay-x{justify-self:end}.pay-ok{display:grid;gap:10px}.pay-ok b{font-size:1.1rem}';
  document.head.appendChild(st);

  // ---------- interface dans le panier ----------
  var act = form.querySelector('.cart-act'), send = $('c-send');
  var box = el('fieldset', { class: 'pay-box' }, [el('legend', { text: 'Réception de la commande' })]);
  var lMain = el('label', {}, [el('input', { type: 'radio', name: 'pay-deliv', value: 'main', checked: '' }), el('span', { text: 'Remise en main propre : gratuit' })]);
  var lColis = el('label', {}, [el('input', { type: 'radio', name: 'pay-deliv', value: 'colis' }), el('span', { id: 'pay-colis-t', text: 'Envoi en colis' })]);
  var cgvA = el('button', { type: 'button', class: 'text-btn', 'data-legal': 'cgv', text: 'conditions de vente' });
  var lCgv = el('label', {}, [el('input', { type: 'checkbox', id: 'pay-cgv' }), el('span', {}, [document.createTextNode('J’ai lu et j’accepte les '), cgvA])]);
  var go = el('button', { type: 'button', class: 'btn btn-y', id: 'pay-go', text: 'Payer en ligne' });
  var msg = el('p', { class: 'pay-msg', id: 'pay-msg', role: 'status' });
  [lMain, lColis, lCgv, go, msg].forEach(function (n) { box.appendChild(n); });
  act.parentNode.insertBefore(box, act);
  var fine = [].slice.call(form.querySelectorAll('.cart-fine')).filter(function (p) { return /paiement en ligne arrive/i.test(p.textContent); })[0];
  if (fine) fine.textContent = 'Paiement sécurisé par Stripe : carte, Apple Pay ou Google Pay. Avant l’impression, on vous envoie l’aperçu 3D de votre pièce, et vous pouvez modifier ou annuler sur simple message. Pour une création sur mesure ou un devis, utilisez « Envoyer ma commande ».';
  document.documentElement.classList.add('pay-on');

  function totalText() { var t = $('cart-total'); return t ? t.textContent : ''; }
  function refreshBtn() { var s = totalText(); go.textContent = 'Payer en ligne' + (s && s !== '0,00 €' && s !== '0,00 €' ? ' · ' + s : ''); }
  var tot = $('cart-total'); if (tot && window.MutationObserver) new MutationObserver(refreshBtn).observe(tot, { childList: true, characterData: true, subtree: true });
  refreshBtn();
  api('/config').then(function (c) { cfg = c; $('pay-colis-t').textContent = 'Envoi en colis : ' + eur(c.shipColisCents); }).catch(function () { box.hidden = true; document.documentElement.classList.remove('pay-on'); });

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
      'Total payé : ' + eur(info.totalCents), 'Réception : ' + (info.delivery === 'colis' ? 'envoi en colis' : 'remise en main propre'),
      info.address ? 'Adresse : ' + info.address : '', '', 'Nom : ' + info.name, info.email ? 'E-mail : ' + info.email : '', info.tel ? 'Téléphone : ' + info.tel : '',
      info.more ? 'Remise, remarques : ' + info.more : '', '', 'Paiement Stripe : ' + sid].filter(function (x, i, a) { return x !== '' || a[i - 1] !== ''; }).join('\n');
    var payload = { access_key: MAIL_KEY, subject: 'Commande payée Noméo ' + info.orderNo + ' : ' + info.name, from_name: 'Site Noméo', name: info.name, phone: info.tel || '', message: body };
    if (info.email) payload.email = info.email;
    return fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j.success; }); })
      .then(function (ok) { if (ok) { try { localStorage.setItem(mk, '1'); } catch (e) {} } return ok; }).catch(function () { return false; });
  }

  function showDone(info, mailed) {
    destroyCheckout(); inner.textContent = '';
    var wrap = el('div', { class: 'pay-ok' }, [
      el('b', { text: 'Paiement reçu, merci !' }),
      el('p', { text: 'Commande n° ' + info.orderNo + ' · ' + eur(info.totalCents) + '. Un reçu vous est envoyé par e-mail.' }),
      el('p', { text: 'On prépare l’aperçu 3D de votre pièce et on vous l’envoie avant de l’imprimer. Pour toute modification, écrivez-nous en indiquant votre numéro de commande.' }),
      mailed ? el('span') : el('p', { class: 'pay-msg', text: 'Votre paiement est bien enregistré. Si vous ne recevez pas de nouvelles sous 24 h, écrivez-nous avec ce numéro de commande.' })
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
    var delivery = (form.querySelector('input[name="pay-deliv"]:checked') || {}).value || 'main';
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
