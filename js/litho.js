/* Portraits lumineux (lithophanies) : la photo du client devient une plaque en relief qui s'éclaire par derrière.
   L'aperçu est calculé comme la vraie pièce : épaisseur 0,8 à 3,2 mm selon le gris, lumière transmise exp(-k·épaisseur). */
(function () {
  "use strict";
  var root = document.getElementById("litho");
  if (!root) return;
  var API = "https://nomeo-pay.jesuismatheo77.workers.dev";
  var MAIL = "nomeo.atelier@gmail.com";
  var SIZES = [
    { k: "s", l: "Petit", mm: [100, 80], d: "10 × 8 cm" },
    { k: "m", l: "Moyen", mm: [150, 100], d: "15 × 10 cm" },
    { k: "l", l: "Grand", mm: [200, 150], d: "20 × 15 cm" }
  ];
  var PRICE = { litho: { s: 14.9, m: 19.9, l: 29.9 }, "litho-lampe": { s: 19.9, m: 26.9, l: 39.9 } };
  var T_MIN = 0.8, T_MAX = 3.2, K = 1.25, BORDER = 3; // mm

  var st = { id: "litho", sz: "s", port: false, lit: true, qty: 1, img: null, sample: true, zoom: 1, px: 0, py: 0, up: null };
  function eur(v) { return v.toFixed(2).replace(".", ",") + " €"; }
  function el(t, a, kids) {
    var n = document.createElement(t);
    Object.keys(a || {}).forEach(function (k) { if (k === "text") n.textContent = a[k]; else if (k === "html") n.innerHTML = a[k]; else n.setAttribute(k, a[k]); });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function size() { return SIZES.filter(function (s) { return s.k === st.sz; })[0]; }
  function dims() { var m = size().mm; return st.port ? [m[1], m[0]] : [m[0], m[1]]; }

  // ---------- interface ----------
  var cv = el("canvas", { class: "li-cv", "aria-label": "Aperçu de votre portrait lumineux" });
  var light = el("button", { type: "button", class: "li-light", "aria-pressed": "true", text: "Lumière allumée" });
  var file = el("input", { type: "file", accept: "image/*", class: "li-file", id: "li-file" });
  var pick = el("label", { class: "btn btn-y li-pick", for: "li-file", text: "Choisir ma photo" });
  var zoom = el("input", { type: "range", min: "1", max: "3", step: "0.01", value: "1", "aria-label": "Zoom sur la photo" });
  var zoomW = el("label", { class: "li-zoom", hidden: "" }, [el("span", { text: "Zoom" }), zoom]);
  var hint = el("p", { class: "li-hint", text: "Exemple avec Zeste. Choisissez votre photo pour voir votre portrait." });
  var fig = el("div", { class: "li-fig" }, [cv, light]);

  function radios(name, opts, cur, label) {
    var g = el("div", { class: "li-opts", role: "radiogroup", "aria-label": label });
    opts.forEach(function (o) {
      var inp = el("input", { type: "radio", name: name, value: o.v });
      if (o.v === cur) inp.checked = true;
      g.appendChild(el("label", {}, [inp, el("span", { html: "<b>" + o.l + "</b>" + (o.d ? "<small>" + o.d + "</small>" : "") })]));
    });
    return g;
  }
  var gForm = radios("li-form", [
    { v: "litho", l: "Plaque seule", d: "Sur un petit pied, à poser devant une fenêtre ou une lampe" },
    { v: "litho-lampe", l: "Avec boîte lumineuse", d: "Boîte blanche, bougie LED fournie, photo interchangeable (+ 5, 7 ou 10 €)" }
  ], "litho", "Version");
  var gSize = radios("li-sz", SIZES.map(function (s) { return { v: s.k, l: s.l, d: s.d }; }), "s", "Taille");
  var gDir = radios("li-dir", [{ v: "h", l: "Paysage" }, { v: "v", l: "Portrait" }], "h", "Sens de la photo");
  var qIn = el("input", { type: "number", class: "sp-q", value: "1", min: "1", max: "20", inputmode: "numeric", "aria-label": "Quantité" });
  var add = el("button", { type: "button", class: "btn btn-y li-add", text: "Ajouter" });
  var msg = el("p", { class: "li-msg", role: "status" });
  var stepper = el("div", { class: "stepper", role: "group", "aria-label": "Quantité" }, [
    el("button", { type: "button", "data-st": "-1", "aria-label": "Une pièce de moins", text: "−" }), qIn,
    el("button", { type: "button", "data-st": "1", "aria-label": "Une pièce de plus", text: "+" })]);

  root.appendChild(el("div", { class: "li-card" }, [
    el("div", { class: "li-left" }, [fig, el("div", { class: "li-pickrow" }, [pick, file, zoomW]), hint]),
    el("div", { class: "li-right" }, [
      el("h4", { text: "Votre version" }), gForm,
      el("h4", { text: "Taille" }), gSize,
      el("h4", { text: "Sens" }), gDir,
      el("p", { class: "li-tip", text: "Conseil : une photo nette et bien éclairée, avec le visage assez grand. Le passage en noir et blanc se fait tout seul." }),
      el("div", { class: "sp-b" }, [stepper, add]), msg,
      el("p", { class: "sp-safe", text: "Fabriqué par Noméo, France. PLA blanc, usage intérieur. Version boîte : uniquement avec la bougie LED fournie." })
    ])
  ]));

  function priceNow() { return PRICE[st.id][st.sz]; }
  function refresh() {
    add.textContent = "Ajouter · " + eur(priceNow() * st.qty);
    [].forEach.call(gSize.querySelectorAll("small"), function (s, i) { s.innerHTML = SIZES[i].d + "<br>" + eur(PRICE[st.id][SIZES[i].k]); });
    [].forEach.call(root.querySelectorAll(".li-opts label"), function (l) { l.classList.toggle("sel", l.querySelector("input").checked); });
    draw();
  }

  // ---------- image source ----------
  var src = document.createElement("canvas"), sctx = src.getContext("2d");
  function setImage(img, sample) {
    var m = 1600, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(1, m / Math.max(w, h));
    src.width = Math.round(w * s); src.height = Math.round(h * s);
    sctx.fillStyle = "#F4F1EA"; sctx.fillRect(0, 0, src.width, src.height);
    sctx.drawImage(img, 0, 0, src.width, src.height);
    st.img = true; st.sample = sample; st.zoom = 1; st.px = 0; st.py = 0; st.up = null; zoom.value = "1";
    zoomW.hidden = sample; hint.hidden = !sample;
    if (!sample) { var dir = src.height > src.width ? "v" : "h"; st.port = dir === "v"; gDir.querySelector('[value="' + dir + '"]').checked = true; }
    refresh();
  }
  var sm = new Image(); sm.onload = function () { if (!st.img || st.sample) setImage(sm, true); }; sm.src = "img/litho-exemple.webp";
  file.addEventListener("change", function () {
    var f = file.files && file.files[0]; if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) { msg.textContent = "Choisissez une photo (JPG, PNG ou HEIC)."; return; }
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () { msg.textContent = ""; setImage(im, false); URL.revokeObjectURL(u); };
    im.onerror = function () { msg.textContent = "Cette photo n’a pas pu s’ouvrir. Essayez une capture d’écran de la photo, ou un JPG."; URL.revokeObjectURL(u); };
    im.src = u;
  });

  // Recadrage : la zone de la photo qui tombe dans la plaque (hors bordure)
  function cropRect() {
    var d = dims(), ar = (d[0] - 2 * BORDER) / (d[1] - 2 * BORDER), W = src.width, H = src.height;
    var cw = W, ch = W / ar; if (ch > H) { ch = H; cw = H * ar; }
    cw /= st.zoom; ch /= st.zoom;
    var cx = W / 2 + st.px * (W - cw) / 2, cy = H / 2 + st.py * (H - ch) / 2;
    return [cx - cw / 2, cy - ch / 2, cw, ch];
  }
  // Carte des gris -> épaisseur, à la résolution demandée
  function heights(w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"), r = cropRect(), d = dims(), bx = Math.round(w * BORDER / d[0]), by = Math.round(h * BORDER / d[1]);
    x.drawImage(src, r[0], r[1], r[2], r[3], bx, by, w - 2 * bx, h - 2 * by);
    var px = x.getImageData(0, 0, w, h).data, t = new Float32Array(w * h);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var k = j * w + i, inB = i < bx || j < by || i >= w - bx || j >= h - by;
      if (inB) { t[k] = T_MAX + 0.4; continue; }
      var L = (0.299 * px[4 * k] + 0.587 * px[4 * k + 1] + 0.114 * px[4 * k + 2]) / 255;
      L = Math.pow(L, 0.85); // un peu plus de détail dans les ombres
      t[k] = T_MIN + (1 - L) * (T_MAX - T_MIN);
    }
    return t;
  }

  // ---------- rendu ----------
  var ctx = cv.getContext("2d");
  function draw() {
    if (!st.img) return;
    var box = fig.clientWidth || 320, dpr = Math.min(2, window.devicePixelRatio || 1);
    var Wc = Math.round(box * dpr), Hc = Math.round(box * 0.86 * dpr);
    cv.width = Wc; cv.height = Hc; cv.style.height = Math.round(box * 0.86) + "px";
    var lamp = st.id === "litho-lampe", d = dims();
    var baseH = 0.05 * Hc, maxW = Wc * 0.82, maxH = Hc * 0.86 - baseH;
    var s = Math.min(maxW / d[0], maxH / d[1]), pw = Math.round(d[0] * s), ph = Math.round(d[1] * s);
    var x0 = Math.round((Wc - pw) / 2), y0 = Math.round((Hc - baseH - ph) / 2 + Hc * 0.02);
    // fond : pièce sombre si allumé, clair sinon
    var g = ctx.createRadialGradient(Wc / 2, y0 + ph / 2, 10, Wc / 2, y0 + ph / 2, Wc * 0.75);
    if (st.lit) { g.addColorStop(0, "#4A3A28"); g.addColorStop(1, "#16120E"); } else { g.addColorStop(0, "#FFFDF6"); g.addColorStop(1, "#E7E1D3"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wc, Hc);
    // plaque
    var rw = Math.min(pw, 520), rh = Math.round(rw * ph / pw), t = heights(rw, rh), out = ctx.createImageData(rw, rh), o = out.data;
    var e0 = Math.exp(-K * T_MIN);
    for (var j = 0; j < rh; j++) for (var i = 0; i < rw; i++) {
      var k = j * rw + i, p = 4 * k;
      if (st.lit) {
        var I = Math.exp(-K * t[k]) / e0; // 1 = le plus fin
        I = Math.min(1, I * 1.05);
        o[p] = 255 * Math.pow(I, 0.80); o[p + 1] = 236 * Math.pow(I, 0.92); o[p + 2] = 200 * Math.pow(I, 1.15);
      } else {
        var l = t[k - (i > 0 ? 1 : 0)], r = t[k + (i < rw - 1 ? 1 : 0)], u = t[k - (j > 0 ? rw : 0)], dn = t[k + (j < rh - 1 ? rw : 0)];
        var sc = rw / d[0], nx = (l - r) * sc * 0.9, ny = (u - dn) * sc * 0.9, nz = 1, nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        var sh = 0.80 + 0.32 * ((nx * -0.5 + ny * -0.6 + nz * 0.62) / nl) - (t[k] - T_MIN) * 0.015;
        o[p] = 238 * sh; o[p + 1] = 235 * sh; o[p + 2] = 228 * sh;
      }
      o[p + 3] = 255;
    }
    var tmp = document.createElement("canvas"); tmp.width = rw; tmp.height = rh; tmp.getContext("2d").putImageData(out, 0, 0);
    if (st.lit) { ctx.save(); ctx.shadowColor = "rgba(255,190,90,.55)"; ctx.shadowBlur = 40 * dpr; ctx.fillStyle = "#000"; ctx.fillRect(x0, y0, pw, ph); ctx.restore(); }
    else { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.22)"; ctx.shadowBlur = 14 * dpr; ctx.shadowOffsetY = 6 * dpr; ctx.fillStyle = "#ddd"; ctx.fillRect(x0, y0, pw, ph); ctx.restore(); }
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(tmp, x0, y0, pw, ph);
    // support
    var by = y0 + ph;
    if (lamp) {
      // boîte blanche : cadre de 4 mm autour de la photo, la plaque se glisse par le haut
      var bz = Math.max(4 * dpr, pw * 0.04), ox = x0 - bz * 0.7, oy = y0 - bz * 0.7;
      ctx.save(); ctx.fillStyle = st.lit ? "#CFC6B6" : "#F4F2EC"; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 10 * dpr; ctx.shadowOffsetY = 4 * dpr;
      ctx.beginPath(); ctx.rect(ox, oy, pw + 1.4 * bz, ph + 1.4 * bz); ctx.rect(x0 + bz * 0.7, y0 + bz * 0.7, pw - 1.4 * bz, ph - 1.4 * bz); ctx.fill("evenodd"); ctx.restore();
      ctx.fillStyle = st.lit ? "#B9AF9E" : "#E4E0D6"; ctx.fillRect(x0 + pw * 0.5 - 13 * dpr, oy - 1 * dpr, 26 * dpr, 3 * dpr);
    } else {
      ctx.fillStyle = st.lit ? "#8F8579" : "#E9E5DC"; var fw = Math.max(20 * dpr, pw * 0.16), fh = baseH * 0.9;
      rr(x0 + pw * 0.12, by - 3 * dpr, fw, fh, 3 * dpr); ctx.fill(); rr(x0 + pw * 0.88 - fw, by - 3 * dpr, fw, fh, 3 * dpr); ctx.fill();
    }
    ctx.font = (11 * dpr) + "px system-ui, sans-serif"; ctx.fillStyle = st.lit ? "rgba(255,240,220,.7)" : "rgba(20,20,20,.55)"; ctx.textAlign = "right";
    ctx.fillText(d[0] / 10 + " × " + d[1] / 10 + " cm", Wc - 10 * dpr, Hc - 10 * dpr);
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---------- interactions ----------
  light.addEventListener("click", function () { st.lit = !st.lit; light.setAttribute("aria-pressed", String(st.lit)); light.textContent = st.lit ? "Lumière allumée" : "Lumière éteinte"; draw(); });
  gForm.addEventListener("change", function (e) { st.id = e.target.value; refresh(); });
  gSize.addEventListener("change", function (e) { st.sz = e.target.value; st.up = null; refresh(); });
  gDir.addEventListener("change", function (e) { st.port = e.target.value === "v"; st.up = null; refresh(); });
  zoom.addEventListener("input", function () { st.zoom = +zoom.value; st.up = null; draw(); });
  stepper.addEventListener("click", function (e) { var b = e.target.closest("[data-st]"); if (!b) return; st.qty = Math.max(1, Math.min(20, st.qty + +b.getAttribute("data-st"))); qIn.value = st.qty; refresh(); });
  qIn.addEventListener("change", function () { st.qty = Math.max(1, Math.min(20, parseInt(qIn.value, 10) || 1)); qIn.value = st.qty; refresh(); });
  // glisser pour recadrer
  var drag = null;
  cv.addEventListener("pointerdown", function (e) { if (st.sample) return; drag = { x: e.clientX, y: e.clientY, px: st.px, py: st.py }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return; var w = cv.clientWidth;
    st.px = Math.max(-1, Math.min(1, drag.px - (e.clientX - drag.x) / (w * 0.4)));
    st.py = Math.max(-1, Math.min(1, drag.py - (e.clientY - drag.y) / (w * 0.4)));
    st.up = null; draw();
  });
  ["pointerup", "pointercancel"].forEach(function (n) { cv.addEventListener(n, function () { drag = null; }); });
  var rt = null; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });

  // ---------- ajout au panier ----------
  function photoBlob() {
    var d = dims(), r = cropRect(), long = 1800, w = d[0] >= d[1] ? long : Math.round(long * d[0] / d[1]), h = Math.round(w * d[1] / d[0]);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, r[0], r[1], r[2], r[3], 0, 0, w, h);
    return new Promise(function (ok) { c.toBlob(ok, "image/jpeg", 0.92); });
  }
  add.addEventListener("click", function () {
    if (st.sample) { msg.textContent = "Choisissez d’abord votre photo."; pick.focus(); return; }
    if (!window.A77 || !window.A77.addItem) { msg.textContent = "Le panier n’est pas encore prêt, réessayez dans un instant."; return; }
    add.disabled = true; var old = add.textContent; add.textContent = "Envoi de la photo…"; msg.textContent = "";
    var done = function (text, note) {
      window.A77.addItem(st.id, { text: text, combo: st.id === "litho-lampe" ? "blanc-blanc" : "blanc-blanc", qty: st.qty, sz: st.sz });
      add.disabled = false; add.textContent = old; msg.textContent = note || "Ajouté à votre panier, avec votre photo.";
    };
    (st.up ? Promise.resolve(st.up) : photoBlob().then(function (b) {
      var fd = new FormData(); fd.append("file", b, "portrait-" + (st.port ? "portrait" : "paysage") + "-" + st.sz + ".jpg");
      return fetch(API + "/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.url) throw 0; return j; }); });
    })).then(function (j) {
      st.up = j; var id = String(j.url).split("/f/")[1] || "";
      done("Photo réf. " + id);
    }).catch(function () {
      done("Photo à envoyer par e-mail", "Ajouté à votre panier. Votre photo n’a pas pu partir : après la commande, envoyez-la à " + MAIL + " avec votre numéro de commande.");
    });
  });
})();
