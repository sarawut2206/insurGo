/* sw.js — service worker (ใช้เฉพาะเวอร์ชันเว็บ/PWA)
 *
 * ใช้ network-first ไม่ใช่ cache-first
 * เหตุผล: ระหว่างพัฒนา cache-first จะเสิร์ฟโค้ดเก่าค้างไว้แม้แก้ไฟล์แล้ว
 * ซึ่งเสี่ยงมากที่จะสาธิตหรืออัดคลิปจากบิลด์เก่าโดยไม่รู้ตัว
 */

const CACHE = 'insurgo-v5';

const ASSETS = [
  './', './index.html', './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/core/ui.js', './js/core/router.js', './js/core/store.js',
  './js/core/native.js', './js/core/nlu.js', './js/core/match.js',
  './js/data/places.js', './js/data/activities.js', './js/data/plans.js',
  './js/screens/trip.js', './js/screens/quote.js', './js/screens/info.js',
  './icons/icon.svg', './icons/logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
