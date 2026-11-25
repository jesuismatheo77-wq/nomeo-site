/* Cadeaux de la collection : barre de progression dans le panier */
(function () {
  "use strict";
  var tot = document.getElementById("cart-total"), sum = document.getElementById("cart-sum");
  if (!tot || !sum) return;
  var box = document.createElement("div"); box.className = "gift"; box.setAttribute("aria-live", "polite");
  sum.parentNode.insertBefore(box, sum);
  var dyn = document.createElement("div");
  var more = document.createElement("details"); more.className = "gift-more";
  more.innerHTML = '<summary>En savoir plus</summary><p>Chaque commande reçoit une carte de collection. Dès 25&nbsp;€ d’achat, on ajoute une mini-figurine surprise (Flocon, Zeste ou Dodo) avec sa carte, et un booster de 2 minis et leurs cartes par tranche de 50&nbsp;€. Les raretés sont tirées au hasard au moment du paiement.</p>';
  box.appendChild(dyn); box.appendChild(more);
  function eur(n) { return n.toFixed(2).replace(".", ",").replace(",00", "") + " €"; }
  function upd() {
    var t = parseFloat((tot.textContent || "0").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    if (sum.hidden || t <= 0) { box.hidden = true; return; }
    box.hidden = false;
    var msg, pct, got = ["1 carte de collection"];
    if (t < 25) { msg = "Plus que <b>" + eur(25 - t) + "</b> pour une mini-figurine offerte"; pct = t / 25; }
    else {
      got = ["1 mini-figurine surprise et sa carte"];
      var n = Math.floor(t / 50); if (n) got.push(n + " booster" + (n > 1 ? "s" : "") + " (" + 2 * n + " minis et leurs cartes)");
      var next = (n + 1) * 50; msg = "Plus que <b>" + eur(next - t) + "</b> pour " + (n ? "un booster de plus" : "un booster (2 minis et leurs cartes)"); pct = (t - n * 50) / 50;
    }
    var ship = t >= 50 ? "Livraison offerte pour cette commande" : "Livraison offerte dès 50&nbsp;€ d’achat : plus que <b>" + eur(50 - t) + "</b>";
    dyn.innerHTML = '<p class="gift-h">' + msg + '</p><div class="gift-bar"><i style="width:' + Math.round(Math.min(1, pct) * 100) + '%"></i></div><p class="gift-got">Offert avec cette commande&nbsp;: ' + got.join(" + ") + '</p><p class="gift-ship">' + ship + '</p>';
  }
  new MutationObserver(upd).observe(tot, { childList: true, characterData: true, subtree: true });
  new MutationObserver(upd).observe(sum, { attributes: true, attributeFilter: ["hidden"] });
  upd();
})();
