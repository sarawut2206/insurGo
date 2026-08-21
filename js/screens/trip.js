/* screens/trip.js — หน้าแรกและหน้าผลการวิเคราะห์ */

import { $, $$, esc, toast } from '../core/ui.js';
import { go } from '../core/router.js';
import { haptic } from '../core/native.js';
import { store, log } from '../core/store.js';
import { understand, suggestActivities } from '../core/nlu.js';
import { assessRisks } from '../core/match.js';
import { ACTIVITY_BY_ID, ACTIVITY_CATS, ACTIVITIES, TRANSPORT } from '../data/activities.js';
import { PLACES, lookupPlace } from '../data/places.js';
import { TRIP_EXAMPLES } from '../data/plans.js';

const RISK_DOT = { high: '🔴', mid: '🟠', low: '🟢' };

/** ทริปที่กำลังแก้ไขอยู่ — เก็บใน store เมื่อผู้ใช้เดินหน้าต่อ */
let trip = null;

export const getTrip = () => trip;

/* ═══════════ หน้าแรก ═══════════ */
export function initHome() {
  $('#example-chips').innerHTML = TRIP_EXAMPLES
    .map(t => `<button type="button" class="chip" data-example="${esc(t)}">${esc(t)}</button>`)
    .join('');

  $$('#example-chips .chip').forEach(chip =>
    chip.addEventListener('click', () => {
      $('#trip-input').value = chip.dataset.example;
      analyze();
    }));

  $('#btn-analyze').addEventListener('click', analyze);

  // Enter ส่งเลย, Shift+Enter ขึ้นบรรทัดใหม่ — พฤติกรรมที่ผู้ใช้แอปแชตคุ้นเคย
  $('#trip-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); }
  });
}

function analyze() {
  const text = $('#trip-input').value.trim();
  if (!text) {
    toast('เล่าทริปของคุณสักหน่อยก่อนครับ', 'warn');
    haptic('warning');
    $('#trip-input').focus();
    return;
  }

  haptic('medium');
  document.activeElement?.blur();          // ปิดคีย์บอร์ดบนมือถือ

  trip = understand(text);
  store.setTrip(trip);
  log(`วิเคราะห์ทริป: "${text.slice(0, 60)}"`);

  renderAnalysis();

  // ผู้ที่ตั้งค่าลดการเคลื่อนไหวไว้ ไม่ควรถูกบังคับให้รอแอนิเมชัน
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    go('analysis');
    return;
  }

  go('analyzing');
  const steps = $$('#analyzing-steps li');
  steps.forEach(li => li.classList.remove('is-done'));
  steps.forEach((li, i) => setTimeout(() => li.classList.add('is-done'), 150 + i * 180));

  setTimeout(() => {
    if (location.hash !== '#analyzing') return;   // ผู้ใช้กดย้อนกลับระหว่างรอ
    haptic('success');
    go('analysis', { replace: true });
  }, 150 + steps.length * 180 + 200);
}

/* ═══════════ หน้าผลการวิเคราะห์ ═══════════ */
export function renderAnalysis() {
  if (!trip) { go('home'); return; }

  $('#analysis-body').innerHTML = `
    <div class="said">
      <div class="said-label">คุณเล่าว่า</div>
      <p class="said-text">“${esc(trip.raw)}”</p>
    </div>

    <section class="card">
      <h2 class="card-title">สิ่งที่ระบบเข้าใจ</h2>
      <p class="card-hint">แก้ได้ทุกช่อง — ระบบจะไม่เดาแทนคุณโดยไม่บอก</p>

      <div class="field-grid">
        <label class="field">จำนวนคน
          <select id="f-people"></select>
        </label>
        <label class="field">จำนวนวัน
          <select id="f-days"></select>
        </label>
        <label class="field span-2">ปลายทาง <span class="field-note">พิมพ์เองได้ หรือเลือกจากรายการ</span>
          <input id="f-place" list="place-options" autocomplete="off" placeholder="เช่น ชลบุรี, เชียงใหม่, ญี่ปุ่น">
          <datalist id="place-options"></datalist>
        </label>
        <label class="field span-2">เดินทางด้วย
          <select id="f-transport"></select>
        </label>
      </div>

      <label class="switch">
        <input type="checkbox" id="f-abroad">
        <span><b>ปลายทางอยู่ต่างประเทศ</b> — ระบบจะเลือกแผนที่คุ้มครองค่ารักษาพยาบาลนอกประเทศให้</span>
      </label>

      <div id="place-note"></div>
      <div id="understood"></div>
    </section>

    <div id="missing-note"></div>

    <section class="card">
      <h2 class="card-title">กิจกรรมในทริปนี้ <span id="act-count" class="field-note"></span></h2>
      <p class="card-hint">AI เลือกจากที่คุณเล่าให้แล้ว และเสนอกิจกรรมที่มักเกิดในทริปแบบนี้เพิ่ม — <b>กดเลือกได้หลายอย่าง</b> ยิ่งเลือกครบ ระบบยิ่งจับคู่ได้แม่นขึ้น</p>
      <div id="act-suggested"></div>
      <label for="act-input" class="sr-only">เพิ่มกิจกรรมเอง</label>
      <div class="chip-row" style="gap:8px;flex-wrap:nowrap">
        <input id="act-input" class="field" style="flex:1;min-height:44px;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface-sunken)" placeholder="พิมพ์กิจกรรมอื่นที่ไม่มีในรายการ" autocomplete="off">
        <button type="button" class="btn-mini" id="act-add" style="background:var(--navy-700);color:#fff">เพิ่ม</button>
      </div>
      <div id="act-custom"></div>
      <details class="plan-details">
        <summary>ดูกิจกรรมทั้งหมด ${ACTIVITIES.length} รายการ</summary>
        <div id="act-catalog"></div>
      </details>
    </section>

    <section class="card">
      <h2 class="card-title">ความเสี่ยงของทริปนี้</h2>
      <div id="risk-list"></div>
    </section>
  `;

  fillFields();
  renderActivities();
  renderRisks();
  bindFields();
}

function fillFields() {
  const opt = (v, label, selected) =>
    `<option value="${esc(v)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

  $('#f-people').innerHTML = Array.from({ length: 10 }, (_, i) =>
    opt(i + 1, `${i + 1} คน`, trip.people === i + 1)).join('');

  $('#f-days').innerHTML = Array.from({ length: 30 }, (_, i) =>
    opt(i + 1, `${i + 1} วัน`, trip.days === i + 1)).join('');

  $('#f-place').value = trip.placeText;
  $('#place-options').innerHTML = PLACES
    .map(p => `<option value="${esc(p.name)}">${p.abroad ? 'ต่างประเทศ' : ''}</option>`).join('');

  $('#f-transport').innerHTML =
    opt('', '— ยังไม่ระบุ —', !trip.transport) +
    TRANSPORT.map(t => opt(t.key, t.label, trip.transport === t.key)).join('');

  $('#f-abroad').checked = trip.abroad;

  $('#understood').innerHTML = trip.notes.length
    ? `<ul class="reason-list">${trip.notes.map(n =>
        `<li class="reason"><span class="reason-mark">✓</span><span><b>${esc(n.field)}:</b> ${esc(n.text)}</span></li>`).join('')}</ul>`
    : '';

  $('#missing-note').innerHTML = trip.missing.length
    ? `<div class="notice"><b>ระบบไม่แน่ใจเรื่อง ${esc(trip.missing.join(', '))}</b> — เลือกเพิ่มในช่องด้านบนได้ ผลจะแม่นขึ้น</div>`
    : '';

  updatePlaceNote();
}

function updatePlaceNote() {
  const typed = $('#f-place').value.trim();
  const known = lookupPlace(typed);
  const box = $('#place-note');

  if (!typed) { box.innerHTML = ''; return; }
  box.innerHTML = known
    ? `<p class="card-hint" style="margin:12px 0 0">รู้จัก “${esc(known.name)}” — ${esc(known.note)}</p>`
    : `<div class="notice" style="margin:12px 0 0">ระบบยังไม่รู้จัก “${esc(typed)}” จึงประเมินเป็นการเดินทางทั่วไป ถ้าเป็นต่างประเทศ กรุณาติ๊กช่องด้านล่าง</div>`;
}

/* ─────────── กิจกรรม ─────────── */
function chipHTML(activity, isOn) {
  const guessed = isOn && trip.guessed.includes(activity.id);
  return `<button type="button" class="chip${isOn ? ' is-on' : ''}${guessed ? ' is-guessed' : ''}"
    data-act="${activity.id}"${guessed ? ' title="ระบบเลือกให้เบื้องต้น กดยกเลิกได้ถ้าไม่ตรง"' : ''}>
    <span class="chip-dot">${RISK_DOT[activity.risk]}</span>${guessed ? '✨ ' : ''}${esc(activity.label)}</button>`;
}

function renderActivities() {
  const chosen = trip.activities;

  // เรียงให้ที่เลือกแล้วอยู่ก่อน เพื่อให้เห็นสิ่งที่ระบบเข้าใจทันที
  const ordered = [...trip.suggested].sort((a, b) =>
    (chosen.includes(a) ? 0 : 1) - (chosen.includes(b) ? 0 : 1));

  $('#act-suggested').innerHTML =
    `<div class="chip-row">${ordered.map(id => chipHTML(ACTIVITY_BY_ID[id], chosen.includes(id))).join('')}</div>`;

  $('#act-catalog').innerHTML = ACTIVITY_CATS.map(cat => {
    const items = ACTIVITIES.filter(a => a.cat === cat.key);
    return `<div class="sub-label">${cat.icon} ${esc(cat.label)}</div>
      <div class="chip-row">${items.map(a => chipHTML(a, chosen.includes(a.id))).join('')}</div>`;
  }).join('');

  $('#act-custom').innerHTML = trip.custom.length
    ? `<div class="chip-row">${trip.custom.map((txt, i) =>
        `<span class="chip is-on is-custom">✏️ ${esc(txt)}<b class="chip-x" data-remove="${i}" role="button" tabindex="0" aria-label="ลบ ${esc(txt)}">✕</b></span>`).join('')}</div>`
    : '';

  const guessedCount = trip.guessed.filter(id => chosen.includes(id)).length;
  $('#act-count').textContent =
    `เลือกแล้ว ${chosen.length + trip.custom.length} · เสนอ ${trip.suggested.length}` +
    (guessedCount ? ` · ✨ ระบบเดาให้ ${guessedCount}` : '');

  $$('#analysis-body .chip[data-act]').forEach(chip =>
    chip.addEventListener('click', () => toggleActivity(chip.dataset.act)));

  $$('#act-custom [data-remove]').forEach(x =>
    x.addEventListener('click', e => {
      e.stopPropagation();
      trip.custom.splice(Number(x.dataset.remove), 1);
      renderActivities();
      renderRisks();
    }));
}

function toggleActivity(id) {
  const i = trip.activities.indexOf(id);
  if (i === -1) {
    trip.activities.push(id);
    // เลือกจากคลัง → ดันขึ้นแถวเสนอด้วย เพื่อไม่ให้หายไปจากสายตา
    if (!trip.suggested.includes(id)) trip.suggested.push(id);
  } else {
    trip.activities.splice(i, 1);
  }
  haptic('light');
  renderActivities();
  renderRisks();
}

function renderRisks() {
  syncTripFromFields();
  const risks = assessRisks(trip);

  $('#risk-list').innerHTML = risks.length
    ? `<ul class="reason-list">${risks.map(r =>
        `<li class="reason"><span class="reason-mark">${r.icon}</span>
         <span><b>${esc(r.title)}</b><br><span style="color:var(--ink-soft)">${esc(r.why)}</span></span></li>`).join('')}</ul>`
    : `<p class="card-hint" style="margin:0">ยังไม่พบความเสี่ยงเด่นจากข้อมูลที่ให้มา ลองเลือกกิจกรรมเพิ่มเพื่อให้ระบบประเมินได้ละเอียดขึ้น</p>`;
}

function syncTripFromFields() {
  const typed = $('#f-place')?.value.trim() ?? '';
  const known = lookupPlace(typed);

  trip.people = Number($('#f-people').value);
  trip.days = Number($('#f-days').value);
  trip.placeText = typed;
  trip.place = known;
  trip.abroad = $('#f-abroad').checked;
  trip.transport = $('#f-transport').value;

  store.setTrip(trip);
}

function bindFields() {
  ['f-people', 'f-days', 'f-abroad'].forEach(id =>
    $('#' + id).addEventListener('change', renderRisks));

  // เปลี่ยนวิธีเดินทาง → ปรับกิจกรรมการเดินทางให้ตรงกันอัตโนมัติ
  $('#f-transport').addEventListener('change', () => {
    TRANSPORT.forEach(t => {
      const i = trip.activities.indexOf(t.activity);
      if (i !== -1) trip.activities.splice(i, 1);
    });
    const next = TRANSPORT.find(t => t.key === $('#f-transport').value);
    if (next) {
      trip.activities.push(next.activity);
      if (!trip.suggested.includes(next.activity)) trip.suggested.push(next.activity);
    }
    renderActivities();
    renderRisks();
  });

  $('#f-place').addEventListener('input', () => {
    const known = lookupPlace($('#f-place').value.trim());
    if (known) {
      $('#f-abroad').checked = known.abroad;
      // เปลี่ยนปลายทาง → เสนอกิจกรรมชุดใหม่ที่เข้ากับที่นั่น โดยคงที่เลือกไว้แล้ว
      trip.suggested = suggestActivities({
        place: known, abroad: known.abroad, alreadyPicked: trip.activities
      });
      renderActivities();
    }
    updatePlaceNote();
    renderRisks();
  });

  const addCustom = () => {
    const value = $('#act-input').value.trim();
    if (!value) return;
    if (!trip.custom.includes(value)) trip.custom.push(value);
    $('#act-input').value = '';
    log('ผู้ใช้เพิ่มกิจกรรมเอง: ' + value);
    haptic('light');
    renderActivities();
    renderRisks();
  };

  $('#act-add').addEventListener('click', addCustom);
  $('#act-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
  });
}

export function syncBeforeMatch() {
  if (trip) syncTripFromFields();
  return trip;
}

/** กู้ทริปที่ค้างไว้ตอนเปิดแอปใหม่ */
export function restoreTrip() {
  if (store.state.trip) trip = store.state.trip;
}
