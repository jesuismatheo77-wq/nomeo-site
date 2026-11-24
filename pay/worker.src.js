// Noméo – serveur de paiement (Cloudflare Worker + Stripe Embedded Checkout)
// Le navigateur envoie seulement : quoi, combien, options. Les PRIX sont recalculés ici.
// Variables à définir dans Cloudflare (Settings > Variables and Secrets) :
//   STRIPE_SECRET_KEY  (secret)   sk_test_... puis sk_live_...
//   STRIPE_PUBLISHABLE_KEY        pk_test_... puis pk_live_...
//   SHIP_COLIS_CENTS   (optionnel) frais d'envoi colis en centimes, défaut 490
//   ALLOWED_ORIGINS    (optionnel) origines autorisées, séparées par des virgules
const CATALOG = /*CATALOG*/{};
const { B, Y, H, PACKS, TIERS, ZO, COLORS, IDS } = CATALOG;
const DEFAULT_ORIGINS = ['https://nomeo-atelier.com', 'https://www.nomeo-atelier.com'];
const MAX_LINES = 40, MAX_QTY = 999;

// ---------- prix (mêmes règles que le site) ----------
const r2 = x => Math.round(x * 100) / 100;
const key = (id, sz) => { const s = Y[id]; return s && sz && sz !== s[0].k ? id + ':' + sz : id; };
const tierIdx = q => { let t = 0; TIERS.forEach((n, i) => { if (q >= n) t = i; }); return t; };
const unitPrice = (k, q) => { const a = B[k]; return a ? a[tierIdx(q)] : null; };
const clampQty = (id, q) => {
  let n = parseInt(q, 10); if (!(n >= 1)) n = 1; n = Math.min(n, MAX_QTY);
  const h = H[id] || {}; if (h.qmin) n = Math.max(h.qmin, n); if (h.qmax) n = Math.min(h.qmax, n); return n;
};
function packOf(title) { return PACKS.find(p => p.t === title); }
function packFacts(p) { // prix barré et prix du pack, comme sur le site
  let full = 0, sum = 0;
  p.items.forEach(n => { const u = unitPrice(key(n[0], n[1]), n[2]); full += u * n[2]; sum += u * n[2] - r2(u * n[2] * ZO); });
  const price = p.fix || r2((Math.floor(sum + 1e-9) - .01));
  return { full, price, disc: r2(full - price) };
}
function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function colorName(k) { return COLORS[k] || (/^[0-9a-fA-F]{6}$/.test(k) ? '#' + k.toUpperCase() : null); }
function cleanCombo(c) {
  if (typeof c !== 'string') return null; const p = c.split('-');
  if (p.length !== 2 || !colorName(p[0]) || !colorName(p[1])) return null;
  return p[0] + '-' + p[1];
}
function normalize(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Err('Panier vide.');
  if (raw.length > MAX_LINES) throw new Err('Panier trop grand pour le paiement en ligne. Envoyez-nous la commande par message.');
  const lines = raw.map(it => {
    const id = String(it && it.id || '');
    if (id === 'creation') throw new Err('Les créations sur mesure se commandent sur devis : utilisez « Envoyer ma commande ».');
    if (!IDS.includes(id) || !B[id]) throw new Err('Article inconnu ou sur devis : ' + cleanText(id, 40));
    const sz = Y[id] ? (Y[id].some(s => s.k === it.sz) ? it.sz : Y[id][0].k) : '';
    const k = key(id, sz); if (!B[k]) throw new Err('Article sur devis : ' + id);
    const h = H[id] || {};
    return {
      id, k, sz, qty: clampQty(id, it.qty), text: cleanText(it.text, h.ml || 40), fo: cleanText(it.fo, 20),
      dg: id === 'noel-boule' && ['1', '2', '3'].includes(String(it.dg)) ? String(it.dg) : '',
      combo: cleanCombo(it.combo) || '', pda: it.pda > 0 && it.pda < 1000 ? r2(Number(it.pda)) : 0,
      pq: it.pda > 0 ? Math.max(1, parseInt(it.pq, 10) || 1) : 0, pn: cleanText(it.pn, 40)
    };
  });
  return lines;
}
function priceCart(lines) {
  const kq = {}; lines.forEach(l => { kq[l.k] = (kq[l.k] || 0) + l.qty; });
  // remises de packs : vérifiées contre les définitions
  const groups = {};
  lines.forEach(l => { if (l.pda > 0) (groups[l.pn] = groups[l.pn] || []).push(l); });
  Object.keys(groups).forEach(title => {
    const p = packOf(title); if (!p) throw new Err('Remise de pack inconnue.');
    const need = {}; p.items.forEach(n => { const k = key(n[0], n[1]); need[k] = (need[k] || 0) + n[2]; });
    const got = {}; let disc = 0;
    groups[title].forEach(l => { got[l.k] = (got[l.k] || 0) + l.pq; disc += l.pda; });
    const ks = Object.keys(need), m = got[ks[0]] / need[ks[0]];
    if (!(m >= 1) || m !== Math.floor(m) || ks.some(k => got[k] !== need[k] * m) || Object.keys(got).length !== ks.length)
      throw new Err('Remise de pack non valide : recomposez le pack.');
    if (Math.abs(disc - m * packFacts(p).disc) > 0.05) throw new Err('Remise de pack non valide : recomposez le pack.');
  });
  return lines.map(l => {
    const u = unitPrice(l.k, kq[l.k]);
    const gross = u * l.qty;
    const gt = l.pda && l.pq ? Math.min(r2(l.pda * Math.min(l.qty, l.pq) / l.pq), gross) : 0;
    const cents = Math.round((gross - gt) * 100);
    return { ...l, unit: u, cents, disc: gt };
  });
}
const eur = c => (c / 100).toFixed(2).replace('.', ',') + ' €';
const comboTxt = c => c ? c.split('-').map(colorName).join(' et ') : '';
function lineTitle(l) {
  const h = H[l.id], s = Y[l.id] && Y[l.id].find(x => x.k === l.sz);
  return h.t + (s ? ' (' + s.l.toLowerCase() + ', ' + s.d + ')' : '');
}
function lineDetail(l) {
  return [comboTxt(l.combo), l.text ? '« ' + l.text + ' »' : '', l.fo ? 'police ' + l.fo : '', l.dg ? 'design ' + l.dg : '', l.pn ? 'remise ' + l.pn : ''].filter(Boolean).join(' · ');
}

// ---------- Stripe ----------
function form(o, p = '', out = []) {
  Object.keys(o).forEach(k => { const v = o[k], n = p ? p + '[' + k + ']' : k;
    if (v === undefined || v === null) return;
    if (typeof v === 'object') form(v, n, out); else out.push(encodeURIComponent(n) + '=' + encodeURIComponent(v)); });
  return out;
}
async function stripe(env, method, path, body) {
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method, headers: Object.assign({ Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}), body: body ? form(body).join('&') : undefined });
  const j = await r.json();
  if (!r.ok) { console.log('stripe error', JSON.stringify(j.error));
    const e = new Err('Paiement indisponible pour le moment. Réessayez ou envoyez la commande par message.' + (j.error && j.error.message ? ' (détail technique : ' + String(j.error.message).slice(0, 160) + ')' : ''), 502);
    e.stripeMsg = (j.error && j.error.message) || ''; throw e; }
  return j;
}
class Err extends Error { constructor(m, s = 400) { super(m); this.status = s; } }
const chunks = (s, n = 480) => { const a = []; for (let i = 0; i < s.length; i += n) a.push(s.slice(i, i + n)); return a; };
function orderNo() { const d = new Date(); return 'NM-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(); }

async function createSession(env, req, origin) {
  const b = await req.json().catch(() => { throw new Err('Requête invalide.'); });
  const lines = priceCart(normalize(b.items));
  const name = cleanText(b.name, 80), email = cleanText(b.email, 120), tel = cleanText(b.tel, 30), more = cleanText(b.more, 400);
  if (!name) throw new Err('Indiquez votre prénom et votre nom.');
  if (!email && !tel) throw new Err('Indiquez un e-mail ou un téléphone.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err('Cet e-mail semble incomplet.');
  const colis = b.delivery === 'colis';
  const no = orderNo();
  const ship = parseInt(env.SHIP_COLIS_CENTS || '490', 10);
  const compact = lines.map(l => [l.qty, l.id, l.sz, l.combo, l.text, l.fo, l.dg, l.cents, l.pn].join('|')).join('\n');
  const meta = { order_no: no, name, tel, delivery: colis ? 'colis' : 'main-propre', more };
  chunks(compact).slice(0, 45).forEach((c, i) => { meta['l' + i] = c; });
  const params = {
    ui_mode: 'embedded', mode: 'payment', locale: 'fr', redirect_on_completion: 'if_required',
    return_url: origin + '/?paiement=ok&session_id={CHECKOUT_SESSION_ID}',
    client_reference_id: no, customer_email: email || undefined, metadata: meta,
    payment_intent_data: { description: 'Noméo ' + no, metadata: { order_no: no } },
    line_items: lines.map(l => ({ quantity: 1, price_data: { currency: 'eur', unit_amount: l.cents,
      product_data: { name: (l.qty > 1 ? l.qty + ' × ' : '') + lineTitle(l), description: lineDetail(l) || undefined } } })),
    shipping_address_collection: colis ? { allowed_countries: ['FR'] } : undefined,
    shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', display_name: colis ? 'Envoi en colis' : 'Remise en main propre',
      fixed_amount: { amount: colis ? ship : 0, currency: 'eur' } } }],
    custom_text: { submit: { message: 'Aucune pièce n’est imprimée avant votre aperçu 3D. Avant l’impression, vous pouvez modifier ou annuler sur simple message.' } },
  };
  // Les versions récentes de l'API Stripe nomment ce mode « embedded_page » : on essaie les deux.
  let s;
  try { s = await stripe(env, 'POST', '/checkout/sessions', params); }
  catch (e) {
    if (e.stripeMsg && /ui_mode/i.test(e.stripeMsg)) s = await stripe(env, 'POST', '/checkout/sessions', { ...params, ui_mode: 'embedded_page' });
    else throw e;
  }
  const total = lines.reduce((a, l) => a + l.cents, 0) + (colis ? ship : 0);
  return { clientSecret: s.client_secret, orderNo: no, totalCents: total, shipCents: colis ? ship : 0, summary: lines.map(l => ({ qty: l.qty, title: lineTitle(l), cents: l.cents })) };
}

async function status(env, sid) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid || '')) throw new Err('Session inconnue.');
  const s = await stripe(env, 'GET', '/checkout/sessions/' + sid);
  const paid = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
  const m = s.metadata || {}; let raw = ''; for (let i = 0; i < 45 && m['l' + i]; i++) raw += m['l' + i];
  const rows = raw ? raw.split('\n').map(r => r.split('|')) : [];
  const msg = rows.map(r => '- ' + r[0] + ' × ' + (H[r[1]] ? H[r[1]].t : r[1]) + (r[2] ? ' (taille ' + r[2] + ')' : '') +
    (r[3] ? ' · ' + comboTxt(r[3]) : '') + (r[4] ? ' · texte « ' + r[4] + ' »' : '') + (r[5] ? ' · police ' + r[5] : '') + (r[6] ? ' · design ' + r[6] : '') +
    (r[8] ? ' · remise ' + r[8] : '') + ' : ' + eur(+r[7])).join('\n');
  const sd = s.collected_information && s.collected_information.shipping_details || s.shipping_details;
  const addr = sd && sd.address ? [sd.name, sd.address.line1, sd.address.line2, sd.address.postal_code, sd.address.city].filter(Boolean).join(', ') : '';
  return { paid, orderNo: m.order_no || '', name: m.name || '', tel: m.tel || '', email: (s.customer_details && s.customer_details.email) || s.customer_email || '',
    delivery: m.delivery || '', more: m.more || '', address: addr, totalCents: s.amount_total, message: msg };
}

// ---------- dépôt de fichiers 3D (Cloudflare KV, variable FILES) ----------
const FILE_MAX = 25 * 1024 * 1024, FILE_TTL = 90 * 86400;
const FILE_EXT = ['stl', '3mf', 'obj', 'step', 'stp', 'ply', 'amf', 'zip'];
async function upload(env, req, base) {
  if (!env.FILES) throw new Err('Le dépôt de fichiers n’est pas encore activé.', 503);
  if (+(req.headers.get('content-length') || 0) > FILE_MAX + 200000) throw new Err('Fichier trop lourd (25 Mo maximum).', 413);
  const fd = await req.formData();
  const f = fd.get('file');
  if (!f || typeof f === 'string') throw new Err('Aucun fichier reçu.');
  const name = cleanText(f.name, 120) || 'fichier';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!FILE_EXT.includes(ext)) throw new Err('Format non accepté : envoyez un fichier STL, 3MF, OBJ, STEP ou ZIP.');
  if (!f.size || f.size > FILE_MAX) throw new Err('Fichier vide ou trop lourd (25 Mo maximum).', 413);
  const id = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  await env.FILES.put(id, await f.arrayBuffer(), { expirationTtl: FILE_TTL, metadata: { name, size: f.size } });
  return { url: base + '/f/' + id, name, size: f.size };
}
async function download(env, id) {
  if (!env.FILES || !/^[0-9a-f]{40}$/.test(id)) return new Response('Fichier introuvable.', { status: 404 });
  const r = await env.FILES.getWithMetadata(id, 'arrayBuffer');
  if (!r || !r.value) return new Response('Fichier introuvable ou expiré.', { status: 404 });
  const name = (r.metadata && r.metadata.name || 'fichier').replace(/["\\]/g, '');
  return new Response(r.value, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="' + name + '"; filename*=UTF-8\'\'' + encodeURIComponent(name), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

// ---------- HTTP ----------
export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(x => x.trim()) : DEFAULT_ORIGINS);
    const okOrigin = allowed.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0], 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
    const send = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname.startsWith('/f/') && req.method === 'GET') return await download(env, url.pathname.slice(3));
      if (url.pathname === '/upload' && req.method === 'POST') {
        if (!okOrigin) throw new Err('Origine non autorisée.', 403);
        return send(await upload(env, req, url.origin));
      }
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY) throw new Err('Paiement non configuré.', 503);
      if (!okOrigin) throw new Err('Origine non autorisée.', 403);
      if (url.pathname === '/config' && req.method === 'GET') return send({ pk: env.STRIPE_PUBLISHABLE_KEY, shipColisCents: parseInt(env.SHIP_COLIS_CENTS || '490', 10) });
      if (url.pathname === '/session' && req.method === 'POST') {
        if (+(req.headers.get('content-length') || 0) > 30000) throw new Err('Requête trop grande.', 413);
        return send(await createSession(env, req, origin));
      }
      if (url.pathname === '/status' && req.method === 'GET') return send(await status(env, url.searchParams.get('session_id')));
      return send({ error: 'Introuvable.' }, 404);
    } catch (e) {
      return send({ error: e instanceof Err ? e.message : 'Erreur serveur.' }, e instanceof Err ? e.status : 500);
    }
  }
};
export { normalize, priceCart, packFacts };
