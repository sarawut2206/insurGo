/* router.js — การนำทางระหว่างหน้าจอ
 *
 * ผูกกับ History API จริง เพื่อให้:
 *   - ปุ่มย้อนกลับของ Android (ทั้งบนเว็บและในแอปเนทีฟ) ทำงานถูกต้อง
 *   - ท่าปัดกลับของ iOS ทำงานได้
 *   - แชร์ลิงก์ตรงไปหน้าใดหน้าหนึ่งได้
 *
 * นี่คือจุดที่แยก "แอปที่ทำมาดี" ออกจาก "เว็บที่ใส่กรอบมือถือ"
 */

import { $, $$ } from './ui.js';
import { haptic, onHardwareBack, exitApp } from './native.js';

const screens = new Map();   // name -> { title, onEnter }
let currentName = null;
let exitArmed = false;

export function register(name, config = {}) {
  screens.set(name, config);
}

export const current = () => currentName;

export function go(name, options = {}) {
  const node = $('#screen-' + name);
  if (!node) return;

  const config = screens.get(name) || {};

  $$('.screen').forEach(s => s.classList.remove('is-active', 'is-back'));
  if (options.back) node.classList.add('is-back');
  node.classList.add('is-active');
  currentName = name;

  config.onEnter?.(options.params);

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (!options.fromPopState) {
    const state = { screen: name };
    if (options.replace) history.replaceState(state, '', '#' + name);
    else history.pushState(state, '', '#' + name);
  }

  // ย้ายโฟกัสไปหัวข้อของหน้าใหม่ ไม่งั้นผู้ใช้คีย์บอร์ดและโปรแกรมอ่านหน้าจอจะค้างอยู่หน้าเดิม
  const heading = node.querySelector('[data-focus]');
  heading?.focus({ preventScroll: true });

  const live = $('#live-region');
  if (live) live.textContent = config.title || '';

  exitArmed = false;
}

export function back() {
  history.back();
}

export function init(startScreen = 'home') {
  history.replaceState({ screen: startScreen }, '', location.hash || '#' + startScreen);

  window.addEventListener('popstate', e => {
    go(e.state?.screen || startScreen, { fromPopState: true, back: true });
  });

  // เปลี่ยน hash ระหว่างใช้งาน เช่น เปิดจาก shortcut ของแอปขณะที่แอปเปิดอยู่แล้ว
  window.addEventListener('hashchange', () => {
    const name = location.hash.replace('#', '');
    if (name && name !== currentName && screens.has(name)) {
      go(name, { fromPopState: true });
    }
  });

  // ปุ่มย้อนกลับของเครื่องบนแอปเนทีฟ
  onHardwareBack(canGoBack => {
    if (canGoBack && currentName !== startScreen) { history.back(); return; }
    // อยู่หน้าแรกแล้ว — กดสองครั้งเพื่อออก กันการออกโดยไม่ตั้งใจ
    if (exitArmed) { exitApp(); return; }
    exitArmed = true;
    haptic('warning');
    $('#toast').textContent = 'กดย้อนกลับอีกครั้งเพื่อออกจากแอป';
    $('#toast').classList.add('is-visible');
    setTimeout(() => { exitArmed = false; $('#toast').classList.remove('is-visible'); }, 2000);
  });

  // ปุ่มทุกตัวที่มี data-go
  $$('[data-go]').forEach(btn => btn.addEventListener('click', () => {
    haptic('light');
    if (btn.dataset.go === 'back') back();
    else go(btn.dataset.go);
  }));

  const start = (location.hash || '').replace('#', '');
  go(start && $('#screen-' + start) ? start : startScreen, { replace: true });
}
