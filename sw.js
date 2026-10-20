/* Service worker di Swimbrain: l'app si apre anche senza rete.
   La pagina (index.html) arriva prima dalla rete, così una versione appena pubblicata si vede subito;
   se la rete manca o è troppo lenta (oltre 4 secondi) si usa la copia in memoria.
   Icone e manifest: dalla copia in memoria, aggiornata in sottofondo.
   VERSIONE cambia a ogni pubblicazione (la calcola build_github.py): le cache vecchie si cancellano. */
const VERSIONE = 'swimbrain-4ef584b2d8';
const FILE = ['./', './index.html', './manifest.json', './icona-180.png', './icona-192.png', './icona-512.png', './icona-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
const entro = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('lenta')), ms))]);
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // il resto (font, foglio Google) passa senza toccarlo
  const pagina = r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  if (pagina) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSIONE);
      try {
        const res = await entro(fetch(r, { cache: 'no-cache' }), 4000);   // no-cache: chiede al sito se c'è una versione nuova
        if (res.ok) await cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match(r, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.open(VERSIONE).then(async cache => {
    const copia = await cache.match(r, { ignoreSearch: true });
    const rete = fetch(r).then(res => { if (res.ok) cache.put(r, res.clone()); return res; }).catch(() => null);
    if (copia) { e.waitUntil(rete); return copia; }
    return (await rete) || Response.error();
  }));
});
