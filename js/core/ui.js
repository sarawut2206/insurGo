/* ui.js — เครื่องมือพื้นฐานสำหรับสร้างหน้าจอ */

import { haptic } from './native.js';

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** หนีอักขระพิเศษก่อนใส่ลง innerHTML — ข้อความจากผู้ใช้ต้องผ่านตัวนี้เสมอ */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const baht = n => Number(n).toLocaleString('th-TH');

/** สร้าง element พร้อม attribute และลูก — ใช้แทน innerHTML เมื่อข้อมูลมาจากผู้ใช้ */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .forEach(c => node.append(c));
  return node;
}

/* ─────────── ข้อความแจ้งชั่วคราว ─────────── */
let toastTimer;
export function toast(message, tone = 'info') {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2800);
}

/* ─────────── แผ่นเลื่อนขึ้นจากด้านล่าง ───────────
 * กักโฟกัสไว้ในแผ่นตามมาตรฐาน dialog เพื่อให้ผู้ใช้คีย์บอร์ดไม่หลุดออกไปหลังฉาก
 */
let lastFocused = null;

export function openSheet(id) {
  const sheet = $('#' + id);
  if (!sheet) return;
  lastFocused = document.activeElement;
  sheet.hidden = false;
  haptic('light');

  const focusable = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', sheet);
  focusable[0]?.focus();

  sheet._trap = e => {
    if (e.key === 'Escape') { closeSheet(id); return; }
    if (e.key !== 'Tab' || !focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', sheet._trap);
}

export function closeSheet(id) {
  const sheet = $('#' + id);
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  if (sheet._trap) document.removeEventListener('keydown', sheet._trap);
  lastFocused?.focus?.();
}

export function initSheets() {
  $$('.sheet-backdrop').forEach(back => {
    back.addEventListener('click', e => { if (e.target === back) closeSheet(back.id); });
    $$('[data-close-sheet]', back).forEach(btn =>
      btn.addEventListener('click', () => closeSheet(back.id)));
  });
}

/* ─────────── ตัวช่วยสร้างชิ้นส่วนที่ใช้ซ้ำ ─────────── */

export const reasonRow = (text, mark = '✓') =>
  `<li class="reason"><span class="reason-mark">${mark}</span><span>${esc(text)}</span></li>`;

export const reasonList = (items, mark = '✓') =>
  `<ul class="reason-list">${items.map(t => reasonRow(t, mark)).join('')}</ul>`;

export function card({ title, hint, body, tone = '' }) {
  return `<section class="card ${tone}">
    ${title ? `<h2 class="card-title">${title}</h2>` : ''}
    ${hint ? `<p class="card-hint">${hint}</p>` : ''}
    ${body}
  </section>`;
}
