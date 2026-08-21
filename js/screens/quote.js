/* screens/quote.js — เทียบแผน · ยืนยัน · กรมธรรม์ */

import { $, $$, esc, baht, toast } from '../core/ui.js';
import { go } from '../core/router.js';
import { haptic, share } from '../core/native.js';
import { store, log, timestamp } from '../core/store.js';
import { matchPlans } from '../core/match.js';
import { PLANS } from '../data/plans.js';
import { TRANSPORT_BY_KEY } from '../data/activities.js';
import { syncBeforeMatch, getTrip } from './trip.js';

let result = null;
let chosen = null;

const tripLine = trip => [
  `${trip.people} คน`,
  `${trip.days} วัน`,
  trip.placeText || 'ไม่ระบุปลายทาง',
  TRANSPORT_BY_KEY[trip.transport]?.label
].filter(Boolean).join(' · ');

/* ═══════════ หน้าเทียบแผน ═══════════ */
export function renderPlans() {
  const trip = syncBeforeMatch();
  if (!trip) { go('home'); return; }

  result = matchPlans(trip);
  log(`จับคู่แผน: พบ ${result.matched.length} แผน คัดออก ${result.excluded.length}`);

  const { matched, excluded } = result;

  $('#plans-body').innerHTML = `
    <div class="trip-summary">${esc(tripLine(trip))}</div>

    <div class="notice">
      <b>ข้อมูลสมมติเพื่อสาธิต</b> — บริษัทพันธมิตร เบี้ยประกัน และทุนประกันทั้งหมด
      เป็นตัวเลขตัวอย่าง ไม่ใช่ข้อเสนอจริงของบริษัทใด
    </div>

    ${matched.length ? matched.map(planCard).join('') : `
      <div class="empty"><span class="empty-mark">🔍</span>
        ไม่พบแผนที่ตรงกับเงื่อนไขนี้ ลองปรับข้อมูลทริปดูอีกครั้ง</div>`}

    ${excluded.length ? `
      <details class="excluded-box">
        <summary>ดูแผนที่ถูกคัดออก ${excluded.length} แผน และเหตุผล</summary>
        ${excluded.map(e => `<div class="excluded-item"><b>${esc(e.name)}</b> — ${esc(e.why)}</div>`).join('')}
      </details>` : ''}

    <p class="card-hint" style="margin-top:16px">ระบบเรียงตามความเหมาะสมกับทริป ไม่ใช่ตามค่าตอบแทน</p>
    <button type="button" class="btn btn-secondary" data-go="insurers">ดูบริษัทประกันภัยจริงในประเทศไทย</button>
  `;

  $$('#plans-body [data-choose]').forEach(btn =>
    btn.addEventListener('click', () => choosePlan(btn.dataset.choose)));

  $$('#plans-body [data-go]').forEach(btn =>
    btn.addEventListener('click', () => { haptic('light'); go(btn.dataset.go); }));
}

function planCard(m, index) {
  const { plan, partner } = m;
  return `
    <article class="plan${index === 0 ? ' is-best' : ''}">
      ${index === 0 ? '<span class="plan-badge">เหมาะที่สุดกับทริปนี้</span>' : ''}
      <div class="plan-head">
        <div class="plan-id">
          <div class="plan-name">${esc(plan.name)}</div>
          <div class="plan-partner">
            <span class="partner-dot" style="background:${partner.tone}"></span>
            ${esc(partner.name)} · ข้อมูลสมมติ
          </div>
        </div>
        <div class="plan-price"><b>${baht(m.total)}</b><span>บาท*</span></div>
      </div>

      <div class="plan-calc">${esc(m.breakdown)}</div>

      ${m.warning ? `<div class="plan-warn"><span>⚠️</span><span>${esc(m.warning)}</span></div>` : ''}

      <div class="sub-label">ทำไมถึงเหมาะ</div>
      <ul class="reason-list">
        ${m.reasons.map(r => `<li class="reason"><span class="reason-mark">✓</span><span>${esc(r)}</span></li>`).join('')}
      </ul>

      <details class="plan-details">
        <summary>ดูทุนประกันและข้อยกเว้น</summary>
        <div class="sub-label">คุ้มครอง (ทุนประกัน)</div>
        <table class="sum-table">
          ${plan.sums.map(s => `<tr><td>${esc(s.item)}</td><td>${esc(s.amount)}</td></tr>`).join('')}
        </table>
        <div class="sub-label">ไม่คุ้มครอง</div>
        <ul class="reason-list">
          ${plan.excludes.map(e => `<li class="reason is-negative"><span class="reason-mark">✕</span><span>${esc(e)}</span></li>`).join('')}
        </ul>
      </details>

      <button type="button" class="btn btn-primary" data-choose="${plan.id}" style="margin-top:12px">เลือกแผนนี้</button>
    </article>`;
}

function choosePlan(planId) {
  chosen = result.matched.find(m => m.plan.id === planId);
  if (!chosen) return;
  store.selectPlan(planId);
  log(`เลือกแผน: ${chosen.plan.name} (${chosen.partner.name})`);
  haptic('medium');
  renderCheckout();
  go('checkout');
}

/* ═══════════ หน้ายืนยัน ═══════════ */
export function renderCheckout() {
  const trip = getTrip();
  if (!chosen || !trip) { go('plans'); return; }

  const { plan, partner } = chosen;
  const start = new Date();
  const end = new Date(start.getTime() + (trip.days - 1) * 86400000);
  const fmt = d => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

  $('#checkout-body').innerHTML = `
    <section class="card">
      <h2 class="card-title">${esc(plan.name)}</h2>
      <p class="card-hint">
        <span class="partner-dot" style="background:${partner.tone};display:inline-block;vertical-align:middle"></span>
        ${esc(partner.name)} · ข้อมูลสมมติ
      </p>
      <table class="sum-table">
        <tr><td>ผู้เดินทาง</td><td>${trip.people} คน</td></tr>
        <tr><td>ระยะเวลา</td><td>${trip.days} วัน</td></tr>
        <tr><td>ปลายทาง</td><td>${esc(trip.placeText || 'ไม่ระบุ')}</td></tr>
        <tr><td>ช่วงคุ้มครอง</td><td>${fmt(start)} – ${fmt(end)}</td></tr>
        <tr><td><b>เบี้ยรวม</b></td><td><b>${baht(chosen.total)} บาท*</b></td></tr>
      </table>
      <p class="card-hint" style="margin:12px 0 0">*ตัวเลขตัวอย่างเพื่อสาธิต ไม่ใช่เบี้ยประกันจริง</p>
    </section>

    <section class="card">
      <h2 class="card-title">คุ้มครองอะไรบ้าง</h2>
      <table class="sum-table">
        ${plan.sums.map(s => `<tr><td>${esc(s.item)}</td><td>${esc(s.amount)}</td></tr>`).join('')}
      </table>
    </section>

    <section class="card tone-warn">
      <h2 class="card-title">ข้อยกเว้นที่ต้องอ่านก่อน</h2>
      <ul class="reason-list">
        ${plan.excludes.map(e => `<li class="reason is-negative"><span class="reason-mark">✕</span><span>${esc(e)}</span></li>`).join('')}
      </ul>
      ${chosen.warning ? `<div class="plan-warn" style="margin-bottom:0"><span>⚠️</span><span>${esc(chosen.warning)}</span></div>` : ''}
    </section>

    <label class="switch">
      <input type="checkbox" id="confirm-check">
      <span>ฉันเข้าใจว่านี่เป็น<b>การจำลอง</b>เพื่อสาธิตแนวคิด ไม่มีการชำระเงินจริง
        ไม่มีกรมธรรม์จริง และไม่มีความคุ้มครองเกิดขึ้นจริง</span>
    </label>
  `;

  const check = $('#confirm-check');
  const button = $('#btn-confirm');
  button.disabled = true;
  check.addEventListener('change', () => { button.disabled = !check.checked; });
}

export function initCheckout() {
  $('#btn-confirm').addEventListener('click', () => {
    const trip = getTrip();
    if (!chosen || !trip) return;

    const start = new Date();
    const end = new Date(start.getTime() + (trip.days - 1) * 86400000);
    const policy = {
      ref: 'DEMO-' + Date.now().toString(36).toUpperCase(),
      planId: chosen.plan.id,
      planName: chosen.plan.name,
      partner: chosen.partner.name,
      tone: chosen.partner.tone,
      people: trip.people,
      days: trip.days,
      place: trip.placeText || 'ไม่ระบุ',
      total: chosen.total,
      sums: chosen.plan.sums,
      from: start.toISOString(),
      to: end.toISOString(),
      issuedAt: timestamp()
    };

    store.addPolicy(policy);
    log(`ออกความคุ้มครองจำลอง: ${policy.ref}`);
    haptic('success');
    renderPolicy(policy);
    go('policy', { replace: true });
  });
}

/* ═══════════ หน้ากรมธรรม์ ═══════════ */
export function renderPolicy(policy = store.state.policies[0]) {
  if (!policy) {
    $('#policy-body').innerHTML = `<div class="empty"><span class="empty-mark">📄</span>ยังไม่มีความคุ้มครอง</div>`;
    return;
  }

  const fmt = iso => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

  $('#policy-body').innerHTML = `
    <div class="policy">
      <span class="policy-stamp">ตัวอย่าง — ไม่ใช่กรมธรรม์จริง</span>
      <h2>${esc(policy.planName)}</h2>
      <p class="policy-partner">${esc(policy.partner)} · ข้อมูลสมมติ</p>
      <div class="policy-grid">
        <div class="policy-cell"><span>ผู้เดินทาง</span><b>${policy.people} คน</b></div>
        <div class="policy-cell"><span>ระยะเวลา</span><b>${policy.days} วัน</b></div>
        <div class="policy-cell"><span>ปลายทาง</span><b>${esc(policy.place)}</b></div>
        <div class="policy-cell"><span>เบี้ยรวม</span><b>${baht(policy.total)} บาท*</b></div>
      </div>
      <div class="policy-ref">
        ${fmt(policy.from)} – ${fmt(policy.to)}<br>
        เลขอ้างอิง ${esc(policy.ref)}
      </div>
    </div>

    <section class="card">
      <h2 class="card-title">ความคุ้มครอง</h2>
      <table class="sum-table">
        ${policy.sums.map(s => `<tr><td>${esc(s.item)}</td><td>${esc(s.amount)}</td></tr>`).join('')}
      </table>
    </section>

    <section class="card tone-info">
      <h2 class="card-title">ในระบบจริงขั้นตอนต่อไปคือ</h2>
      <ul class="reason-list">
        <li class="reason"><span class="reason-mark">1</span><span>ส่งข้อมูลไปยัง API ของบริษัทพันธมิตรเพื่อออกกรมธรรม์</span></li>
        <li class="reason"><span class="reason-mark">2</span><span>ชำระเบี้ยผ่านช่องทางที่ได้รับอนุญาต</span></li>
        <li class="reason"><span class="reason-mark">3</span><span>บริษัทออกกรมธรรม์อิเล็กทรอนิกส์ส่งกลับเข้าแอป</span></li>
        <li class="reason"><span class="reason-mark">4</span><span>แจ้งเคลมผ่านแอปได้ตลอดอายุความคุ้มครอง</span></li>
      </ul>
    </section>

    <button type="button" class="btn btn-secondary" id="btn-share">แชร์ความคุ้มครองนี้</button>
    <button type="button" class="btn btn-secondary" data-go="account">ดูความคุ้มครองทั้งหมด</button>
    <button type="button" class="btn btn-secondary" data-go="home">เริ่มทริปใหม่</button>
  `;

  $('#btn-share').addEventListener('click', async () => {
    const outcome = await share({
      title: 'ประกันไปกับคุณ',
      text: `ตัวอย่างความคุ้มครอง ${policy.planName} · ${policy.people} คน ${policy.days} วัน (ข้อมูลจำลองเพื่อสาธิต)`,
      url: location.origin + location.pathname
    });
    if (outcome === 'copied') toast('คัดลอกลิงก์แล้ว', 'success');
    else if (outcome === 'failed') toast('แชร์ไม่สำเร็จ', 'warn');
  });

  $$('#policy-body [data-go]').forEach(btn =>
    btn.addEventListener('click', () => { haptic('light'); go(btn.dataset.go); }));
}

/** ให้หน้าอื่นเรียกดูแผนที่เลือกไว้ได้ */
export function restoreChosen() {
  const id = store.state.selectedPlanId;
  if (!id || chosen) return;
  const plan = PLANS.find(p => p.id === id);
  if (plan) log('กู้แผนที่เลือกไว้: ' + plan.name);
}
