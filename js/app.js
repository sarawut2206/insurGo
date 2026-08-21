/* app.js — จุดเริ่มต้นของแอป
 *
 * ประกอบส่วนต่าง ๆ เข้าด้วยกันและเปิดใช้งาน
 * โค้ดชุดเดียวนี้ทำงานได้ทั้งบนเว็บ PWA และแอปเนทีฟที่ build ด้วย Capacitor
 */

import { $, toast, initSheets, openSheet } from './core/ui.js';
import * as router from './core/router.js';
import { store, log } from './core/store.js';
import {
  isNative, isStandalone, platform, haptic, hideSplash, styleStatusBar,
  onNetworkChange, watchInstallPrompt, promptInstall
} from './core/native.js';

import { initHome, renderAnalysis, restoreTrip } from './screens/trip.js';
import { renderPlans, renderCheckout, renderPolicy, initCheckout } from './screens/quote.js';
import { renderAccount, renderInsurers, renderB2B } from './screens/info.js';

/* ─────────── ลงทะเบียนหน้าจอ ───────────
 * title ใช้ประกาศให้โปรแกรมอ่านหน้าจอทราบเมื่อเปลี่ยนหน้า
 */
router.register('home',      { title: 'หน้าแรก เล่าทริปของคุณ' });
router.register('analyzing', { title: 'กำลังวิเคราะห์ทริป' });
router.register('analysis',  { title: 'ผลการวิเคราะห์ทริป' });
router.register('plans',     { title: 'แผนความคุ้มครองที่เหมาะกับทริป', onEnter: renderPlans });
router.register('checkout',  { title: 'ยืนยันความคุ้มครอง' });
router.register('policy',    { title: 'ความคุ้มครองของคุณ' });
router.register('account',   { title: 'ความคุ้มครองและข้อมูลของฉัน', onEnter: renderAccount });
router.register('insurers',  { title: 'บริษัทประกันภัยในไทย', onEnter: renderInsurers });
router.register('b2b',       { title: 'สำหรับบริษัทประกันภัย', onEnter: renderB2B });

/* ─────────── สถานะเครือข่าย ─────────── */
function initNetwork() {
  const bar = $('#offline-bar');
  let wasOffline = false;

  onNetworkChange(online => {
    bar.hidden = online;
    document.body.style.paddingTop = online ? '' : '38px';
    if (online && wasOffline) toast('กลับมาออนไลน์แล้ว', 'success');
    wasOffline = !online;
  });
}

/* ─────────── ชวนติดตั้งเป็นแอป ─────────── */
function initInstall() {
  if (isStandalone() || store.state.installDismissed) return;

  const card = $('#install-card');
  let mode = null;

  watchInstallPrompt(kind => {
    mode = kind;
    card.hidden = false;
  });

  $('#install-go').addEventListener('click', async () => {
    haptic('medium');
    if (mode === 'ios') { openSheet('ios-sheet'); return; }
    const outcome = await promptInstall();
    log('ผลการติดตั้งแอป: ' + outcome);
    if (outcome === 'accepted') card.hidden = true;
  });

  $('#install-close').addEventListener('click', () => {
    card.hidden = true;
    store.dismissInstall();
  });

  addEventListener('appinstalled', () => {
    card.hidden = true;
    log('ติดตั้งแอปลงเครื่องแล้ว');
    toast('ติดตั้งแล้ว เปิดจากหน้าจอโฮมได้เลย', 'success');
  });
}

/* ─────────── ปุ่มค้นหาความคุ้มครอง ─────────── */
function initMatchButton() {
  $('#btn-match').addEventListener('click', () => {
    haptic('medium');
    router.go('plans');
  });
}

/* ─────────── service worker (เฉพาะบนเว็บ) ─────────── */
function initServiceWorker() {
  // แอปเนทีฟมีไฟล์อยู่ในเครื่องอยู่แล้ว ไม่ต้องใช้ service worker
  if (isNative() || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* เปิดจาก file:// จะลงทะเบียนไม่ได้ */ });
}

/* ─────────── เริ่มทำงาน ─────────── */
function boot() {
  restoreTrip();

  initHome();
  initCheckout();
  initMatchButton();
  initSheets();
  initNetwork();
  initInstall();
  initServiceWorker();

  // ถ้ามีทริปค้างอยู่ ให้หน้าวิเคราะห์พร้อมใช้งานทันทีเมื่อกดย้อนกลับมา
  if (store.state.trip) renderAnalysis();
  if (store.state.policies.length) renderPolicy();

  router.init('home');

  // ปรับสีแถบสถานะของระบบให้เข้ากับธีม แล้วปิดหน้าจอเปิดแอป
  const dark = matchMedia('(prefers-color-scheme: dark)');
  styleStatusBar(dark.matches);
  dark.addEventListener('change', e => styleStatusBar(e.matches));
  hideSplash();

  log(`เปิดแอป (${platform()}${isStandalone() ? ', ติดตั้งแล้ว' : ''})`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
