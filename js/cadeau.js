/* Cadeaux de la collection : barre de progression dans le panier */
(function () {
  "use strict";
  var tot = document.getElementById("cart-total"), sum = document.getElementById("cart-sum");
  if (!tot || !sum) return;
  var box = document.createElement("div"); box.className = "gift"; box.setAttribute("aria-live", "polite");
  sum.parentNode.insertBefore(box, sum);
  var dyn = document.createElement("div");
  var more = document.createElement("details"); more.className = "gift-more";
  more.innerHTML = '<summary>En savoir plus</summary><p>Pour chaque tranche de 25&nbsp;€ d’achat, on ajoute une mini-figurine surprise de la collection. Les raretés sont tirées au hasard au moment du paiement.</p>';
  box.appendChild(dyn); box.appendChild(more);
  function eur(n) { return n.toFixed(2).replace(".", ",").replace(",00", "") + " €"; }
  function upd() {
    var t = parseFloat((tot.textContent || "0").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    if (sum.hidden || t <= 0) { box.hidden = true; return; }
    box.hidden = false;
    var n = Math.floor(t / 25), got = n ? [n + " mini-figurine" + (n > 1 ? "s" : "") + " surprise"] : [];
    var msg = "Plus que <b>" + eur((n + 1) * 25 - t) + "</b> pour " + (n ? "une mini-figurine de plus" : "une mini-figurine offerte"), pct = (t - n * 25) / 25;
    var ship = t >= 50 ? "Livraison offerte pour cette commande" : "Livraison offerte dès 50&nbsp;€ d’achat : plus que <b>" + eur(50 - t) + "</b>";
    dyn.innerHTML = '<p class="gift-h">' + msg + '</p><div class="gift-bar"><i style="width:' + Math.round(Math.min(1, pct) * 100) + '%"></i></div>' + (got.length ? '<p class="gift-got">Offert avec cette commande&nbsp;: ' + got.join(" + ") + '</p>' : '') + '<p class="gift-ship">' + ship + '</p>';
  }
  new MutationObserver(upd).observe(tot, { childList: true, characterData: true, subtree: true });
  new MutationObserver(upd).observe(sum, { attributes: true, attributeFilter: ["hidden"] });
  upd();
})();
