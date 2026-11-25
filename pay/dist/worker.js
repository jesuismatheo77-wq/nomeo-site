// Noméo – serveur de paiement (Cloudflare Worker + Stripe Embedded Checkout)
// Le navigateur envoie seulement : quoi, combien, options. Les PRIX sont recalculés ici.
// Variables à définir dans Cloudflare (Settings > Variables and Secrets) :
//   STRIPE_SECRET_KEY  (secret)   sk_test_... puis sk_live_...
//   STRIPE_PUBLISHABLE_KEY        pk_test_... puis pk_live_...
//   (les frais de livraison se règlent dans livraison.json sur le site)
//   DEPART_LAT, DEPART_LON  point de départ de la remise en main propre (reste privé)
//   ALLOWED_ORIGINS    (optionnel) origines autorisées, séparées par des virgules
const CATALOG = {"B":{"sous-verre":[5.99,4.99,4.99,4.99,4.99],"porte-cles":[3.99,2.39,2.19,2.19,1.99],"medaille":[4.99,3.99,3.99,2.99,2.99],"plaque":[5.99,4.99,3.99,3.99,3.99],"noel-boule":[4.99,3.99,3.99,2.99,2.99],"noel-boule:m":[6.99,5.99,4.99,4.99,4.99],"noel-boule:l":[10.99,9.99,7.99,7.99,6.99],"noel-boule-logo":[5.99,4.99,4.99,4.99,3.99],"noel-boule-logo:m":[8.99,7.99,5.99,5.99,4.99],"noel-boule-logo:l":[10.99,9.99,9.99,8.99,7.99],"logo-pc":[3.99,2.99,2.39,2.29,2.19],"logo-pc:m":[4.99,3.99,2.99,2.99,2.99],"logo-pc:l":[5.99,4.99,4.99,3.99,3.99],"logo-resine":[14.99,12.99,11.99,10.99,10.99],"logo-resine:m":[29.99,26.99,24.99,22.99,21.99],"logo-resine:l":[59.99,54.99,49.99,46.99,44.99],"logo-simple":[3.99,2.99,2.99,2.39,2.39],"logo-simple:m":[5.99,4.99,4.99,3.99,3.99],"logo-simple:l":[10.99,9.99,7.99,7.99,7.99],"noel-etoile":[3.99,2.99,2.99,2.39,2.39],"noel-etoile:m":[5.99,4.99,4.99,3.99,3.99],"noel-etoile:l":[7.99,6.99,5.99,4.99,4.99],"noel-sapin":[3.99,2.99,2.99,2.39,2.39],"noel-sapin:m":[5.99,4.99,4.99,3.99,3.99],"noel-sapin:l":[7.99,6.99,5.99,4.99,4.99],"noel-calendrier":[30.99,29.99,28.99,26.99,25.99],"noel-bonhomme-art":[13.99,12.99,10.99,10.99,10.99],"noel-pere-noel":[17.99,16.99,15.99,15.99,14.99],"noel-lutin":[13.99,12.99,10.99,10.99,10.99],"noel-boule-bonhomme":[9.99,8.99,8.99,7.99,6.99],"noel-boule-pere-noel":[9.99,8.99,8.99,7.99,6.99],"noel-cheminee":[15.99,14.99,13.99,13.99,12.99],"noel-orn-sapin":[4.99,3.99,3.99,3.99,2.99],"noel-orn-flocon":[4.99,3.99,3.99,3.99,2.99],"noel-orn-cloche":[4.99,3.99,3.99,3.99,2.99],"noel-orn-canne":[4.99,3.99,3.99,3.99,2.99],"noel-orn-houx":[4.99,3.99,3.99,3.99,2.99],"noel-orn-renne":[4.99,3.99,3.99,3.99,2.99],"noel-orn-comete":[4.99,3.99,3.99,3.99,2.99],"noel-cadeau":[13.99,12.99,12.99,11.99,10.99],"noel-cadeau:m":[23.99,22.99,21.99,20.99,19.99],"noel-cadeau:l":[35.99,34.99,33.99,32.99,31.99],"noel-essuie-tout":[25.99,24.99,24.99,24.99,23.99],"noel-cheminee-deco":[18.99,17.99,16.99,16.99,15.99],"noel-sous-verres":[18.99,17.99,16.99,16.99,15.99],"noel-boule-neige":[15.99,14.99,13.99,13.99,12.99],"noel-bougeoir":[13.99,12.99,10.99,10.99,10.99],"noel-mini-bonnets":[0.9975,0.89,0.85,0.79,0.75],"noel-orn-bonhomme":[10.99,9.99,9.99,9.99,8.99],"noel-orn-pere-noel":[10.99,9.99,9.99,9.99,8.99],"noel-bonhomme":[5.99,4.99,4.99,4.99,4.99],"noel-bonhomme:m":[9.99,8.99,7.99,6.99,6.99],"noel-bonhomme:l":[11.99,9.99,8.99,8.99,8.99],"c-coeurduo":[3.99,2.99,2.99,2.99,2.99],"c-coeurduo:m":[4.99,3.99,2.99,2.99,2.99],"c-coeurduo:l":[5.99,4.99,3.99,3.99,3.99],"c-coeur":[3.99,2.99,2.99,2.99,2.99],"c-coeur:m":[5.99,4.99,3.99,3.99,3.99],"c-coeur:l":[5.99,4.99,4.99,4.99,4.99],"c-duo":[7.99,6.99,5.99,5.99,5.99],"c-lampe":[7.99,6.99,6.99,6.99,5.99],"c-lampe:m":[10.99,9.99,8.99,8.99,8.99],"c-lampe:l":[10.99,8.99,7.99,7.99,7.99],"c-magnet":[3.99,2.99,2.99,2.39,2.39],"c-magnet:m":[4.99,3.99,3.99,2.99,2.99],"c-magnet:l":[5.99,4.99,4.99,4.99,3.99],"c-magnetcoeur":[3.99,2.39,2.39,2.39,2.09],"c-magnetcoeur:m":[3.99,2.99,2.99,2.99,2.99],"c-magnetcoeur:l":[5.99,4.99,3.99,3.99,3.99],"j-puzzle":[6.99,5.99,5.99,5.99,5.99],"j-laby":[8.99,7.99,7.99,7.99,7.99],"j-animal":[6.99,5.99,5.99,5.99,5.99],"j-toupie":[5.99,4.99,4.99,4.99,4.99],"noel-etiquette":[3.99,2.39,2.29,2.19,2.19],"noel-etiquette:m":[4.99,3.99,3.99,2.99,2.99],"noel-etiquette:l":[6.99,5.99,4.99,4.99,4.99],"noel-cimier":[11.99,10.99,9.99,9.99,8.99],"g-casque":[13.99,12.99,10.99,10.99,9.99],"g-manette":[10.99,9.99,9.99,8.99,8.99],"marque-page":[3.99,2.99,2.99,2.39,2.39],"prenom-volume":[8.99,7.99,6.99,5.99,5.99],"prenom-volume:m":[10.99,9.99,9.99,8.99,8.99],"prenom-volume:l":[11.99,10.99,9.99,9.99,8.99],"tirelire":[13.99,12.99,10.99,10.99,9.99],"c-nounours":[15.99,14.99,13.99,12.99,12.99],"c-nounours-ballon":[17.99,16.99,15.99,15.99,14.99]},"Y":{"noel-boule":[{"k":"s","l":"Petite","d":"Ø 30 mm"},{"k":"m","l":"Moyenne","d":"Ø 45 mm"},{"k":"l","l":"Grande","d":"Ø 60 mm"}],"noel-etoile":[{"k":"s","l":"Petite","d":"76 mm"},{"k":"m","l":"Moyenne","d":"10 cm"},{"k":"l","l":"Grande","d":"13 cm"}],"noel-sapin":[{"k":"s","l":"Petit","d":"79 mm"},{"k":"m","l":"Moyen","d":"10 cm"},{"k":"l","l":"Grand","d":"13 cm"}],"noel-bonhomme":[{"k":"s","l":"Petit","d":"6,5 cm"},{"k":"m","l":"Moyen","d":"9 cm"},{"k":"l","l":"Grand","d":"12,5 cm"}],"c-coeurduo":[{"k":"s","l":"Petit","d":"5 cm"},{"k":"m","l":"Moyen","d":"6,5 cm"},{"k":"l","l":"Grand","d":"8 cm"}],"c-coeur":[{"k":"s","l":"Petit","d":"7 cm"},{"k":"m","l":"Moyen","d":"9 cm"},{"k":"l","l":"Grand","d":"11 cm"}],"c-lampe":[{"k":"s","l":"Petite","d":"8 cm"},{"k":"m","l":"Moyenne","d":"10 cm"},{"k":"l","l":"Grande","d":"12 cm"}],"c-magnet":[{"k":"s","l":"Petit","d":"5,5 cm"},{"k":"m","l":"Moyen","d":"7 cm"},{"k":"l","l":"Grand","d":"9 cm"}],"c-magnetcoeur":[{"k":"s","l":"Petit","d":"5 cm"},{"k":"m","l":"Moyen","d":"6,5 cm"},{"k":"l","l":"Grand","d":"8 cm"}],"noel-etiquette":[{"k":"s","l":"Petite","d":"72 mm"},{"k":"m","l":"Moyenne","d":"9,5 cm"},{"k":"l","l":"Grande","d":"12 cm"}],"noel-cadeau":[{"k":"s","l":"Petite","d":"10 cm"},{"k":"m","l":"Moyenne","d":"14 cm"},{"k":"l","l":"Grande","d":"18 cm"}],"noel-boule-logo":[{"k":"s","l":"Petite","d":"Ø 30 mm"},{"k":"m","l":"Moyenne","d":"Ø 45 mm"},{"k":"l","l":"Grande","d":"Ø 60 mm"}],"logo-pc":[{"k":"s","l":"Petit","d":"18 mm"},{"k":"m","l":"Moyen","d":"27 mm"},{"k":"l","l":"Grand","d":"40 mm"}],"logo-resine":[{"k":"s","l":"Petit","d":"cube 4 cm"},{"k":"m","l":"Moyen","d":"cube 6 cm"},{"k":"l","l":"Grand","d":"cube 8 cm"}],"logo-simple":[{"k":"s","l":"Petit","d":"30 mm"},{"k":"m","l":"Moyen","d":"50 mm"},{"k":"l","l":"Grand","d":"80 mm"}],"prenom-volume":[{"k":"s","l":"Petit","d":"10 cm de large"},{"k":"m","l":"Moyen","d":"14 cm"},{"k":"l","l":"Grand","d":"17 cm"}]},"H":{"noel-boule":{"q":1,"logo":false,"toy":false,"t":"Boule de Noël","one":"boule de Noël","many":"boules de Noël","ml":0},"noel-etoile":{"q":1,"logo":false,"toy":false,"t":"Étoile de Noël","one":"étoile de Noël","many":"étoiles de Noël","ml":0},"noel-calendrier":{"q":1,"logo":false,"toy":false,"t":"Calendrier de l’Avent","one":"calendrier de l’Avent","many":"calendriers de l’Avent","ml":10},"noel-pere-noel":{"q":1,"logo":false,"toy":false,"t":"Père Noël","one":"Père Noël","many":"Pères Noël","ml":10},"noel-orn-bonhomme":{"q":1,"logo":false,"toy":false,"t":"Ornement bonhomme de neige","one":"ornement bonhomme de neige","many":"ornements bonhomme de neige","ml":9},"noel-mini-bonnets":{"q":4,"qmin":4,"qmax":20,"logo":false,"toy":false,"t":"Mini bonnets de Père Noël","one":"mini bonnet de Père Noël","many":"mini bonnets","ml":20},"noel-bougeoir":{"q":1,"logo":false,"toy":false,"t":"Bougeoir Père Noël et sapin","one":"bougeoir de Noël","many":"bougeoirs de Noël","ml":12},"noel-orn-flocon":{"q":1,"logo":false,"toy":false,"t":"Ornement flocon","one":"ornement flocon","many":"ornements flocon","ml":9},"noel-orn-cloche":{"q":1,"logo":false,"toy":false,"t":"Ornement cloche","one":"ornement cloche","many":"ornements cloche","ml":9},"noel-orn-canne":{"q":1,"logo":false,"toy":false,"t":"Ornement canne à sucre","one":"ornement canne à sucre","many":"ornements canne à sucre","ml":9},"noel-orn-houx":{"q":1,"logo":false,"toy":false,"t":"Ornement houx","one":"ornement houx","many":"ornements houx","ml":9},"noel-cadeau":{"q":1,"logo":false,"toy":false,"t":"Grosse boîte cadeau","one":"boîte cadeau","many":"boîtes cadeau","ml":9},"noel-essuie-tout":{"q":1,"logo":false,"toy":false,"t":"Porte-essuie-tout bonnet de Père Noël","one":"porte-essuie-tout de Noël","many":"porte-essuie-tout de Noël","ml":10},"noel-cheminee-deco":{"q":1,"logo":false,"toy":false,"t":"Cheminée de Noël lumineuse","one":"cheminée de Noël lumineuse","many":"cheminées de Noël lumineuses","ml":12},"noel-sous-verres":{"q":1,"logo":false,"toy":false,"t":"Sous-verres de Noël avec support","one":"lot de 6 sous-verres de Noël","many":"lots de 6 sous-verres de Noël","ml":9},"noel-boule-neige":{"q":1,"logo":false,"toy":false,"t":"Boule à neige lumineuse","one":"boule à neige lumineuse","many":"boules à neige lumineuses","ml":12},"noel-cheminee":{"q":1,"logo":false,"toy":false,"t":"Boîte cheminée du Père Noël","one":"boîte cheminée","many":"boîtes cheminée","ml":12},"noel-lutin":{"q":1,"logo":false,"toy":false,"t":"Gnome de Noël","one":"gnome de Noël","many":"gnomes de Noël","ml":10},"noel-bonhomme":{"q":1,"logo":false,"toy":false,"t":"Bonhomme de neige 3D","one":"bonhomme de neige","many":"bonhommes de neige","ml":0},"noel-sapin":{"q":1,"logo":false,"toy":false,"t":"Sapin de Noël","one":"sapin de Noël","many":"sapins de Noël","ml":0},"noel-boule-logo":{"q":1,"logo":true,"toy":false,"t":"Boule de Noël à votre logo","one":"boule de Noël à votre logo","many":"boules de Noël à votre logo","ml":0},"noel-etiquette":{"q":1,"logo":false,"toy":false,"t":"Étiquette cadeau","one":"étiquette cadeau","many":"étiquettes cadeau","ml":0},"c-coeurduo":{"q":1,"logo":false,"toy":false,"t":"Collier cœur en deux morceaux","one":"collier cœur en deux morceaux","many":"colliers cœur en deux morceaux","ml":0},"c-coeur":{"q":1,"logo":false,"toy":false,"t":"Cœur gravé","one":"cœur gravé","many":"cœurs gravés","ml":0},"c-duo":{"q":1,"logo":false,"toy":false,"t":"Sous-verres d’amoureux","one":"duo de sous-verres","many":"duos de sous-verres","ml":0},"c-magnet":{"q":1,"logo":false,"toy":false,"t":"Magnet à votre texte","one":"magnet","many":"magnets","ml":0},"c-magnetcoeur":{"q":1,"logo":false,"toy":false,"t":"Magnet cœur","one":"magnet cœur","many":"magnets cœur","ml":0},"porte-cles":{"q":50,"logo":false,"toy":false,"t":"Porte-clés au logo","one":"porte-clés","many":"porte-clés","ml":0},"sous-verre":{"q":50,"logo":false,"toy":false,"t":"Sous-verres","one":"sous-verre","many":"sous-verres","ml":0},"logo-pc":{"q":1,"logo":true,"toy":false,"t":"Votre logo en porte-clés","one":"porte-clés à votre logo","many":"porte-clés à votre logo","ml":0},"logo-resine":{"q":1,"logo":true,"toy":false,"t":"Logo flottant en résine","one":"logo flottant en résine","many":"logos flottants en résine","ml":0},"logo-simple":{"q":1,"logo":true,"toy":false,"t":"Logo en volume","one":"logo en volume","many":"logos en volume","ml":0},"plaque":{"q":5,"logo":false,"toy":false,"t":"Plaque de porte","one":"plaque de porte","many":"plaques de porte","ml":0},"noel-cimier":{"q":1,"logo":false,"toy":false,"t":"Étoile de cimier","one":"étoile de cimier","many":"étoiles de cimier","ml":10},"g-casque":{"q":1,"logo":false,"toy":false,"t":"Support de casque gamer","one":"support de casque","many":"supports de casque","ml":12},"g-manette":{"q":1,"logo":false,"toy":false,"t":"Support de manette","one":"support de manette","many":"supports de manette","ml":12},"marque-page":{"q":1,"logo":false,"toy":false,"t":"Marque-page à son prénom","one":"marque-page","many":"marque-pages","ml":12},"prenom-volume":{"q":1,"logo":false,"toy":false,"t":"Prénom en volume","one":"prénom en volume","many":"prénoms en volume","ml":9},"tirelire":{"q":1,"logo":false,"toy":false,"t":"Tirelire cochon","one":"tirelire cochon","many":"tirelires cochon","ml":10},"c-nounours-ballon":{"q":1,"logo":false,"toy":false,"t":"Nounours au ballon cœur","one":"nounours au ballon cœur","many":"nounours au ballon cœur","ml":12},"c-nounours":{"q":1,"logo":false,"toy":false,"t":"Nounours à bougie LED","one":"nounours à bougie LED","many":"nounours à bougie LED","ml":12}},"PACKS":[{"k":"amoureux","t":"Pack Amoureux","fix":0,"items":[["c-coeurduo","s",1,"ab"],["c-duo","",1,"ab"],["c-nounours-ballon","",1,"ab"],["c-magnetcoeur","s",1,"a"],["c-magnetcoeur","s",1,"b"]],"two":true},{"k":"mariage","t":"Pack Mariage","fix":0,"items":[["c-magnet","s",30,"abd","c-magnet2"],["c-coeur","m",1,"abd"],["c-duo","",1,"ab"]],"two":true},{"k":"noel","t":"Pack Noël en famille","fix":0,"items":[["noel-boule","m",1,"s"],["noel-bonhomme","m",1,"s"],["noel-etoile","m",1,"s"],["noel-bougeoir","",1,"s"],["noel-mini-bonnets","",4,"n"],["noel-etiquette","s",1,"s"],["noel-etiquette","s",1,"s"],["noel-etiquette","s",1,"s"],["noel-etiquette","s",1,"s"]],"two":false},{"k":"chambre","t":"Pack Ma chambre","fix":0,"items":[["plaque","",1,"s"],["prenom-volume","m",1,"s"],["porte-cles","",1,"s"],["marque-page","",1,"s"],["c-magnet","s",1,"s"]],"two":false},{"k":"gamer","t":"Pack Gamer","fix":0,"items":[["g-casque","",1,"s"],["g-manette","",1,"s"],["porte-cles","",1,"s"],["sous-verre","",1,"s"]],"two":false}],"TIERS":[1,10,25,50,100],"ZO":0.3,"COLORS":{"jaune":"jaune tournesol","noir":"noir","blanc":"blanc","rouge":"rouge","bleu":"bleu","sapin":"vert bambou","orange":"orange","gris":"gris","rose":"rose","violet":"violet","turquoise":"turquoise","marron":"marron","bordeaux":"bordeaux","beige":"beige","dore":"doré","argent":"argent","vertclair":"vert clair","marine":"bleu marine"},"IDS":["noel-boule","noel-etoile","noel-calendrier","noel-pere-noel","noel-orn-bonhomme","noel-mini-bonnets","noel-bougeoir","noel-orn-flocon","noel-orn-cloche","noel-orn-canne","noel-orn-houx","noel-cadeau","noel-essuie-tout","noel-cheminee-deco","noel-sous-verres","noel-boule-neige","noel-cheminee","noel-lutin","noel-bonhomme","noel-sapin","noel-boule-logo","noel-etiquette","c-coeurduo","c-coeur","c-duo","c-magnet","c-magnetcoeur","porte-cles","sous-verre","logo-pc","logo-resine","logo-simple","plaque","noel-cimier","g-casque","g-manette","marque-page","prenom-volume","tirelire","c-nounours-ballon","c-nounours"]};
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
  const L = await loadShip(env);
  const pieces = lines.reduce((a, l) => a + l.qty, 0);
  const no = orderNo();
  const q = await quoteShip(L, b.adresse, pieces);
  if (!q.ok) throw new Err(q.error);
  const mode = q.near ? 'main' : 'colis'; // le client ne choisit rien : livraison chez lui
  const colis = true; // adresse complète demandée dans tous les cas
  const goods = lines.reduce((a, l) => a + l.cents, 0);
  const free = L.gratuitDes > 0 && goods >= L.gratuitDes;
  const ship = free ? 0 : q.cents;
  const shipName = free ? 'Livraison offerte' : q.near ? 'Livraison' : 'Livraison en point relais Mondial Relay';
  const where = q.label;
  const compact = lines.map(l => [l.qty, l.id, l.sz, l.combo, l.text, l.fo, l.dg, l.cents, l.pn].join('|')).join('\n');
  const meta = { order_no: no, name, tel, delivery: mode, where, more };
  chunks(compact).slice(0, 45).forEach((c, i) => { meta['l' + i] = c; });
  const params = {
    ui_mode: 'embedded', mode: 'payment', locale: 'fr', redirect_on_completion: 'if_required', allow_promotion_codes: true,
    return_url: origin + '/?paiement=ok&session_id={CHECKOUT_SESSION_ID}',
    client_reference_id: no, customer_email: email || undefined, metadata: meta,
    payment_intent_data: { description: 'Noméo ' + no, metadata: { order_no: no } },
    line_items: lines.map(l => ({ quantity: 1, price_data: { currency: 'eur', unit_amount: l.cents,
      product_data: { name: (l.qty > 1 ? l.qty + ' × ' : '') + lineTitle(l), description: lineDetail(l) || undefined } } })),
    shipping_address_collection: colis ? { allowed_countries: ['FR'] } : undefined,
    shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', display_name: shipName,
      fixed_amount: { amount: ship, currency: 'eur' } } }],
    custom_text: { submit: { message: 'Aucune pièce n’est imprimée avant votre aperçu 3D. Avant l’impression, vous pouvez modifier ou annuler sur simple message.' } },
  };
  // Les versions récentes de l'API Stripe nomment ce mode « embedded_page » : on essaie les deux.
  let s;
  try { s = await stripe(env, 'POST', '/checkout/sessions', params); }
  catch (e) {
    if (e.stripeMsg && /ui_mode/i.test(e.stripeMsg)) s = await stripe(env, 'POST', '/checkout/sessions', { ...params, ui_mode: 'embedded_page' });
    else throw e;
  }
  const total = lines.reduce((a, l) => a + l.cents, 0) + ship;
  return { clientSecret: s.client_secret, orderNo: no, totalCents: total, shipCents: ship, summary: lines.map(l => ({ qty: l.qty, title: lineTitle(l), cents: l.cents })) };
}

// ---------- cadeaux de collection : tirage fait ICI (le navigateur ne peut pas tricher) ----------
// Chances par mini-figurine : légendaire 1/200 (un seul exemplaire au total), super rare 5 %, rare 20 %, commune le reste.
const SERIE = {
  c: [['001', 'Flocon'], ['002', 'Zeste'], ['003', 'Dodo']],
  r: [['004', 'Flocon de Noël'], ['005', 'Zeste pizzaïolo']],
  sr: [['006', 'Dodo fantôme']],
  l: [['007', 'Zeste doré']]
};
const RAR = { c: 'Commune', r: 'Rare', sr: 'Super rare', l: 'Légendaire' };
async function rolls(sid, n) {
  const out = []; let buf = new Uint8Array(0), k = 0;
  while (out.length < n * 2) {
    buf = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nomeo|' + sid + '|' + (k++))));
    for (let i = 0; i + 4 <= buf.length; i += 4) out.push(((buf[i] << 24) >>> 0) + (buf[i + 1] << 16) + (buf[i + 2] << 8) + buf[i + 3]);
  }
  return out.map(x => x / 4294967296);
}
// Réglages lus sur le site (collection.json) : on peut changer séries, chances et paliers sans redéployer ce serveur.
async function loadCfg(env) {
  const url = env.COLLECTION_URL || 'https://nomeo-atelier.com/collection.json';
  try {
    const r = await fetch(url, { cf: { cacheTtl: 60 } }); if (!r.ok) throw 0;
    const c = await r.json();
    if (c && c.figurines && c.chances && c.figurines.c && c.figurines.c.length) return c;
  } catch (e) {}
  return { seuilMini: 25, tranche: 50, minisParTranche: 2, chances: { l: 0.005, sr: 0.05, r: 0.2 }, figurines: SERIE, legendaireUnique: true };
}
async function gifts(env, sid, goodsCents) {
  const C = await loadCfg(env), F = C.figurines, P = C.chances;
  const eur = goodsCents / 100;
  const nMini = eur >= (C.seuilMini || 25) ? 1 + (C.minisParTranche || 2) * Math.floor(eur / (C.tranche || 50)) : 0;
  if (!nMini) return { card: true, minis: [] };
  const u = await rolls(sid, nMini), minis = [];
  for (let i = 0; i < nMini; i++) {
    const a = u[2 * i], b = u[2 * i + 1];
    const pl = F.l && F.l.length ? (P.l || 0) : 0, ps = F.sr && F.sr.length ? (P.sr || 0) : 0, pr = F.r && F.r.length ? (P.r || 0) : 0;
    let r = a < pl ? 'l' : a < pl + ps ? 'sr' : a < pl + ps + pr ? 'r' : 'c';
    if (r === 'l' && C.legendaireUnique !== false) {
      let ok = false;
      if (env.FILES) { const g = await env.FILES.get('gold-winner'); if (!g) { await env.FILES.put('gold-winner', sid); ok = true; } else ok = g === sid; }
      if (!ok || minis.some(m => m.r === 'l')) r = (F.sr && F.sr.length) ? 'sr' : 'c';
    }
    const list = F[r], f = list[Math.floor(b * list.length)];
    minis.push({ no: f[0], name: f[1], r, rar: RAR[r] });
  }
  return { card: false, minis, gold: minis.some(m => m.r === 'l') };
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
  const ship = (s.total_details && s.total_details.amount_shipping) || 0;
  const gift = paid ? await gifts(env, sid, (s.amount_total || 0) - ship) : null;
  const disc = (s.total_details && s.total_details.amount_discount) || 0;
  return { paid, gift, discountCents: disc, orderNo: m.order_no || '', name: m.name || '', tel: m.tel || '', email: (s.customer_details && s.customer_details.email) || s.customer_email || '',
    delivery: m.delivery || '', where: m.where || '', more: m.more || '', address: addr, totalCents: s.amount_total, message: msg };
}

// ---------- livraison : main propre selon la distance, point relais ou Colissimo (réglages dans livraison.json) ----------
const SHIP_DEFAULT = { depart: null, facteurRoute: 1.3, // point de départ : variables DEPART_LAT et DEPART_LON dans Cloudflare, jamais envoyé aux clients
  mainPropre: [{ km: 15, cents: 200 }],
  relais: { nom: 'Point relais Mondial Relay', paliers: [{ pieces: 6, cents: 490 }, { pieces: 15, cents: 690 }, { pieces: 100000, cents: 890 }] },
  domicile: { nom: 'Livraison en point relais', paliers: [{ pieces: 6, cents: 490 }, { pieces: 15, cents: 690 }, { pieces: 100000, cents: 890 }] } };
async function loadShip(env) {
  try {
    const r = await fetch(env.LIVRAISON_URL || 'https://nomeo-atelier.com/livraison.json', { cf: { cacheTtl: 60 } }); if (!r.ok) throw 0;
    const c = await r.json();
    if (c && c.mainPropre && c.domicile) return { gratuitDes: 0, ...c, depart: departOf(env), facteurRoute: SHIP_DEFAULT.facteurRoute };
  } catch (e) {}
  return { ...SHIP_DEFAULT, depart: departOf(env) };
}
function departOf(env) { const lat = parseFloat(env.DEPART_LAT), lon = parseFloat(env.DEPART_LON); return isFinite(lat) && isFinite(lon) ? { lat, lon } : null; }
const tierCents = (paliers, n) => { const p = paliers.find(x => n <= x.pieces) || paliers[paliers.length - 1]; return p.cents; };
function kmBetween(a, b) {
  const R = 6371, t = x => x * Math.PI / 180, dLa = t(b.lat - a.lat), dLo = t(b.lon - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
async function quoteShip(L, adresse, pieces, montant) {
  const q = cleanText(adresse, 160);
  if (q.length < 3) return { ok: false, error: 'Indiquez votre code postal et votre ville pour calculer la livraison.' };
  let f;
  try {
    const r = await fetch('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(q), { cf: { cacheTtl: 3600 } });
    const j = await r.json(); f = j && j.features && j.features[0];
  } catch (e) { return { ok: false, error: 'Livraison impossible à calculer pour le moment. Réessayez dans un instant.' }; }
  if (!f || !(f.properties && f.properties.score > 0.35)) return { ok: false, error: 'Adresse introuvable : vérifiez le code postal et la ville.' };
  const label = cleanText((f.properties.postcode ? f.properties.postcode + ' ' : '') + (f.properties.city || f.properties.label), 140);
  const n = Math.max(1, parseInt(pieces, 10) || 1);
  const free = L.gratuitDes > 0 && (parseInt(montant, 10) || 0) >= L.gratuitDes; // affichage seulement, recalculé au paiement
  const out = { ok: true, label, near: false, cents: free ? 0 : tierCents(L.domicile.paliers, n) };
  if (L.depart) {
    const [lon, lat] = f.geometry.coordinates;
    const km = kmBetween(L.depart, { lat, lon }) * (L.facteurRoute || 1.3); // reste sur le serveur
    const t = L.mainPropre.find(x => km <= x.km);
    if (t) return { ok: true, label, near: true, cents: free ? 0 : t.cents };
  }
  return out;
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
      if (url.pathname === '/config' && req.method === 'GET') { const L = await loadShip(env); return send({ pk: env.STRIPE_PUBLISHABLE_KEY, livraison: true, gratuitDes: L.gratuitDes || 0 }); }
      if (url.pathname === '/livraison' && req.method === 'GET') return send(await quoteShip(await loadShip(env), url.searchParams.get('adresse'), url.searchParams.get('pieces'), url.searchParams.get('montant')));
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
export { normalize, priceCart, packFacts, gifts };
