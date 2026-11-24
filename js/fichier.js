/* Dépôt d'un fichier 3D : le fichier va sur le serveur Noméo (Cloudflare), la demande part par e-mail avec le lien */
(function () {
  "use strict";
  var API = "https://nomeo-pay.jesuismatheo77.workers.dev";
  var KEY = "027d9344-9e05-43ea-8a2f-2f5c3c5cd6e5";
  var MAIL = "nomeo.atelier@gmail.com";
  var MAX = 25 * 1024 * 1024;
  var EXT = ["stl", "3mf", "obj", "step", "stp", "ply", "amf", "zip"];
  var f = document.getElementById("fx");
  if (!f) return;
  var input = document.getElementById("fx-file"), drop = document.getElementById("fx-drop");
  var tName = document.getElementById("fx-t"), tSub = document.getElementById("fx-s");
  var st = document.getElementById("fx-state"), send = document.getElementById("fx-send");
  var file = null, dims = "";

  function mo(n) { return (n / 1048576).toFixed(n < 1048576 ? 2 : 1).replace(".", ",") + " Mo"; }
  function ext(n) { return (n.split(".").pop() || "").toLowerCase(); }

  // Dimensions d'un STL (binaire ou texte), en mm
  function stlBox(buf) {
    var dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    function add(x, y, z) { var v = [x, y, z]; for (var k = 0; k < 3; k++) { if (v[k] < mn[k]) mn[k] = v[k]; if (v[k] > mx[k]) mx[k] = v[k]; } }
    if (n > 0 && 84 + n * 50 === buf.byteLength) {
      for (var i = 0; i < n; i++) { var o = 84 + i * 50 + 12; for (var j = 0; j < 3; j++) add(dv.getFloat32(o + j * 12, true), dv.getFloat32(o + j * 12 + 4, true), dv.getFloat32(o + j * 12 + 8, true)); }
    } else {
      var txt = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 30 * 1048576)));
      var re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g, m;
      while ((m = re.exec(txt))) add(+m[1], +m[2], +m[3]);
    }
    if (!isFinite(mn[0])) return null;
    return [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  }

  function pick(fl) {
    st.textContent = ""; dims = "";
    if (!fl) return;
    if (EXT.indexOf(ext(fl.name)) < 0) { file = null; st.textContent = "Ce format n’est pas accepté : envoyez un fichier STL, 3MF, OBJ, STEP ou ZIP."; return; }
    if (fl.size > MAX) { file = null; st.textContent = "Ce fichier fait " + mo(fl.size) + " : le maximum est de 25 Mo. Compressez-le en ZIP ou écrivez-nous à " + MAIL + "."; return; }
    file = fl;
    drop.classList.add("has-file");
    tName.textContent = fl.name;
    tSub.textContent = mo(fl.size) + " · toucher pour changer";
    if (ext(fl.name) === "stl" && window.FileReader) {
      fl.arrayBuffer().then(function (b) {
        var d = stlBox(b);
        if (!d) return;
        dims = d.map(function (x) { return Math.round(x); }).join(" × ") + " mm";
        tSub.textContent = mo(fl.size) + " · " + dims + " · toucher pour changer";
        if (Math.max(d[0], d[1], d[2]) > 180) st.textContent = "La pièce dépasse 18 cm : on pourra la réduire ou l’imprimer en plusieurs morceaux, on en parle dans le devis.";
      }).catch(function () {});
    }
  }
  input.addEventListener("change", function () { pick(input.files && input.files[0]); });
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function () { drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (ev) { ev.preventDefault(); var fl = ev.dataTransfer && ev.dataTransfer.files[0]; if (fl) pick(fl); });

  function resume(link) {
    var v = function (n) { return (f.elements[n].value || "").trim(); };
    return [
      "Fichier : " + (file ? file.name + " (" + mo(file.size) + (dims ? ", " + dims : "") + ")" : "-"),
      "Lien de téléchargement : " + (link || "pas de lien, le client doit envoyer le fichier par e-mail"),
      "Quantité : " + (v("qte") || "1"),
      "Couleur : " + v("couleur"),
      "Précisions : " + (v("mot") || "-"),
      "",
      "Nom : " + v("nom"),
      "Contact : " + v("contact")
    ].join("\n");
  }

  function mail(link) {
    var v = function (n) { return (f.elements[n].value || "").trim(); };
    var c = v("contact");
    var body = { access_key: KEY, subject: "Fichier 3D à imprimer : " + (file ? file.name : "") + " (" + v("nom") + ")", from_name: "Site Noméo, dépôt de fichier", name: v("nom"), message: resume(link) };
    if (/@/.test(c)) body.email = c; else body.phone = c;
    return fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!(r.ok && j.success)) throw new Error("mail"); }); });
  }

  function done(withFile) {
    f.innerHTML = "";
    var h = document.createElement("p"); h.className = "fx-done-h"; h.textContent = withFile ? "Fichier reçu, merci !" : "Demande envoyée, merci !";
    var p = document.createElement("p");
    p.textContent = withFile ? "On vérifie qu’il s’imprime bien et on revient vers vous sous 24 h avec le prix et le délai." : "Il nous manque le fichier : envoyez-le par e-mail à " + MAIL + " en indiquant votre nom. On revient vers vous sous 24 h.";
    f.appendChild(h); f.appendChild(p);
  }

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    if (f.elements.botcheck.value) return;
    if (!file) { st.textContent = "Choisissez d’abord votre fichier 3D."; input.focus(); return; }
    if (!f.elements.nom.value.trim()) { st.textContent = "Indiquez votre nom."; f.elements.nom.focus(); return; }
    if (!f.elements.contact.value.trim()) { st.textContent = "Laissez un téléphone ou un e-mail pour qu’on puisse vous répondre."; f.elements.contact.focus(); return; }
    send.disabled = true; st.textContent = "Envoi du fichier…";
    var fd = new FormData(); fd.append("file", file, file.name);
    fetch(API + "/upload", { method: "POST", body: fd })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.url) { st.textContent = "Envoi de votre demande…"; return mail(res.j.url).then(function () { done(true); }); }
        if (res.status === 503) { return mail("").then(function () { done(false); }); }
        throw new Error(res.j && res.j.error || "upload");
      })
      .catch(function (err) {
        send.disabled = false;
        st.textContent = (err && err.message && err.message.length > 12 ? err.message + " " : "L’envoi n’a pas marché. ") + "Vous pouvez aussi envoyer le fichier par e-mail à " + MAIL + ".";
      });
  });
})();
