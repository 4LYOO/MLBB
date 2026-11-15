/* Service worker de MLBB Companion — généré par scripts/build-sw.mjs (ne pas modifier out/sw.js).
 *
 * Rôle : garder une copie du site sur l'iPhone pour qu'il s'ouvre instantanément et HORS LIGNE.
 * Stratégies :
 *  - code JS/CSS (« _next/static ») : cache d'abord (ces fichiers ne changent jamais de contenu) ;
 *  - pages et données : réseau d'abord (pour avoir la dernière version), cache si pas de réseau.
 */
const VERSION = "__VERSION__";
const BASE = __BASE__;
const CORE = __CORE__; // précaché à l'installation
const EXTRA = __EXTRA__; // fiches héros et guides, téléchargées ensuite en arrière-plan
const CACHE = `mlbb-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000; // au-delà, on sert la copie locale (réseau trop lent)

/** Ajoute des URL au cache une par une : une erreur n'empêche pas les autres. */
async function addAll(cache, urls) {
  for (const url of urls) {
    try {
      if (!(await cache.match(url))) await cache.add(new Request(url, { cache: "reload" }));
    } catch (e) {
      /* fichier ignoré : il sera mis en cache à la prochaine visite */
    }
  }
}

// 1. Installation : on télécharge le cœur de l'application.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => addAll(cache, CORE))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activation : on supprime les anciennes versions, puis on télécharge les fiches en arrière-plan.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("mlbb-") && key !== CACHE && !key.startsWith("mlbb-ocr-")) await caches.delete(key);
      await self.clients.claim();
      await addAll(await caches.open(CACHE), EXTRA);
    })(),
  );
});

/** Réseau d'abord, avec délai maximal ; sinon copie en cache. */
async function networkFirst(request, ignoreSearch) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS)),
    ]);
    if (response.ok) cache.put(ignoreSearch ? new URL(request.url).pathname : request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch });
    if (cached) return cached;
    if (request.mode === "navigate") return offlinePage();
    throw e;
  }
}

/** Cache d'abord (fichiers dont le nom change à chaque version). */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Moteur OCR : cache dédié et durable (gros fichiers qui changent rarement). */
async function ocrCache(request) {
  const cache = await caches.open("mlbb-ocr-v1");
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

function offlinePage() {
  const html = `<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Hors ligne</title><body style="margin:0;background:#000;color:#fff;font:17px -apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px">
  <div><p style="font-size:22px;font-weight:700">Hors ligne</p><p style="color:#a1a1ad">Cette page n'a pas encore été enregistrée sur ton iPhone.<br>Reconnecte-toi une fois pour la rendre disponible hors ligne.</p>
  <p><a href="${BASE}/" style="color:#f5c542">Retour au draft</a></p></div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// 3. Interception des requêtes du site (uniquement les nôtres, uniquement en lecture).
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE + "/")) return;

  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith(BASE + "/ocr/")) {
    // Moteur OCR : gardé dans un cache séparé qui survit aux mises à jour du site.
    event.respondWith(ocrCache(request));
  } else {
    // Pages, données de navigation Next.js (« ?_rsc=… ») et fichiers JSON :
    // la partie après « ? » (filtres, identifiants techniques) ne change pas le fichier → ignorée.
    event.respondWith(networkFirst(request, true));
  }
});
