/* app.js — UI controller (เวอร์ชัน trip journey แบบเรียบง่าย)
 * เส้นทางเดียว: เล่าทริป → AI วิเคราะห์ (แก้ได้) → ความเสี่ยง → จับคู่แผน → ซื้อ (จำลอง) → กรมธรรม์ตัวอย่าง
 */

(function () {
  'use strict';

  let trip = null;      // ผลการวิเคราะห์ล่าสุด (ผู้ใช้แก้ไขได้)
  let chosen = null;    // แผนที่ผู้ใช้เลือก

  const $  = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  /* ───────── การสั่นตอบสนอง ─────────
     แอปที่ดีต้องให้ feedback ทันทีที่นิ้วแตะ ไม่ใช่รอผลลัพธ์ */
  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
  }

  /* ───────── ชื่อหน้าจอ สำหรับประกาศให้โปรแกรมอ่านหน้าจอ ───────── */
  const SCREEN_TITLE = {
    home: 'หน้าแรก เล่าทริปของคุณ',
    analyzing: 'กำลังวิเคราะห์ทริป',
    analysis: 'ผลการวิเคราะห์ทริป',
    plans: 'แผนความคุ้มครองที่เหมาะกับทริป',
    insurers: 'บริษัทประกันภัยในไทย',
    checkout: 'ยืนยันความคุ้มครอง',
    policy: 'ความคุ้มครองของคุณ',
    b2b: 'สำหรับบริษัทประกันภัย'
  };

  let current = 'home';

  /* ───────── เปลี่ยนหน้า ─────────
     ผูกกับ history จริง เพื่อให้ปุ่มย้อนกลับของ Android และท่าปัดกลับของ iOS ทำงานได้
     ซึ่งเป็นสิ่งที่แยกแอปที่ทำมาดี ออกจากเว็บที่ใส่กรอบมือถือ */
  function go(name, opts) {
    opts = opts || {};
    if (!$('#screen-' + name)) return;

    const el = $('#screen-' + name);
    $$('.screen').forEach(s => s.classList.remove('active', 'back'));
    if (opts.back) el.classList.add('back');
    el.classList.add('active');
    current = name;

    window.scrollTo(0, 0);

    if (!opts.fromPop) {
      const state = { screen: name };
      if (opts.replace) history.replaceState(state, '', '#' + name);
      else history.pushState(state, '', '#' + name);
    }

    // ย้ายโฟกัสไปหัวข้อของหน้าใหม่ ไม่งั้นผู้ใช้คีย์บอร์ดและ screen reader จะหลงอยู่หน้าเดิม
    const h = el.querySelector('[tabindex="-1"]');
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }

    $('#live').textContent = SCREEN_TITLE[name] || '';
  }

  function initRouter() {
    history.replaceState({ screen: 'home' }, '', location.hash || '#home');

    window.addEventListener('popstate', e => {
      const name = (e.state && e.state.screen) || 'home';
      go(name, { fromPop: true, back: true });
    });

    // เปิดจาก shortcut ของแอป เช่น #b2b
    const start = (location.hash || '').replace('#', '');
    if (start && start !== 'home' && $('#screen-' + start)) go(start, { replace: true });
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2800);
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
    if (!text) {
      toast('พิมพ์เล่าทริปของคุณก่อนครับ');
      $('#trip-input').focus();
      haptic([20, 60, 20]);
      return;
    }

    haptic(12);
    document.activeElement && document.activeElement.blur();   // ปิดคีย์บอร์ดบนมือถือ

    trip = Trip.understand(text);
    Store.log('วิเคราะห์ทริป: "' + text.slice(0, 60) + '"');
    renderAnalysis();

    // ผู้ที่ตั้งค่าลดการเคลื่อนไหวไว้ ไม่ควรถูกบังคับให้รอแอนิเมชัน
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { go('analysis'); return; }

    go('analyzing');
    const steps = $$('#analyze-steps li');
    steps.forEach(li => li.classList.remove('done'));
    steps.forEach((li, i) => setTimeout(() => li.classList.add('done'), 160 + i * 190));
    setTimeout(() => {
      if (current !== 'analyzing') return;   // ผู้ใช้กดย้อนกลับระหว่างรอ — อย่าดึงกลับมา
      haptic(10);
      go('analysis', { replace: true });
    }, 160 + steps.length * 190 + 200);
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

    // ปลายทาง — พิมพ์เองได้ พร้อมรายการให้เลือก
    $('#place-options').innerHTML = Trip.PLACES.map(p =>
      '<option value="' + esc(p.k) + '">' + (p.abroad ? 'ต่างประเทศ' : '') + '</option>').join('');
    $('#f-place').value = trip.placeText;
    $('#f-abroad').checked = !!trip.abroad;
    updatePlaceNote();

    // การเดินทาง
    $('#f-transport').innerHTML =
      opt('', trip.transport ? '' : '— ยังไม่ระบุ —', !trip.transport) +
      Trip.TRANSPORT.map(m => opt(m.key, m.label, trip.transport === m.key)).join('');

    renderActivities();

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

  /* ผู้ใช้พิมพ์ปลายทางเองได้ — ถ้าระบบรู้จักจะติ๊กต่างประเทศให้อัตโนมัติ
     ถ้าไม่รู้จักก็ยังใช้งานต่อได้ แต่ต้องบอกผู้ใช้ตรง ๆ ว่าไม่รู้จัก */
  function updatePlaceNote() {
    const text = $('#f-place').value.trim();
    const box = $('#place-note');
    if (!text) { box.innerHTML = ''; return; }

    const known = Trip.lookupPlace(text);
    if (known) {
      box.innerHTML = '<div class="place-ok">✓ รู้จัก <b>' + esc(known.k) + '</b> — ' + esc(known.note) + '</div>';
    } else {
      box.innerHTML = '<div class="place-unknown">ยังไม่รู้จัก <b>' + esc(text) +
        '</b> — ระบบจะประเมินแบบทั่วไป หากเป็นต่างประเทศกรุณาติ๊กช่องด้านล่างเพื่อให้แนะนำแผนได้ถูกต้อง</div>';
    }
  }

  /* ───────── กิจกรรม: เลือกหลายอย่าง + พิมพ์เพิ่มเอง ───────── */

  const RISK_DOT = { high: '🔴', mid: '🟠', low: '🟢' };

  function actChip(a, on) {
    const guess = on && trip.guessed && trip.guessed.indexOf(a.id) !== -1;
    return '<button type="button" class="act-chip' + (on ? ' on' : '') + (guess ? ' guessed' : '') + '" data-act="' + a.id + '"' +
      (guess ? ' title="ระบบเลือกให้เบื้องต้น กดยกเลิกได้ถ้าไม่ตรง"' : '') + '>' +
      '<span class="act-risk">' + RISK_DOT[a.risk] + '</span>' + (guess ? '✨ ' : '') + esc(a.label) + '</button>';
  }

  function renderActivities() {
    const chosenIds = trip.activities;

    // แถวที่ AI เสนอ — รับประกันอย่างน้อย 10 รายการ เรียงให้ที่เลือกแล้วอยู่ก่อน
    const sug = trip.suggested.slice().sort((a, b) => {
      const A = chosenIds.indexOf(a) !== -1 ? 0 : 1;
      const B = chosenIds.indexOf(b) !== -1 ? 0 : 1;
      return A - B;
    });
    $('#act-suggested').innerHTML = '<div class="chip-wrap">' +
      sug.map(id => actChip(Trip.ACT_BY_ID[id], chosenIds.indexOf(id) !== -1)).join('') + '</div>';

    // คลังทั้งหมดแบ่งตามหมวด
    $('#act-catalog').innerHTML = Trip.ACT_CATS.map(c => {
      const items = Trip.ACTIVITIES.filter(a => a.cat === c.key);
      if (!items.length) return '';
      return '<div class="act-cat"><div class="act-cat-label">' + c.label + '</div><div class="chip-wrap">' +
        items.map(a => actChip(a, chosenIds.indexOf(a.id) !== -1)).join('') + '</div></div>';
    }).join('');

    // กิจกรรมที่ผู้ใช้พิมพ์เอง
    $('#act-custom').innerHTML = trip.custom.length
      ? '<div class="chip-wrap">' + trip.custom.map((txt, i) =>
          '<span class="act-chip on custom">✏️ ' + esc(txt) + '<b class="act-x" data-idx="' + i + '">✕</b></span>').join('') + '</div>'
      : '';

    const total = chosenIds.length + trip.custom.length;
    const g = (trip.guessed || []).filter(id => chosenIds.indexOf(id) !== -1).length;
    $('#act-count').textContent = 'เลือกแล้ว ' + total + ' · เสนอ ' + trip.suggested.length + ' รายการ' +
      (g ? ' · ✨ ระบบเดาให้ ' + g : '');

    // ผูก event ทุกครั้งที่ render ใหม่
    $$('#screen-analysis .act-chip[data-act]').forEach(b =>
      b.addEventListener('click', () => toggleAct(b.dataset.act)));
    $$('#act-custom .act-x').forEach(x =>
      x.addEventListener('click', e => {
        e.stopPropagation();
        trip.custom.splice(parseInt(x.dataset.idx, 10), 1);
        renderActivities(); renderRisks();
      }));
  }

  function toggleAct(id) {
    const i = trip.activities.indexOf(id);
    if (i === -1) {
      trip.activities.push(id);
      // เลือกกิจกรรมที่ไม่ได้อยู่ในรายการเสนอ → ดันขึ้นแถวเสนอด้วย เพื่อไม่ให้หายไปจากสายตา
      if (trip.suggested.indexOf(id) === -1) trip.suggested.push(id);
    } else {
      trip.activities.splice(i, 1);
    }
    renderActivities();
    renderRisks();
  }

  function initActivities() {
    const add = () => {
      const v = $('#act-input').value.trim();
      if (!v) return;
      if (trip.custom.indexOf(v) === -1) trip.custom.push(v);
      $('#act-input').value = '';
      Store.log('ผู้ใช้เพิ่มกิจกรรมเอง: ' + v);
      renderActivities();
      renderRisks();
    };
    $('#act-add-btn').addEventListener('click', add);
    $('#act-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
    });
  }

  function currentTrip() {
    const placeText = $('#f-place').value.trim();
    const known = Trip.lookupPlace(placeText);
    return {
      raw: trip.raw,
      people: parseInt($('#f-people').value, 10),
      days: parseInt($('#f-days').value, 10),
      placeText: placeText,
      place: known,
      abroad: $('#f-abroad').checked,
      transport: $('#f-transport').value,
      activities: trip.activities,
      custom: trip.custom
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
    ['f-people', 'f-days', 'f-abroad'].forEach(id =>
      $('#' + id).addEventListener('change', renderRisks));

    // เปลี่ยนวิธีเดินทาง → ปรับกิจกรรมการเดินทางให้ตรงกันอัตโนมัติ
    $('#f-transport').addEventListener('change', () => {
      const MAP = { moto: 'ridebike', car: 'longdrive', plane: 'flight', public: 'bus' };
      Object.values(MAP).forEach(id => {
        const i = trip.activities.indexOf(id);
        if (i !== -1) trip.activities.splice(i, 1);
      });
      const now = MAP[$('#f-transport').value];
      if (now) {
        trip.activities.push(now);
        if (trip.suggested.indexOf(now) === -1) trip.suggested.push(now);
      }
      renderActivities();
      renderRisks();
    });

    // ปลายทางเป็นช่องพิมพ์ — ต้องอัปเดตทั้งตอนพิมพ์และตอนเลือกจากรายการ
    $('#f-place').addEventListener('input', () => {
      const known = Trip.lookupPlace($('#f-place').value.trim());
      if (known) {
        $('#f-abroad').checked = known.abroad;
        // เปลี่ยนปลายทาง → เสนอกิจกรรมชุดใหม่ที่เข้ากับที่นั่น โดยคงที่เลือกไว้แล้ว
        trip.suggested = Trip.suggestActivities(
          { place: known, abroad: known.abroad, days: parseInt($('#f-days').value, 10) },
          trip.activities);
        renderActivities();
      }
      updatePlaceNote();
      renderRisks();
    });

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

    const result = Trip.match(t);
    const matches = result.matched;
    Store.log('จับคู่แผน: เหมาะ ' + matches.length + ' แผน, กรองออก ' + result.excluded.length + ' แผน');

    if (!matches.length) {
      $('#plan-list').innerHTML = '<div class="card"><p>ยังไม่พบแผนที่เหมาะกับทริปนี้ในระบบสาธิต ลองปรับปลายทางหรือวิธีเดินทางดูครับ</p></div>';
    } else {
      $('#plan-list').innerHTML = matches.map((m, i) =>
        '<div class="plan-card' + (i === 0 ? ' best' : '') + '">' +
          (i === 0 ? '<span class="best-badge">เหมาะที่สุดกับทริปนี้</span>' : '') +
          '<div class="plan-head">' +
            '<span class="partner-dot" style="background:' + m.partner.tone + '"></span>' +
            '<div class="plan-name"><b>' + esc(m.plan.name) + '</b>' +
              '<small>' + esc(m.partner.name) + ' · <span class="type-tag">' + esc(m.plan.type) + '</span></small></div>' +
            '<div class="plan-price"><b>' + m.total.toLocaleString('th-TH') + '</b><small>บาท*</small></div>' +
          '</div>' +
          '<div class="plan-breakdown">' + esc(m.breakdown) + '</div>' +

          // ทุนประกัน — แสดงตรงหน้าการ์ดเลย ไม่ต้องกดเข้าไปดู
          '<div class="reason-title">ความคุ้มครอง (ทุนประกัน)</div>' +
          '<table class="sum-table">' + m.plan.sums.map(s =>
            '<tr><td>' + esc(s.item) + '</td><td><b>' + esc(s.amount) + '</b></td></tr>').join('') +
          '</table>' +

          '<div class="reason-title">ทำไมถึงเหมาะ</div>' +
          m.reasons.map(r => '<div class="reason"><span class="dot">✓</span><span>' + esc(r) + '</span></div>').join('') +
          (m.warn ? '<div class="plan-warn">⚠️ ' + esc(m.warn) + '</div>' : '') +

          '<details class="plan-detail"><summary>ดูข้อยกเว้น</summary>' +
            m.plan.excludes.map(c => '<div class="reason"><span class="dot">✕</span><span>' + esc(c) + '</span></div>').join('') +
          '</details>' +
          '<button class="btn btn-primary btn-choose" data-plan="' + m.plan.id + '">เลือกแผนนี้</button>' +
        '</div>'
      ).join('') + '<p class="section-hint">* เบี้ยและทุนประกันเป็นตัวเลขตัวอย่างจากบริษัทสมมติ เพื่อสาธิตกลไกเท่านั้น</p>';
    }

    // แสดงแผนที่ถูกกรองออกพร้อมเหตุผล — ความโปร่งใสที่บริษัทประกันตรวจสอบได้
    $('#excluded-list').innerHTML = result.excluded.length
      ? '<details class="excluded"><summary>ระบบกรอง ' + result.excluded.length + ' แผนออก — ดูเหตุผล</summary>' +
        result.excluded.map(e =>
          '<div class="reason"><span class="dot">✕</span><span><b>' + esc(e.name) + '</b><br><small class="hint">' + esc(e.why) + '</small></span></div>'
        ).join('') + '</details>'
      : '';

    $$('.btn-choose').forEach(b => b.addEventListener('click', () => {
      chosen = matches.find(m => m.plan.id === b.dataset.plan);
      renderCheckout();
      go('checkout');
    }));
  }

  /* ───────── บริษัทประกันภัยจริง ───────── */
  function renderInsurers() {
    const row = (x, showNote) =>
      '<a class="ins-row" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<div><b>' + esc(x.name) + '</b>' +
        (showNote && x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</div>' +
        '<span class="ins-go">เปิดเว็บไซต์ ↗</span>' +
      '</a>';

    $('#ins-official').innerHTML  = REAL_INSURERS.official.map(x => row(x, true)).join('');
    $('#ins-companies').innerHTML = REAL_INSURERS.companies.map(x => row(x, false)).join('');
    $('#ins-platforms').innerHTML = REAL_INSURERS.platforms.map(x => row(x, true)).join('');
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
      '<p class="hint">* ตัวเลขตัวอย่าง — ระบบจริงราคาจะมาจาก API ของบริษัทประกันโดยตรง และบริษัทเป็นผู้ออกกรมธรรม์</p></div>' +

      '<div class="card"><h2>ความคุ้มครองที่คุณจะได้รับ</h2>' +
        '<table class="sum-table">' + chosen.plan.sums.map(s =>
          '<tr><td>' + esc(s.item) + '</td><td><b>' + esc(s.amount) + '</b></td></tr>').join('') +
        '</table></div>' +

      '<div class="card card-warn"><h2>ข้อยกเว้นที่ต้องอ่านก่อน</h2>' +
        chosen.plan.excludes.map(c => '<div class="reason"><span class="dot">✕</span><span>' + esc(c) + '</span></div>').join('') +
      '</div>';

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
        '<div class="reason-title">ความคุ้มครอง (ทุนประกัน)</div>' +
        '<table class="sum-table">' + chosen.plan.sums.map(s =>
          '<tr><td>' + esc(s.item) + '</td><td><b>' + esc(s.amount) + '</b></td></tr>').join('') +
        '</table>' +
      '</div>' +
      '<div class="card card-info"><h2>🚨 ผู้ช่วยเคลม</h2>' +
        '<p>ในระบบจริง หากเกิดเหตุระหว่างทริป กดปุ่มเดียวเพื่อแจ้งเหตุ แชร์ตำแหน่ง และส่งเอกสารถึงบริษัทผู้รับประกันโดยตรง</p></div>' +
      '<div class="notice"><b>นี่คือเอกสารตัวอย่างจากการสาธิต</b> — ไม่มีผลคุ้มครองจริง ไม่มีการชำระเงิน และไม่มีบริษัทใดออกกรมธรรม์นี้ ในระบบจริงกรมธรรม์ออกโดยบริษัทประกันภัยที่ได้รับใบอนุญาตเท่านั้น</div>';
  }

  /* ───────── ติดตั้งเป็นแอป ─────────
     Android/Chrome ให้ปุ่มติดตั้งได้จริง ส่วน iOS Safari ต้องบอกวิธีทำเอง */
  let deferredPrompt = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function initInstall() {
    if (isStandalone() || Store.state.installDismissed) return;

    const card = $('#install-card');
    const btn  = $('#btn-install');

    const reveal = () => { card.hidden = false; btn.hidden = false; };

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      reveal();
    });

    // iOS ไม่ยิง beforeinstallprompt เลย จึงต้องเสนอวิธีติดตั้งด้วยตัวเอง
    if (isIOS()) reveal();

    const doInstall = async () => {
      haptic(12);
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const res = await deferredPrompt.userChoice;
        Store.log('ผลการติดตั้งแอป: ' + res.outcome);
        deferredPrompt = null;
        if (res.outcome === 'accepted') { card.hidden = true; btn.hidden = true; }
        return;
      }
      $('#ios-sheet').hidden = false;
    };

    $('#install-go').addEventListener('click', doInstall);
    btn.addEventListener('click', doInstall);

    $('#install-close').addEventListener('click', () => {
      card.hidden = true;
      Store.setInstallDismissed();
    });

    $('#ios-close').addEventListener('click', () => { $('#ios-sheet').hidden = true; });
    $('#ios-sheet').addEventListener('click', e => {
      if (e.target === $('#ios-sheet')) $('#ios-sheet').hidden = true;   // แตะนอกแผ่นเพื่อปิด
    });

    window.addEventListener('appinstalled', () => {
      card.hidden = true; btn.hidden = true;
      Store.log('ติดตั้งแอปลงเครื่องแล้ว');
      toast('ติดตั้งแล้ว เปิดจากหน้าจอโฮมได้เลย');
    });
  }

  /* ───────── สถานะออฟไลน์ ───────── */
  function initNetwork() {
    const bar = $('#offline-bar');
    const sync = () => {
      const off = !navigator.onLine;
      bar.hidden = !off;
      document.body.style.paddingTop = off ? '38px' : '';
    };
    window.addEventListener('online', () => { sync(); toast('กลับมาออนไลน์แล้ว'); });
    window.addEventListener('offline', sync);
    sync();
  }

  /* ───────── ปิด sheet ด้วยปุ่ม Escape ───────── */
  function initKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#ios-sheet').hidden) $('#ios-sheet').hidden = true;
    });
  }

  /* ───────── boot ───────── */
  function boot() {
    initRouter();
    initInstall();
    initNetwork();
    initKeys();
    initHome();
    initAnalysis();
    initActivities();
    initCheckout();
    renderInsurers();

    // ปุ่มย้อนกลับใช้ history จริง เพื่อให้พฤติกรรมตรงกับปุ่มย้อนกลับของเครื่อง
    $$('[data-go]').forEach(b => b.addEventListener('click', () => {
      haptic(6);
      if (b.classList.contains('back')) { history.back(); return; }
      go(b.dataset.go);
    }));

    // ให้ทุกปุ่มสั่นตอบสนองเบา ๆ เหมือนแอป native
    document.addEventListener('click', e => {
      const el = e.target.closest('button, .act-chip, .example-chip, .ins-row');
      if (el && !el.disabled) haptic(6);
    }, { passive: true });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
