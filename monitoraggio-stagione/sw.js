/* Service worker di Swimbrain: l'app si apre anche senza rete.
   Strategia: risponde subito con la copia in memoria e intanto la aggiorna dalla rete.
   VERSIONE cambia a ogni pubblicazione (la calcola build_github.py): le cache vecchie si cancellano. */
const VERSIONE = 'swimbrain-300a8ed843';
const FILE = ['./', './index.html', './manifest.json', './icona-180.png', './icona-192.png', './icona-512.png', './icona-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; // il resto (font, ecc.) passa senza toccarlo
  e.respondWith(caches.open(VERSIONE).then(async cache => {
    const copia = await cache.match(r, { ignoreSearch: true });
    const rete = fetch(r).then(res => { if (res.ok) cache.put(r, res.clone()); return res; }).catch(() => null);
    if (copia) { e.waitUntil(rete); return copia; }
    return (await rete) || (r.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
