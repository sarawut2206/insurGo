/* app.js — UI controller (เวอร์ชัน trip journey แบบเรียบง่าย)
 * เส้นทางเดียว: เล่าทริป → AI วิเคราะห์ (แก้ได้) → ความเสี่ยง → จับคู่แผน → ซื้อ (จำลอง) → กรมธรรม์ตัวอย่าง
 */

(function () {
  'use strict';

  let trip = null;      // ผลการวิเคราะห์ล่าสุด (ผู้ใช้แก้ไขได้)
  let chosen = null;    // แผนที่ผู้ใช้เลือก

  const $  = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  function go(name) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#screen-' + name).classList.add('active');
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* ───────── 1. หน้าแรก ───────── */
  function initHome() {
    $('#example-list').innerHTML = TRIP_EXAMPLES.map(e =>
      '<button class="example-chip">' + esc(e) + '</button>').join('');
    $$('.example-chip').forEach(b => b.addEventListener('click', () => {
      $('#trip-input').value = b.textContent;
      analyze();
    }));

    $('#btn-analyze').addEventListener('click', analyze);
    $('#trip-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); }
    });

    $('#link-b2b').addEventListener('click', e => { e.preventDefault(); go('b2b'); });
    $('#link-clear').addEventListener('click', e => {
      e.preventDefault();
      if (!window.confirm('ลบข้อมูลทั้งหมดที่เก็บในเครื่องนี้?')) return;
      Store.clearAll();
      toast('ลบข้อมูลแล้ว');
    });
  }

  /* ───────── 2. วิเคราะห์ ───────── */
  function analyze() {
    const text = $('#trip-input').value.trim();
    if (!text) { toast('พิมพ์เล่าทริปของคุณก่อนครับ'); return; }

    trip = Trip.understand(text);
    Store.log('วิเคราะห์ทริป: "' + text.slice(0, 60) + '"');
    renderAnalysis();
    go('analysis');
  }

  function opt(v, label, selected) {
    return '<option value="' + esc(v) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  function renderAnalysis() {
    $('#said-box').innerHTML = '<span>คุณบอกว่า</span>“' + esc(trip.raw) + '”';

    // จำนวนคน 1-10
    $('#f-people').innerHTML = Array.from({ length: 10 }, (_, i) =>
      opt(i + 1, (i + 1) + ' คน', trip.people === i + 1)).join('');

    // จำนวนวัน 1-30
    $('#f-days').innerHTML = Array.from({ length: 30 }, (_, i) =>
      opt(i + 1, (i + 1) + ' วัน', trip.days === i + 1)).join('');

    // ปลายทาง
    $('#f-place').innerHTML =
      opt('', trip.place ? '' : '— ยังไม่ระบุ —', !trip.place) +
      Trip.PLACES.map(p => opt(p.k, p.k + (p.abroad ? ' (ต่างประเทศ)' : ''), trip.placeText === p.k)).join('');

    // การเดินทาง
    $('#f-transport').innerHTML =
      opt('', trip.transport ? '' : '— ยังไม่ระบุ —', !trip.transport) +
      Trip.TRANSPORT.map(m => opt(m.key, m.label, trip.transport === m.key)).join('');

    // กิจกรรม
    $('#f-activity').innerHTML =
      opt('', trip.activity ? '' : '— ทั่วไป —', !trip.activity) +
      Trip.ACTIVITY.map(a => opt(a.key, a.label, trip.activity === a.key)).join('');

    // สิ่งที่ AI จับได้ พร้อมบอกว่าจับจากอะไร (โปร่งใส)
    $('#understood-notes').innerHTML = trip.found.length
      ? '<div class="reason-title">AI เข้าใจจากอะไร</div>' +
        trip.found.map(f => '<div class="reason"><span class="dot">✓</span><span><b>' + esc(f.field) + ':</b> ' + esc(f.text) + '</span></div>').join('')
      : '';

    // สิ่งที่ไม่เข้าใจ บอกตรง ๆ
    $('#missing-notice').innerHTML = trip.missing.length
      ? '<div class="notice"><b>ระบบยังไม่ทราบ: ' + trip.missing.map(esc).join(', ') + '</b> — เลือกเพิ่มในช่องด้านบนได้เลย ระบบจะไม่เดาแทนคุณ</div>'
      : '';

    renderRisks();
  }

  function currentTrip() {
    const placeText = $('#f-place').value;
    return {
      raw: trip.raw,
      people: parseInt($('#f-people').value, 10),
      days: parseInt($('#f-days').value, 10),
      placeText: placeText,
      place: Trip.PLACES.find(p => p.k === placeText) || null,
      transport: $('#f-transport').value,
      activity: $('#f-activity').value
    };
  }

  function renderRisks() {
    const t = currentTrip();
    const list = Trip.risks(t);
    $('#risk-list').innerHTML = list.length
      ? list.map(r =>
          '<div class="reason"><span class="dot">' + r.icon + '</span><span><b>' + esc(r.title) + '</b><br><small class="hint">' + esc(r.why) + '</small></span></div>'
        ).join('')
      : '<p class="hint">เลือกปลายทางและวิธีเดินทาง เพื่อให้ระบบประเมินความเสี่ยงได้</p>';
  }

  function initAnalysis() {
    ['f-people', 'f-days', 'f-place', 'f-transport', 'f-activity'].forEach(id =>
      $('#' + id).addEventListener('change', renderRisks));

    $('#btn-match').addEventListener('click', () => {
      trip = Object.assign({}, trip, currentTrip());
      renderPlans();
      go('plans');
    });
  }

  /* ───────── 3. แผนที่จับคู่ได้ ───────── */
  function renderPlans() {
    const t = currentTrip();
    $('#trip-chip').innerHTML =
      '👥 ' + t.people + ' คน · 📅 ' + t.days + ' วัน' +
      (t.placeText ? ' · 📍 ' + esc(t.placeText) : '') +
      (t.transport ? ' · ' + esc((Trip.TRANSPORT.find(x => x.key === t.transport) || {}).label || '') : '');

    const matches = Trip.match(t);
    Store.log('จับคู่แผน: พบ ' + matches.length + ' แผนที่เหมาะ');

    if (!matches.length) {
      $('#plan-list').innerHTML = '<div class="card"><p>ยังไม่พบแผนที่เหมาะกับทริปนี้ในระบบสาธิต ลองปรับปลายทางหรือวิธีเดินทางดูครับ</p></div>';
      return;
    }

    $('#plan-list').innerHTML = matches.map((m, i) => {
      return '<div class="plan-card' + (i === 0 ? ' best' : '') + '">' +
        (i === 0 ? '<span class="best-badge">เหมาะที่สุดกับทริปนี้</span>' : '') +
        '<div class="plan-head">' +
          '<span class="partner-dot" style="background:' + m.partner.tone + '"></span>' +
          '<div class="plan-name"><b>' + esc(m.plan.name) + '</b><small>' + esc(m.partner.name) + ' · ข้อมูลสมมติ</small></div>' +
          '<div class="plan-price"><b>' + m.total.toLocaleString('th-TH') + '</b><small>บาท*</small></div>' +
        '</div>' +
        '<div class="plan-breakdown">' + esc(m.breakdown) + '</div>' +
        '<div class="reason-title">ทำไมถึงเหมาะ</div>' +
        m.reasons.map(r => '<div class="reason"><span class="dot">✓</span><span>' + esc(r) + '</span></div>').join('') +
        (m.warn ? '<div class="plan-warn">⚠️ ' + esc(m.warn) + '</div>' : '') +
        '<details class="plan-detail"><summary>ดูความคุ้มครองและข้อยกเว้น</summary>' +
          '<div class="reason-title">คุ้มครอง</div>' +
          m.plan.covers.map(c => '<div class="reason"><span class="dot">✓</span><span>' + esc(c) + '</span></div>').join('') +
          '<div class="reason-title">ไม่คุ้มครอง</div>' +
          m.plan.excludes.map(c => '<div class="reason"><span class="dot">✕</span><span>' + esc(c) + '</span></div>').join('') +
        '</details>' +
        '<button class="btn btn-primary btn-choose" data-plan="' + m.plan.id + '">เลือกแผนนี้</button>' +
      '</div>';
    }).join('') + '<p class="section-hint">* ตัวเลขตัวอย่างเพื่อสาธิตกลไกการคำนวณเท่านั้น</p>';

    $$('.btn-choose').forEach(b => b.addEventListener('click', () => {
      chosen = matches.find(m => m.plan.id === b.dataset.plan);
      renderCheckout();
      go('checkout');
    }));
  }

  /* ───────── 4. ยืนยัน (จำลอง) ───────── */
  function renderCheckout() {
    const t = currentTrip();
    $('#checkout-body').innerHTML =
      '<div class="card card-banner" style="align-items:flex-start">' +
        '<div style="flex:1">' +
          '<b>' + esc(chosen.plan.name) + '</b>' +
          '<span>' + esc(chosen.partner.name) + ' · ข้อมูลสมมติ</span><br><br>' +
          '<span>👥 ' + t.people + ' คน · 📅 ' + t.days + ' วัน' + (t.placeText ? ' · 📍 ' + esc(t.placeText) : '') + '</span>' +
        '</div>' +
        '<div class="banner-score" style="font-size:26px">' + chosen.total.toLocaleString('th-TH') + '<small> บาท*</small></div>' +
      '</div>' +
      '<div class="card"><h2>สรุปการคำนวณ</h2><p>' + esc(chosen.breakdown) + '</p>' +
      '<p class="hint">* ตัวเลขตัวอย่าง — ระบบจริงราคาจะมาจาก API ของบริษัทประกันโดยตรง และบริษัทเป็นผู้ออกกรมธรรม์</p></div>';

    $('#checkout-consent').checked = false;
    $('#btn-buy').disabled = true;
  }

  function initCheckout() {
    $('#checkout-consent').addEventListener('change', e => {
      $('#btn-buy').disabled = !e.target.checked;
    });

    $('#btn-buy').addEventListener('click', () => {
      const ref = 'DEMO-' + Date.now().toString(36).toUpperCase();
      Store.log('จำลองการซื้อ: ' + chosen.plan.name + ' (' + ref + ')');
      renderPolicy(ref);
      go('policy');
      toast('สร้างกรมธรรม์ตัวอย่างแล้ว');
    });
  }

  /* ───────── 5. กรมธรรม์ตัวอย่าง ───────── */
  function renderPolicy(ref) {
    const t = currentTrip();
    const today = new Date();
    const p = n => String(n).padStart(2, '0');
    const d1 = p(today.getDate()) + '/' + p(today.getMonth() + 1) + '/' + (today.getFullYear() + 543);
    const end = new Date(today.getTime() + (t.days - 1) * 86400000);
    const d2 = p(end.getDate()) + '/' + p(end.getMonth() + 1) + '/' + (end.getFullYear() + 543);

    $('#policy-body').innerHTML =
      '<div class="policy-card">' +
        '<div class="policy-watermark">ตัวอย่าง</div>' +
        '<div class="policy-head">' +
          '<img src="icons/logo.png" alt="">' +
          '<div><b>กรมธรรม์ดิจิทัล (ตัวอย่าง)</b><small>' + esc(chosen.partner.name) + ' — ข้อมูลสมมติ</small></div>' +
        '</div>' +
        '<div class="policy-row"><span>แผน</span><b>' + esc(chosen.plan.name) + '</b></div>' +
        '<div class="policy-row"><span>ผู้เอาประกัน</span><b>' + t.people + ' คน</b></div>' +
        '<div class="policy-row"><span>ระยะคุ้มครอง</span><b>' + d1 + ' – ' + d2 + '</b></div>' +
        (t.placeText ? '<div class="policy-row"><span>พื้นที่</span><b>' + esc(t.placeText) + '</b></div>' : '') +
        '<div class="policy-row"><span>เบี้ยรวม</span><b>' + chosen.total.toLocaleString('th-TH') + ' บาท*</b></div>' +
        '<div class="policy-row"><span>เลขอ้างอิง</span><b class="ref">' + ref + '</b></div>' +
      '</div>' +
      '<div class="card card-info"><h2>🚨 ผู้ช่วยเคลม</h2>' +
        '<p>ในระบบจริง หากเกิดเหตุระหว่างทริป กดปุ่มเดียวเพื่อแจ้งเหตุ แชร์ตำแหน่ง และส่งเอกสารถึงบริษัทผู้รับประกันโดยตรง</p></div>' +
      '<div class="notice"><b>นี่คือเอกสารตัวอย่างจากการสาธิต</b> — ไม่มีผลคุ้มครองจริง ไม่มีการชำระเงิน และไม่มีบริษัทใดออกกรมธรรม์นี้ ในระบบจริงกรมธรรม์ออกโดยบริษัทประกันภัยที่ได้รับใบอนุญาตเท่านั้น</div>';
  }

  /* ───────── boot ───────── */
  function boot() {
    initHome();
    initAnalysis();
    initCheckout();

    $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
