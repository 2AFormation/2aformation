/* 2aFormation — application installable « 2A Stages » (espace étudiants gratuit).
   1. Enregistre le service worker (sw.js) sur les pages étudiantes et dans l'application installée.
   2. Propose l'installation sur téléphone (petite barre discrète, refermable) et gère la page /appli/.
   Mesures GoatCounter : « appli-installee », « appli-clic-installer », « appli-barre-fermee » ;
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

  function demarrer() {
    preparerPage();
    // Après 4 secondes : « Installer » si le navigateur le permet (Android), sinon « Comment ? » vers les consignes de /appli/.
    setTimeout(montrerBarre, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
