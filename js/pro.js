/* Espace professionnels : cartes par métier + discussion avec Zeste (demande envoyée par e-mail via Web3Forms) */
(function () {
  "use strict";
  var KEY = "027d9344-9e05-43ea-8a2f-2f5c3c5cd6e5";
  var MAIL = "nomeo.atelier@gmail.com";
  var box = document.getElementById("pz");
  if (!box) return;
  var log = document.getElementById("pz-log");
  var input = document.getElementById("pz-input");
  var METIERS = {};
  try { METIERS = JSON.parse(box.getAttribute("data-metiers")); } catch (e) {}

  /* ---------- Onglets par métier ---------- */
  var tabs = [].slice.call(document.querySelectorAll(".mt-tab"));
  function pick(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      var p = document.getElementById(x.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pick(t); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (j == null) return;
      e.preventDefault();
      pick(tabs[(j + tabs.length) % tabs.length], true);
    });
  });
  document.querySelectorAll(".mt-go").forEach(function (b) {
    b.addEventListener("click", function () {
      start(b.getAttribute("data-metier"));
      document.getElementById("parler").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Discussion ---------- */
  var A; // réponses
  var STEPS = ["metier", "objets", "qte", "logo", "mot", "contact"];
  var step = 0;

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function say(text) {
    var li = el("li", "pz-b pz-z");
    li.appendChild(el("span", "pz-who", "Zeste"));
    li.appendChild(el("p", null, text));
    log.appendChild(li);
    keepInView();
  }
  function me(text, back) {
    var li = el("li", "pz-b pz-me");
    li.appendChild(el("p", null, text));
    if (back != null) {
      var m = el("button", "pz-edit", "Modifier");
      m.type = "button";
      m.addEventListener("click", function () { rewind(back); });
      li.appendChild(m);
    }
    log.appendChild(li);
  }
  function keepInView() {
    var r = box.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 0) {
      input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function chips(list, multi, onDone, pre) {
    input.innerHTML = "";
    var wrap = el("div", "pz-chips");
    var picked = (pre || []).slice();
    list.forEach(function (label) {
      var b = el("button", "pz-chip", label);
      b.type = "button";
      if (multi) {
        b.setAttribute("aria-pressed", String(picked.indexOf(label) >= 0));
        b.addEventListener("click", function () {
          var i = picked.indexOf(label);
          if (i >= 0) picked.splice(i, 1); else picked.push(label);
          b.setAttribute("aria-pressed", String(i < 0));
          ok.disabled = !picked.length;
        });
      } else {
        b.addEventListener("click", function () { onDone(label); });
      }
      wrap.appendChild(b);
    });
    input.appendChild(wrap);
    if (multi) {
      var ok = el("button", "btn btn-y pz-ok", "Valider");
      ok.type = "button";
      ok.disabled = !picked.length;
      ok.addEventListener("click", function () { onDone(picked.slice()); });
      input.appendChild(ok);
    }
  }

  function ask() {
    var s = STEPS[step];
    if (s === "metier") {
      say("Bonjour, moi c’est Zeste, le chef d’atelier. Vous êtes quoi comme établissement ?");
      var names = Object.keys(METIERS).map(function (k) { return METIERS[k].t; });
      chips(names.concat(["Autre"]), false, function (v) {
        A.metier = v;
        A.key = Object.keys(METIERS).filter(function (k) { return METIERS[k].t === v; })[0] || "";
        me(v, 0); next();
      });
    } else if (s === "objets") {
      say("Qu’est-ce qui vous intéresse ? Vous pouvez en choisir plusieurs.");
      var objs = A.key && METIERS[A.key] ? METIERS[A.key].objs : ["Porte-clés au logo", "Sous-verres", "Chevalet de table", "Plaque de porte", "Porte-badge", "Logo en relief"];
      chips(objs.concat(["Autre chose", "Je ne sais pas encore"]), true, function (v) {
        A.objets = v; me(v.join(", "), 1); next();
      }, A.objets);
    } else if (s === "qte") {
      say("Combien de pièces environ ?");
      chips(["Moins de 20", "20 à 50", "50 à 100", "Plus de 100", "Je ne sais pas"], false, function (v) {
        A.qte = v; me(v, 2); next();
      });
    } else if (s === "logo") {
      say("Vous avez un logo à mettre dessus ?");
      chips(["Oui, je vous l’envoie", "Non, juste du texte", "Pas encore, il faudrait en faire un"], false, function (v) {
        A.logo = v; me(v, 3); next();
      });
    } else if (s === "mot") {
      say("Un mot sur votre projet ? Une date, une couleur, une idée… (facultatif)");
      input.innerHTML = "";
      var ta = el("textarea", "pz-ta");
      ta.rows = 3; ta.maxLength = 1500;
      ta.setAttribute("aria-label", "Votre message (facultatif)");
      ta.placeholder = "Ex. 40 sous-verres pour l’ouverture de la terrasse en mars";
      ta.value = A.mot || "";
      var row = el("div", "pz-row");
      var skip = el("button", "btn btn-glass", "Passer"); skip.type = "button";
      var ok = el("button", "btn btn-y", "Continuer"); ok.type = "button";
      skip.addEventListener("click", function () { A.mot = ""; me("Rien à ajouter", 4); next(); });
      ok.addEventListener("click", function () { A.mot = ta.value.trim(); me(A.mot || "Rien à ajouter", 4); next(); });
      row.appendChild(skip); row.appendChild(ok);
      input.appendChild(ta); input.appendChild(row);
    } else if (s === "contact") {
      say("Parfait. Comment on vous recontacte ? Je vous réponds sous 24 h avec une maquette et un prix.");
      contactForm();
    }
  }

  function field(label, type, name, ph, req) {
    var w = el("label", "pz-f");
    w.appendChild(el("span", null, label + (req ? " *" : "")));
    var i = el("input");
    i.type = type; i.name = name; i.placeholder = ph || "";
    if (type === "email") i.autocomplete = "email";
    if (type === "tel") i.autocomplete = "tel";
    if (name === "nom") i.autocomplete = "name";
    if (name === "structure") i.autocomplete = "organization";
    i.value = A[name] || "";
    w.appendChild(i);
    return w;
  }

  function contactForm() {
    input.innerHTML = "";
    var f = el("form", "pz-form");
    f.noValidate = true;
    f.appendChild(field("Votre nom", "text", "nom", "Ex. Sophie Martin", true));
    f.appendChild(field("Votre établissement", "text", "structure", "Ex. Café des Halles", false));
    f.appendChild(field("Téléphone", "tel", "tel", "06 00 00 00 00", false));
    f.appendChild(field("E-mail", "email", "email", "vous@exemple.fr", false));
    var hp = el("input"); hp.type = "text"; hp.name = "botcheck"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.className = "pz-hp"; hp.setAttribute("aria-hidden", "true");
    f.appendChild(hp);
    var note = el("p", "pz-note", "Téléphone ou e-mail : au moins l’un des deux.");
    f.appendChild(note);
    var send = el("button", "btn btn-y pz-send", "Envoyer à Zeste"); send.type = "submit";
    f.appendChild(send);
    var st = el("p", "pz-state"); st.setAttribute("role", "status");
    f.appendChild(st);
    input.appendChild(f);

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (hp.value) return;
      ["nom", "structure", "tel", "email"].forEach(function (k) { A[k] = f.elements[k].value.trim(); });
      if (!A.nom) { st.textContent = "Indiquez votre nom."; f.elements.nom.focus(); return; }
      if (!A.tel && !A.email) { st.textContent = "Laissez un téléphone ou un e-mail pour qu’on puisse vous répondre."; f.elements.tel.focus(); return; }
      if (A.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(A.email)) { st.textContent = "L’adresse e-mail semble incomplète."; f.elements.email.focus(); return; }
      send.disabled = true; st.textContent = "Envoi en cours…";
      var body = {
        access_key: KEY,
        subject: "Demande pro Noméo : " + (A.structure || A.nom) + " (" + A.metier + ")",
        from_name: "Site Noméo, espace pros",
        name: A.nom,
        phone: A.tel,
        message: resume()
      };
      if (A.email) body.email = A.email;
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (j) { return r.ok && j.success; }); })
        .then(function (ok) {
          if (!ok) throw new Error("fail");
          input.innerHTML = "";
          me("Envoyé ✓");
          say("Merci " + A.nom.split(" ")[0] + " ! J’ai bien reçu votre demande. Je reviens vers vous sous 24 h avec une maquette 3D et un prix. Gratuit et sans engagement.");
          var again = el("button", "text-btn pz-again", "Faire une autre demande"); again.type = "button";
          again.addEventListener("click", function () { start(); });
          input.appendChild(again);
        })
        .catch(function () {
          send.disabled = false;
          st.innerHTML = "";
          st.appendChild(document.createTextNode("L’envoi n’a pas marché. Écrivez-nous directement à " + MAIL + " : "));
          var a = el("a", null, "ouvrir un e-mail prêt à envoyer");
          a.href = "mailto:" + MAIL + "?subject=" + encodeURIComponent("Demande pro Noméo") + "&body=" + encodeURIComponent(resume());
          st.appendChild(a);
        });
    });
  }

  function resume() {
    return [
      "Métier : " + (A.metier || "-"),
      "Objets : " + ((A.objets || []).join(", ") || "-"),
      "Quantité : " + (A.qte || "-"),
      "Logo : " + (A.logo || "-"),
      "Message : " + (A.mot || "-"),
      "",
      "Nom : " + (A.nom || "-"),
      "Établissement : " + (A.structure || "-"),
      "Téléphone : " + (A.tel || "-"),
      "E-mail : " + (A.email || "-")
    ].join("\n");
  }

  function next() { step++; ask(); }
  function rewind(to) {
    // On repart de la question « to » en gardant les réponses déjà données
    step = to;
    log.innerHTML = "";
    var keep = step;
    step = 0;
    replay(keep);
  }
  function replay(upto) {
    // rejoue les réponses déjà données jusqu'à « upto », puis repose la question
    var labels = {
      metier: function () { return A.metier; },
      objets: function () { return (A.objets || []).join(", "); },
      qte: function () { return A.qte; },
      logo: function () { return A.logo; },
      mot: function () { return A.mot || "Rien à ajouter"; }
    };
    var Q = {
      metier: "Bonjour, moi c’est Zeste, le chef d’atelier. Vous êtes quoi comme établissement ?",
      objets: "Qu’est-ce qui vous intéresse ? Vous pouvez en choisir plusieurs.",
      qte: "Combien de pièces environ ?",
      logo: "Vous avez un logo à mettre dessus ?",
      mot: "Un mot sur votre projet ? Une date, une couleur, une idée… (facultatif)"
    };
    for (var i = 0; i < upto; i++) { say(Q[STEPS[i]]); me(labels[STEPS[i]](), i); }
    step = upto;
    if (upto <= 1 && upto === 0) { A.objets = A.objets || []; }
    ask();
  }

  function start(key) {
    A = { objets: [] };
    log.innerHTML = "";
    step = 0;
    if (key && METIERS[key]) {
      A.key = key; A.metier = METIERS[key].t;
      say("Bonjour, moi c’est Zeste, le chef d’atelier. Vous êtes quoi comme établissement ?");
      me(A.metier, 0);
      step = 1;
    }
    ask();
  }

  start();
})();
