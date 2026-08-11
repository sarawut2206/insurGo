/* sw.js — service worker
 * ทำให้แอปเปิดใช้งานได้แม้ไม่มีอินเทอร์เน็ต (สำคัญตอนอัดคลิปในที่สัญญาณไม่ดี)
 *
 * ใช้กลยุทธ์ network-first ไม่ใช่ cache-first
 * เหตุผล: ระหว่างพัฒนา cache-first จะเสิร์ฟโค้ดเก่าค้างไว้แม้แก้ไฟล์แล้ว
 * ซึ่งเสี่ยงมากที่จะอัดคลิปจากบิลด์เก่าโดยไม่รู้ตัว
 * network-first ได้ของใหม่เสมอเมื่อออนไลน์ และยังเปิดได้ตามปกติเมื่อออฟไลน์
 */

const CACHE = 'pkkk-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/trip.js',
  './js/store.js',
  './js/app.js',
  './icons/logo.png'
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
        // เก็บสำเนาล่าสุดไว้ใช้ตอนออฟไลน์
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
