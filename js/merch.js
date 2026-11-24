/* Boutique des mascottes : réservation sans paiement, envoyée par e-mail */
(function () {
  "use strict";
  var KEY = "027d9344-9e05-43ea-8a2f-2f5c3c5cd6e5";
  var f = document.getElementById("mg-form");
  if (!f) return;
  var st = document.getElementById("mg-state"), it = document.getElementById("mg-item"), item = "";
  document.querySelectorAll(".mg-want").forEach(function (b) {
    b.addEventListener("click", function () {
      item = b.getAttribute("data-item"); it.textContent = item; f.hidden = false; st.textContent = "";
      f.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { f.elements.nom.focus({ preventScroll: true }); }, 400);
    });
  });
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    if (f.elements.botcheck.value) return;
    var nom = f.elements.nom.value.trim(), c = f.elements.contact.value.trim(), mot = f.elements.mot.value.trim();
    if (!nom) { st.textContent = "Indiquez votre nom."; f.elements.nom.focus(); return; }
    if (!c) { st.textContent = "Laissez un téléphone ou un e-mail pour qu’on vous prévienne."; f.elements.contact.focus(); return; }
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true; st.textContent = "Envoi…";
    var body = { access_key: KEY, subject: "Réservation mascotte : " + item + " (" + nom + ")", from_name: "Site Noméo, mascottes", name: nom,
      message: "Article : " + item + "\nPrécision : " + (mot || "-") + "\n\nNom : " + nom + "\nContact : " + c };
    if (/@/.test(c)) body.email = c; else body.phone = c;
    fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!(r.ok && j.success)) throw 0; }); })
      .then(function () { f.innerHTML = '<p class="fx-done-h">C’est réservé, merci !</p><p>On vous prévient dès que votre ' + item.replace(/[<>&]/g, "") + ' est prêt(e).</p>'; })
      .catch(function () { btn.disabled = false; st.textContent = "L’envoi n’a pas marché. Écrivez-nous à nomeo.atelier@gmail.com."; });
  });
})();
