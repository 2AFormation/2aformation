/* 2aFormation — application installable « 2A Stages » (espace étudiants gratuit).
   1. Enregistre le service worker (sw.js) sur les pages étudiantes et dans l'application installée.
   2. Propose l'installation sur téléphone (petite barre discrète, refermable) et gère la page /appli/.
   3. Dans l'application installée : barre de titre, onglets en bas (Accueil, Autour, Mon suivi, Kit, Plus).
   Mesures GoatCounter : « appli-installee », « appli-premiere-ouverture », « appli-clic-installer », « appli-barre-fermee » ;
   les ouvertures de l'application arrivent avec la source « appli » (paramètre utm_source du manifeste). */
(function () {
  var BARRE_ACTIVE = true; // passer à false pour retirer la barre d'installation des pages étudiantes
  var ESPACES = ['/appli/', '/trouver-son-stage/', '/bibliographie/', '/boite-a-outils/', '/guide-memoire/', '/preparer-son-entree/'];
  var chemin = location.pathname;
  var installee = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var etudiant = ESPACES.some(function (e) { return chemin.indexOf(e) === 0; });
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (ua.indexOf('Macintosh') > -1 && navigator.maxTouchPoints > 1);
  var mobile = window.matchMedia('(pointer: coarse)').matches;
  var invite = null;
  // Pages où la barre peut apparaître : l'annuaire (accueil et départements), Autour de moi, le kit candidature, le rétroplanning.
  var PAGES_SANS_BARRE = ['faq', 'methode', 'structures', 'formation', 'accueillir-des-stagiaires', 'donnees'];
  var segment = chemin.indexOf('/trouver-son-stage/') === 0 ? chemin.split('/')[2] || '' : null;
  var pageBarre = segment !== null && PAGES_SANS_BARRE.indexOf(segment) === -1;

  function compter(nom, titre) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: nom, title: titre, event: true }); } catch (e) {}
  }
  function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrire(cle, val) { try { localStorage.setItem(cle, val); } catch (e) {} }

  if (installee) document.documentElement.classList.add('appli-installee');

  // Première ouverture de l'application installée (iPhone et Android) : comptée une seule fois par téléphone.
  // Safari ne signale pas les installations : c'est le seul moyen de les compter sur iPhone.
  if (installee && !lire('appli-premiere-ouverture') && navigator.onLine) {
    var essais = 0;
    (function attendreGoatCounter() {
      if (window.goatcounter && window.goatcounter.count) {
        compter('appli-premiere-ouverture', "Première ouverture de l'application installée");
        ecrire('appli-premiere-ouverture', String(Date.now()));
      } else if (essais++ < 40) {
        setTimeout(attendreGoatCounter, 500);
      }
    })();
  }

  // Nombre de pages étudiantes vues sur ce téléphone : la barre n'apparaît qu'à partir de la deuxième.
  var vues = parseInt(lire('appli-pages-vues') || '0', 10);
  if (etudiant && !installee) { vues += 1; ecrire('appli-pages-vues', String(vues)); }

  // 1. Service worker
  if ('serviceWorker' in navigator && (etudiant || installee)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  // 2. Page /appli/ : afficher les bonnes consignes selon le téléphone
  function preparerPage() {
    var q = function (s) { return document.querySelectorAll(s); };
    q('[data-appli-si-installee]').forEach(function (el) { el.hidden = !installee; });
    q('[data-appli-si-non-installee]').forEach(function (el) { el.hidden = installee; });
    q('[data-appli-ios]').forEach(function (el) { el.hidden = !ios; });
    q('[data-appli-android]').forEach(function (el) { el.hidden = ios; });
    q('[data-appli-installer]').forEach(function (b) {
      b.hidden = !invite;
      b.onclick = installer;
    });
  }

  function installer() {
    compter('appli-clic-installer', "Clic sur « Installer l'appli »");
    if (!invite) { location.href = '/appli/#installer'; return; }
    invite.prompt();
    invite.userChoice.then(function () { invite = null; preparerPage(); fermerBarre(false); });
  }

  // 3. Barre d'installation sur les pages étudiantes (téléphone uniquement, refermable 60 jours)
  var barre = null;
  function barreAutorisee() {
    if (!BARRE_ACTIVE || installee || !pageBarre || !mobile || vues < 2) return false;
    var fermee = parseInt(lire('appli-barre-fermee') || '0', 10);
    return !fermee || (Date.now() - fermee) > 60 * 24 * 3600 * 1000;
  }
  function montrerBarre() {
    if (barre || !barreAutorisee()) return;
    barre = document.createElement('div');
    barre.setAttribute('role', 'region');
    barre.setAttribute('aria-label', "Installer l'application");
    barre.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:50;display:flex;align-items:center;gap:12px;' +
      'background:#2E5B4E;color:#fff;border-radius:14px;padding:12px 12px 12px 14px;box-shadow:0 10px 30px rgba(29,40,43,.25);' +
      'font-size:.88rem;line-height:1.35;max-width:620px;margin:0 auto';
    barre.innerHTML = '<img src="/assets/img/appli-192.png" alt="" width="40" height="40" style="border-radius:9px;flex:none">' +
      '<span style="flex:1"><b>L\'appli gratuite</b> : l\'annuaire et le kit candidature, même sans connexion.</span>' +
      '<button type="button" data-action="ok" style="flex:none;font:inherit;font-weight:700;background:#fff;color:#23473C;border:0;border-radius:999px;padding:8px 14px;cursor:pointer">' +
      (invite ? 'Installer' : 'Comment ?') + '</button>' +
      '<button type="button" data-action="fermer" aria-label="Fermer" style="flex:none;font:inherit;font-size:1.3rem;line-height:1;background:none;color:#fff;border:0;padding:4px 6px;cursor:pointer">×</button>';
    barre.querySelector('[data-action="ok"]').onclick = installer;
    barre.querySelector('[data-action="fermer"]').onclick = function () { fermerBarre(true); };
    document.body.appendChild(barre);
  }
  function fermerBarre(parUtilisateur) {
    if (parUtilisateur) { ecrire('appli-barre-fermee', String(Date.now())); compter('appli-barre-fermee', "Barre d'installation fermée"); }
    if (barre) { barre.remove(); barre = null; }
  }

  // Android et Chrome : le navigateur signale que l'installation est possible
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    invite = e;
    preparerPage();
    if (barre) barre.querySelector('[data-action="ok"]').textContent = 'Installer';
    montrerBarre();
  });
  window.addEventListener('appinstalled', function () {
    compter('appli-installee', 'Application installée');
    invite = null;
    fermerBarre(false);
  });

  // 4. Habillage « application » : uniquement dans l'application installée (le site public ne change pas).
  //    Barre de titre avec bouton retour en haut, cinq onglets en bas, menu « Plus ».
  function nbARelancer() {
    var n = 0, vu = {};
    var rel = function (u) { return u && u.st === 'envoye' && u.dt && u.dt.envoye && (Date.now() - new Date(u.dt.envoye + 'T12:00:00')) / 864e5 >= 10; };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^2a-stages-[0-9AB]{2,3}-suivi$/.test(k || '')) {
          var su = JSON.parse(localStorage.getItem(k) || '{}');
          Object.keys(su).forEach(function (f) { if (!vu[f] && rel(su[f])) { vu[f] = 1; n++; } });
        }
      }
      var au = JSON.parse(localStorage.getItem('2a-stages-autour') || '{}');
      Object.keys(au).forEach(function (f) { if (!vu[f] && rel(au[f])) { vu[f] = 1; n++; } });
    } catch (e) {}
    return n;
  }
  function habiller() {
    var ico = {
      accueil: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      autour: '<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>',
      suivi: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      kit: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
      plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
      retour: '<path d="M15 5l-7 7 7 7"/>'
    };
    var svg = function (n) { return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ico[n] + '</svg>'; };
    var cle = chemin.replace(/index\.html$/, '');
    var onglets = [
      ['accueil', 'Accueil', '/appli/', cle === '/appli/'],
      ['autour', 'Autour', '/trouver-son-stage/autour-de-moi/', cle === '/trouver-son-stage/autour-de-moi/'],
      ['suivi', 'Mon suivi', '/appli/suivi/', cle === '/appli/suivi/'],
      ['kit', 'Kit', '/trouver-son-stage/kit-candidature/', cle === '/trouver-son-stage/kit-candidature/'],
      ['plus', 'Plus', '#plus', false]
    ];
    var titres = {
      '/appli/': '2A Stages', '/appli/suivi/': 'Mon suivi', '/trouver-son-stage/': 'Annuaire', '/trouver-son-stage/autour-de-moi/': 'Autour de moi',
      '/trouver-son-stage/kit-candidature/': 'Kit candidature', '/trouver-son-stage/faq/': 'Vos questions',
      '/trouver-son-stage/methode/': 'La méthode', '/trouver-son-stage/retroplanning/': 'Rétroplanning',
      '/trouver-son-stage/structures/': 'Guide des structures', '/bibliographie/': 'Bibliographie', '/boite-a-outils/': 'Boîte à outils',
      '/guide-memoire/': 'Réussir son mémoire', '/preparer-son-entree/': 'Entrée en formation', '/nouveautes-etudiants/': 'Nouveautés'
    };
    var h1 = document.querySelector('h1');
    var titre = titres[cle] || (h1 ? h1.textContent.replace(/^Trouver son stage (en |dans l'|dans le |dans la |dans les |à |aux )?/i, '').replace(/^\w/, function (c) { return c.toUpperCase(); }) : '2A Stages');
    if (titre.length > 28) titre = titre.slice(0, 27) + '…';
    var css = document.createElement('style');
    css.textContent =
      'header.top,footer.site,.crumbs,.share,.skip{display:none!important}' +
      'body{padding-top:calc(56px + env(safe-area-inset-top));padding-bottom:calc(68px + env(safe-area-inset-bottom))}' +
      '.panier{bottom:calc(64px + env(safe-area-inset-bottom))!important}' +
      '.ap-haut{position:fixed;top:0;left:0;right:0;z-index:60;height:calc(56px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top);background:#2E5B4E;color:#fff;display:flex;align-items:center;gap:6px;padding-inline:8px 14px;box-sizing:border-box}' +
      '.ap-haut button{all:unset;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%}' +
      '.ap-haut b{font-family:var(--display);font-size:1.12rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ap-haut img{width:30px;height:30px;border-radius:7px;margin-left:6px}' +
      '.ap-bas{position:fixed;bottom:0;left:0;right:0;z-index:80;background:#fff;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(5,1fr);padding-bottom:env(safe-area-inset-bottom)}' +
      '.ap-bas a{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 2px 8px;font-size:.7rem;font-weight:700;color:var(--muted);text-decoration:none;line-height:1.1;text-align:center}' +
      '.ap-bas a[aria-current]{color:#2E5B4E}' +
      '.ap-bas a[aria-current] svg{background:#DCE8E2;border-radius:999px;padding:2px 12px;box-sizing:content-box}' +
      '.ap-bas .pastille{position:absolute;top:4px;left:calc(50% + 6px);min-width:18px;height:18px;border-radius:9px;background:#B8572A;color:#fff;font-size:.66rem;line-height:18px;padding:0 5px;box-sizing:border-box}' +
      '.ap-plus{position:fixed;inset:0;z-index:70;background:rgba(29,40,43,.45);display:flex;align-items:flex-end}' +
      '.ap-plus[hidden]{display:none}' +
      '.ap-plus nav{background:#fff;width:100%;border-radius:18px 18px 0 0;padding:10px 0 calc(78px + env(safe-area-inset-bottom));max-height:80vh;overflow:auto}' +
      '.ap-plus nav i{display:block;width:40px;height:4px;border-radius:2px;background:var(--line);margin:4px auto 10px}' +
      '.ap-plus a{display:block;padding:13px 22px;color:var(--ink);text-decoration:none;font-weight:600;border-top:1px solid var(--mist)}' +
      '.ap-plus a small{display:block;font-weight:400;color:var(--muted);font-size:.82rem}';
    document.head.appendChild(css);
    var haut = document.createElement('div');
    haut.className = 'ap-haut';
    haut.innerHTML = (cle === '/appli/' ? '<img src="/assets/img/appli-192.png" alt="">' : '<button type="button" aria-label="Retour">' + svg('retour') + '</button>') + '<b></b>';
    haut.querySelector('b').textContent = titre;
    var retour = haut.querySelector('button');
    if (retour) retour.onclick = function () { if (history.length > 1) history.back(); else location.href = '/appli/'; };
    document.body.insertBefore(haut, document.body.firstChild);
    var nr = nbARelancer();
    var bas = document.createElement('nav');
    bas.className = 'ap-bas';
    bas.setAttribute('aria-label', "Navigation de l'application");
    bas.innerHTML = onglets.map(function (o) {
      return '<a href="' + o[2] + '"' + (o[3] ? ' aria-current="page"' : '') + '>' + svg(o[0]) + o[1] +
        (o[0] === 'suivi' && nr ? '<span class="pastille" aria-label="' + nr + ' à relancer">' + nr + '</span>' : '') + '</a>';
    }).join('');
    document.body.appendChild(bas);
    var plus = document.createElement('div');
    plus.className = 'ap-plus';
    plus.hidden = true;
    plus.innerHTML = '<nav aria-label="Plus"><i></i>' +
      '<a href="/trouver-son-stage/">Annuaire par département</a>' +
      '<a href="/trouver-son-stage/methode/">La méthode pas à pas</a>' +
      '<a href="/trouver-son-stage/retroplanning/">Rétroplanning</a>' +
      '<a href="/trouver-son-stage/structures/">Guide des structures</a>' +
      '<a href="/trouver-son-stage/faq/">Vos questions</a>' +
      '<a href="/bibliographie/">Bibliographie commentée</a>' +
      '<a href="/guide-memoire/">Réussir son mémoire</a>' +
      '<a href="/preparer-son-entree/">Réussir son entrée en formation</a>' +
      '<a href="/boite-a-outils/">Boîte à outils des pros</a>' +
      '<a href="/index.html">Le site 2A Formation<small>Formations, VAE, équipe</small></a></nav>';
    plus.onclick = function (e) { if (e.target === plus) plus.hidden = true; };
    document.body.appendChild(plus);
    bas.querySelector('a[href="#plus"]').onclick = function (e) { e.preventDefault(); plus.hidden = !plus.hidden; };
  }

  function demarrer() {
    preparerPage();
    if (installee) habiller();
    // Après 4 secondes : « Installer » si le navigateur le permet (Android), sinon « Comment ? » vers les consignes de /appli/.
    setTimeout(montrerBarre, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
