/* 2aFormation — service worker de l'application « 2A Stages » (application web installable).
   Il n'est enregistré que sur les pages étudiantes et dans l'application installée (voir assets/js/appli.js).
   - Pages : réseau d'abord (toujours la version à jour), copie gardée pour le hors connexion.
   - Fichiers (styles, images, données de l'annuaire, documents) : copie locale servie tout de suite, mise à jour en arrière-plan.
   - Rien n'est intercepté hors du site (Stripe, Formspree, GoatCounter, etc.).
   Pour tout désactiver en urgence : remplacer ce fichier par le contenu de la ligne suivante, sans les barres obliques.
   // self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c)))).then(()=>self.registration.unregister())));
*/
const VERSION = 'v1';
const PAGES = 'pages-' + VERSION;
const FICHIERS = 'fichiers-' + VERSION;
const POLICES = 'polices-' + VERSION;
const HORS_LIGNE = '/hors-connexion.html';

// Pages gardées dès l'installation, pour que l'essentiel marche hors connexion.
const ESSENTIEL = [
  '/appli/',
  '/appli/suivi/',
  '/trouver-son-stage/',
  '/trouver-son-stage/autour-de-moi/',
  '/trouver-son-stage/kit-candidature/',
  '/trouver-son-stage/faq/',
  '/trouver-son-stage/retroplanning/',
  '/trouver-son-stage/methode/',
  '/trouver-son-stage/structures/',
  '/bibliographie/',
  '/boite-a-outils/',
  '/guide-memoire/',
  '/preparer-son-entree/',
];
const FICHIERS_ESSENTIELS = [
  HORS_LIGNE,
  '/assets/img/logo.png',
  '/assets/img/appli-192.png',
  '/trouver-son-stage/donnees/communes.json',
];

// Adresse « propre » d'une page : sans paramètres ni « index.html » final.
function clePage(url) {
  const u = new URL(url);
  let p = u.pathname.replace(/index\.html$/, '');
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  return u.origin + p;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    const fichiers = await caches.open(FICHIERS);
    // Chaque fichier est demandé séparément : une erreur n'empêche pas l'installation.
    await Promise.all([
      ...ESSENTIEL.map((p) => fetch(p, { cache: 'no-cache' }).then((r) => r.ok && pages.put(clePage(new URL(p, self.location).href), r)).catch(() => {})),
      ...FICHIERS_ESSENTIELS.map((f) => fetch(f, { cache: 'no-cache' }).then((r) => r.ok && fichiers.put(new URL(f, self.location).href, r)).catch(() => {})),
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const garder = [PAGES, FICHIERS, POLICES];
    for (const c of await caches.keys()) if (!garder.includes(c)) await caches.delete(c);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : copie locale, sinon réseau.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(copieDabord(req, POLICES));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    event.respondWith(page(req));
    return;
  }
  event.respondWith(copieDabord(req, FICHIERS));
});

// Pages : réseau d'abord, copie locale si pas de connexion, sinon page « hors connexion ».
async function page(req) {
  const cache = await caches.open(PAGES);
  const cle = clePage(req.url);
  try {
    const rep = await fetch(req);
    if (rep.status === 200 && rep.type === 'basic') cache.put(cle, rep.clone()).catch(() => {});
    return rep;
  } catch (e) {
    const copie = await cache.match(cle);
    if (copie) return copie;
    const secours = await caches.match(new URL(HORS_LIGNE, self.location).href);
    return secours || new Response('<h1>Pas de connexion</h1>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// Fichiers : copie locale tout de suite, mise à jour en arrière-plan.
async function copieDabord(req, nom) {
  const cache = await caches.open(nom);
  const copie = await cache.match(req);
  const reseau = fetch(req).then((rep) => {
    if (rep.status === 200 || rep.type === 'opaque') cache.put(req, rep.clone()).catch(() => {});
    return rep;
  }).catch(() => null);
  if (copie) return copie;
  const rep = await reseau;
  if (rep) return rep;
  // Hors connexion : une version précédente du même fichier (ex. feuille de style d'une autre version).
  const ancienne = await cache.match(req, { ignoreSearch: true });
  return ancienne || new Response('', { status: 504 });
}
