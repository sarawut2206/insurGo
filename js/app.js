/* app.js — UI controller */

(function () {
  'use strict';

  let quizList = [];   // คำถามที่ใช้จริงในรอบนี้ (กรองตามความยินยอมแล้ว)
  let qIndex = 0;
  let draft = {};      // คำตอบระหว่างทำแบบสอบถาม

  const $  = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  /* ───────── navigation ───────── */

  // หน้าจอไหนทำให้แท็บล่างข้างล่างสว่างขึ้น
  const TAB_OF = {
    welcome: 'welcome', category: 'welcome',
    consent: 'consent', quiz: 'consent', analyzing: 'consent',
    profile: 'profile', review: 'profile',
    mydata: 'mydata'
  };

  function go(name) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#screen-' + name);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
    if (name === 'mydata') renderMyData();
    if (name === 'review') renderReview();

    // ซ่อนแท็บระหว่างทำแบบสอบถาม เพื่อไม่ให้กดออกกลางคันโดยไม่ตั้งใจ
    const hide = (name === 'quiz' || name === 'analyzing');
    $('#tabbar').style.display = hide ? 'none' : '';

    const tab = TAB_OF[name];
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
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

  /* ───────── home: การ์ดหมวด + จุดเด่น ───────── */
  function renderHome() {
    $('#cat-grid').innerHTML = Object.keys(DOMAINS).map(k =>
      '<button class="cat-card" data-cat="' + k + '">' +
        '<span class="cat-ico">' + DOMAINS[k].icon + '</span>' +
        '<b>' + esc(DOMAINS[k].name.replace('ความเสี่ยงด้าน', '')) + '</b>' +
        '<small>' + esc(DOMAINS[k].short) + '</small>' +
        '<span class="cat-more">ดูรายละเอียด ❯</span>' +
      '</button>'
    ).join('');

    $$('#cat-grid .cat-card').forEach(c =>
      c.addEventListener('click', () => openCategory(c.dataset.cat)));

    $('#benefit-grid').innerHTML = BENEFITS.map(b =>
      '<div class="benefit"><span class="b-ico">' + b.icon + '</span>' +
      '<b>' + esc(b.title) + '</b><span>' + esc(b.text) + '</span></div>'
    ).join('');
  }

  /* ───────── category detail ───────── */
  function openCategory(key) {
    const d = DOMAINS[key], c = CATEGORY[key], cov = COVERAGE[key], prev = PREVENTION[key];

    $('#cat-title').textContent = d.name;
    $('#cat-body').innerHTML =
      '<div class="cat-hero">' +
        '<span class="cat-ico">' + d.icon + '</span>' +
        '<b>' + esc(c.lead) + '</b>' +
        '<p>' + esc(c.body) + '</p>' +
      '</div>' +

      (c.note ? '<div class="notice"><b>ข้อมูลอ่อนไหว</b> — ' + esc(c.note) + '</div>' : '') +

      '<div class="card"><h2>สัญญาณที่บอกว่าคุณเสี่ยงสูงในด้านนี้</h2>' +
        c.signals.map(s => '<div class="reason"><span class="dot">▸</span><span>' + esc(s) + '</span></div>').join('') +
      '</div>' +

      '<div class="card"><h2>ประเภทความคุ้มครองที่เกี่ยวข้อง</h2>' +
        '<p class="hint">ระบบไม่แนะนำผลิตภัณฑ์ของบริษัทใด และไม่ระบุเบี้ยประกัน</p>' +
        '<ul class="limits">' + cov.kinds.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' +
      '</div>' +

      '<div class="card card-info"><h2>' + prev.icon + ' ลดความเสี่ยงได้อย่างไร</h2>' +
        '<p>' + esc(prev.text) + '</p>' +
      '</div>';

    Store.log('เปิดดูรายละเอียดหมวด: ' + d.name);
    go('category');
  }

  /* ───────── tabbar ───────── */
  function initTabs() {
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      const dest = t.dataset.tab;

      if (dest === 'profile') {
        if (!Store.state.result) { toast('ยังไม่มีผลการประเมิน — เริ่มประเมินก่อนได้เลย'); return; }
        renderProfile(Store.state.result);
      }

      if (dest === 'consent' && Store.state.consent.core) { startQuiz(); return; }

      go(dest);
    }));
  }

  /* ───────── consent ───────── */
  function initConsent() {
    const core = $('#consent-core');
    const next = $('#btn-consent-next');

    $$('[data-consent]').forEach(cb => {
      cb.addEventListener('change', () => { next.disabled = !core.checked; });
    });

    next.addEventListener('click', () => {
      Store.setConsent({
        core:      $('#consent-core').checked,
        sensitive: $('#consent-sensitive').checked,
        review:    $('#consent-review').checked
      });
      const c = Store.state.consent;
      Store.log('ให้ความยินยอม — พื้นฐาน: ใช่, ข้อมูลสุขภาพ: ' + (c.sensitive ? 'ใช่' : 'ไม่')
                + ', ส่งตรวจสอบ: ' + (c.review ? 'ใช่' : 'ไม่'));
      startQuiz();
    });
  }

  /* ───────── questionnaire ───────── */
  function startQuiz() {
    const consent = Store.state.consent;
    // ไม่ถามข้อมูลอ่อนไหวเลยหากผู้ใช้ไม่ได้ยินยอม — ไม่ใช่แค่ไม่นำไปใช้
    quizList = QUESTIONS.filter(q => !(q.sensitive && !consent.sensitive));
    qIndex = 0;
    draft = {};
    go('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = quizList[qIndex];
    const val = draft[q.id];

    $('#progress-bar').style.width = ((qIndex) / quizList.length * 100) + '%';
    $('#progress-label').textContent = 'ข้อ ' + (qIndex + 1) + ' จาก ' + quizList.length;

    const banner = q.sensitive
      ? '<div class="sensitive-banner">🔒 ข้อนี้เป็นข้อมูลอ่อนไหว คุณให้ความยินยอมไว้แล้ว และถอนได้ทุกเมื่อจากเมนู “ข้อมูลของฉัน”</div>'
      : '';

    const opts = q.options.map(o => {
      const checked = q.type === 'multi'
        ? (Array.isArray(val) && val.indexOf(o.v) !== -1)
        : val === o.v;
      return '<label class="opt">' +
        '<input type="' + (q.type === 'multi' ? 'checkbox' : 'radio') + '" name="q_' + q.id + '" value="' + o.v + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="opt-label"><b>' + esc(o.label) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' +
        '</label>';
    }).join('');

    $('#quiz-body').innerHTML =
      '<h2 class="q-title">' + esc(q.title) + '</h2>' +
      '<p class="q-why"><b>ถามไปทำไม:</b> ' + esc(q.why) + '</p>' +
      banner + opts +
      (q.type === 'multi' ? '<p class="hint">เลือกได้มากกว่า 1 ข้อ หากไม่มีข้อใดตรง ให้กด “ข้ามข้อนี้”</p>' : '');

    $('#quiz-next').textContent = (qIndex === quizList.length - 1) ? 'ดูผลการประเมิน' : 'ถัดไป';
    updateNextState();

    $$('#quiz-body input').forEach(inp => {
      inp.addEventListener('change', () => {
        if (q.type === 'multi') {
          draft[q.id] = $$('#quiz-body input:checked').map(i => i.value);
        } else {
          draft[q.id] = inp.value;
        }
        updateNextState();
      });
    });
  }

  function updateNextState() {
    const q = quizList[qIndex];
    const v = draft[q.id];
    const ok = q.type === 'multi' ? (Array.isArray(v) && v.length > 0) : !!v;
    $('#quiz-next').disabled = !ok;
  }

  function nextQuestion() {
    if (qIndex < quizList.length - 1) {
      qIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function initQuiz() {
    $('#quiz-next').addEventListener('click', nextQuestion);

    $('#quiz-skip').addEventListener('click', () => {
      delete draft[quizList[qIndex].id];   // ข้าม = ไม่มีข้อมูล ไม่ใช่เดาค่าให้
      nextQuestion();
    });

    $('#quiz-back').addEventListener('click', () => {
      if (qIndex === 0) { go('consent'); return; }
      qIndex--;
      renderQuestion();
    });
  }

  /* ───────── analyzing ───────── */
  function finishQuiz() {
    Store.setAnswers(draft);
    Store.log('เริ่มประเมินความเสี่ยง (' + Object.keys(draft).length + ' คำตอบ)');
    go('analyzing');

    $$('#analyze-steps li').forEach(li => li.classList.remove('done'));
    const steps = $$('#analyze-steps li');
    steps.forEach((li, i) => setTimeout(() => li.classList.add('done'), 260 + i * 300));

    setTimeout(() => {
      const result = Engine.assess(Store.state.answers, Store.state.consent);
      Store.setResult(result);
      Store.log('ประเมินเสร็จ — ความเสี่ยงรวม ' + result.overall + '/100, พบช่องว่าง ' + result.gaps.length + ' ด้าน');
      renderProfile(result);
      go('profile');
    }, 260 + steps.length * 300 + 380);
  }

  /* ───────── risk profile ───────── */
  function renderProfile(r) {
    $('#overall-score').textContent = r.overall;
    $('#overall-label').textContent = r.overallLabel;
    $('#overall-desc').textContent  = r.overallDesc;

    // แจ้งอย่างชัดเจนเมื่อมีด้านที่ไม่ได้ประเมิน
    const skipped = r.domains.filter(d => d.skipped);
    $('#skipped-notice').innerHTML = skipped.length
      ? '<div class="notice"><b>ยังมี ' + skipped.length + ' ด้านที่ไม่ได้ประเมิน</b> — ' +
        skipped.map(d => esc(d.name)).join(', ') +
        ' เพราะคุณไม่ได้ให้ความยินยอมใช้ข้อมูลสุขภาพ ผลรวมจึงยังไม่ครอบคลุมความเสี่ยงส่วนนี้</div>'
      : '';

    // รายด้าน
    $('#domain-list').innerHTML = r.domains.map((d, i) => {
      if (d.skipped) {
        return '<div class="domain"><div class="domain-head">' +
          '<span class="prev-icon">' + d.icon + '</span>' +
          '<span class="domain-name"><b>' + esc(d.name) + '</b><small>' + esc(d.short) + '</small></span>' +
          '<span class="domain-badge b-skip">ไม่ได้ประเมิน</span></div></div>';
      }
      const color = d.band === 'low' ? 'var(--risk-low)' : d.band === 'mid' ? 'var(--risk-mid)' : 'var(--risk-high)';
      const reasons = d.raised.slice(0, 3).map(x =>
        '<div class="reason"><span class="dot">▸</span><span>' + esc(x.why) + '</span></div>').join('')
        || '<div class="reason"><span class="dot">▸</span><span>ไม่พบปัจจัยที่ทำให้ความเสี่ยงด้านนี้สูงขึ้น</span></div>';
      const good = d.lowered.slice(0, 3).map(x =>
        '<div class="reason"><span class="dot">✓</span><span>' + esc(x.why) + '</span></div>').join('');

      return '<div class="domain" data-i="' + i + '">' +
        '<div class="domain-head">' +
          '<span class="prev-icon">' + d.icon + '</span>' +
          '<span class="domain-name"><b>' + esc(d.name) + '</b><small>' + esc(d.short) + '</small></span>' +
          '<span class="domain-badge ' + d.bandCls + '">' + esc(d.bandLabel) + ' · ' + d.score + '</span>' +
          '<span class="chev">▾</span>' +
        '</div>' +
        '<div class="meter"><div style="width:' + d.score + '%;background:' + color + '"></div></div>' +
        '<div class="domain-body">' +
          '<div class="reason-title">ทำไมถึงประเมินแบบนี้</div>' + reasons +
          (good ? '<div class="reason-title">สิ่งที่ช่วยลดความเสี่ยงอยู่แล้ว</div>' + good : '') +
        '</div>' +
      '</div>';
    }).join('');

    $$('#domain-list .domain-head').forEach(h => {
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
    });

    // ช่องว่างความคุ้มครอง
    $('#gap-list').innerHTML = r.gaps.length ? r.gaps.map(g =>
      '<div class="gap">' +
        '<div class="gap-head"><b>' + esc(g.title) + '</b><span class="prio ' + g.prio.cls + '">' + esc(g.prio.label) + '</span></div>' +
        (g.alreadyCovered ? '<p class="hint">คุณมีความคุ้มครองด้านนี้อยู่แล้วบางส่วน แนะนำให้ทบทวนว่าวงเงินยังเพียงพอหรือไม่</p>' : '') +
        '<div class="reason-title">เหตุผลที่ระบบเสนอ</div>' +
        g.reasons.map(x => '<div class="reason"><span class="dot">▸</span><span>' + esc(x) + '</span></div>').join('') +
        '<div class="reason-title">ประเภทความคุ้มครองที่เกี่ยวข้อง</div>' +
        '<ul>' + g.kinds.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' +
      '</div>'
    ).join('') : '<div class="card"><p>จากข้อมูลที่ให้มา ระบบยังไม่พบช่องว่างที่ควรจัดการเร่งด่วน แนะนำให้ทบทวนผลนี้ปีละครั้ง หรือเมื่อชีวิตมีการเปลี่ยนแปลงสำคัญ เช่น แต่งงาน มีบุตร ซื้อบ้าน หรือเปลี่ยนงาน</p></div>';

    // คำแนะนำเชิงป้องกัน
    $('#prevention-list').innerHTML = r.prevention.length ? r.prevention.map(p =>
      '<div class="prev"><span class="prev-icon">' + p.icon + '</span><div><b>' + esc(p.title) + '</b><span>' + esc(p.text) + '</span></div></div>'
    ).join('') : '<div class="card"><p>ยังไม่มีคำแนะนำเชิงป้องกันเร่งด่วนจากข้อมูลที่ให้มา</p></div>';

    // ข้อจำกัด
    $('#limits-list').innerHTML = r.limits.map(l => '<li>' + esc(l) + '</li>').join('');
  }

  /* ───────── human review ───────── */
  function renderReview() {
    const r = Store.state.result;
    if (!r) { go('welcome'); return; }
    $('#review-summary').textContent = Engine.buildReviewSummary(r, Store.state.consent);

    const confirm = $('#review-confirm');
    confirm.checked = false;
    $('#btn-send-review').disabled = true;
    $('#review-result').innerHTML = '';

    if (Store.state.reviewSent) {
      $('#review-result').innerHTML =
        '<div class="result-ok" style="margin-top:12px"><b>ส่งแล้วเมื่อ ' + esc(Store.state.reviewSent.at) + '</b><br>' +
        'เลขอ้างอิง <span class="ref">' + esc(Store.state.reviewSent.ref) + '</span></div>';
    }
  }

  function initReview() {
    $('#review-confirm').addEventListener('change', e => {
      $('#btn-send-review').disabled = !e.target.checked;
    });

    $('#btn-send-review').addEventListener('click', () => {
      if (!Store.state.consent.review) {
        toast('คุณยังไม่ได้ให้ความยินยอมข้อนี้ไว้ตอนเริ่มต้น');
        return;
      }
      // ต้นแบบ: ยังไม่มีปลายทางจริง จึงสร้างเลขอ้างอิงไว้ในเครื่องเท่านั้น
      const ref = 'REV-' + Date.now().toString(36).toUpperCase();
      Store.markReviewSent(ref);
      Store.log('ผู้ใช้ยืนยันส่งผลให้ผู้เชี่ยวชาญตรวจสอบ (' + ref + ')');
      $('#review-result').innerHTML =
        '<div class="result-ok" style="margin-top:12px"><b>ส่งเข้าคิวตรวจสอบแล้ว</b><br>' +
        'เลขอ้างอิง <span class="ref">' + ref + '</span><br><br>' +
        'ขั้นตอนถัดไป ผู้เชี่ยวชาญที่ได้รับใบอนุญาตจะตรวจทานผลและติดต่อกลับ ระบบจะไม่ดำเนินการใด ๆ ต่อโดยอัตโนมัติ<br><br>' +
        '<span class="hint">หมายเหตุ: เวอร์ชันต้นแบบยังไม่มีการส่งข้อมูลออกนอกเครื่องจริง</span></div>';
      toast('บันทึกคำขอตรวจสอบแล้ว');
    });
  }

  /* ───────── my data ───────── */
  function renderMyData() {
    const c = Store.state.consent;
    const row = (label, on) =>
      '<div class="status-row"><span>' + label + '</span><span class="' + (on ? 'yes' : 'no') + '">' + (on ? 'ให้ความยินยอม' : 'ไม่ได้ให้') + '</span></div>';

    $('#consent-status').innerHTML =
      row('ประเมินความเสี่ยงพื้นฐาน', c.core) +
      row('ใช้ข้อมูลสุขภาพ', c.sensitive) +
      row('ส่งให้ผู้เชี่ยวชาญตรวจสอบ', c.review) +
      (c.at ? '<p class="hint" style="margin-top:8px">บันทึกความยินยอมเมื่อ ' + esc(c.at) + '</p>' : '');

    const a = Store.state.answers;
    const lines = QUESTIONS.map(q => {
      const v = a[q.id];
      if (v === undefined || v === null || (Array.isArray(v) && !v.length)) return q.title + ' : (ไม่ได้ตอบ)';
      const labels = (Array.isArray(v) ? v : [v]).map(val => {
        const o = q.options.find(x => x.v === val);
        return o ? o.label : val;
      });
      return q.title + ' : ' + labels.join(', ');
    });
    $('#data-dump').textContent = lines.join('\n') || 'ยังไม่มีข้อมูล';

    const log = Store.state.audit;
    $('#audit-log').innerHTML = log.length
      ? log.slice().reverse().map(e => '<div class="log-row"><time>' + esc(e.at) + '</time><span>' + esc(e.event) + '</span></div>').join('')
      : '<p class="hint">ยังไม่มีบันทึก</p>';
  }

  /* ───────── demo data ───────── */
  const DEMO = {
    age: '36-45', job: 'freelance', income: '30-50', debt: 'gt40',
    dependents: '3+', emergency: 'lt3', commute: 'motorcycle', home: 'house_own',
    cyber: ['mobile_bank', 'reuse_pw', 'public_wifi'],
    health: ['family', 'checkup'],
    coverage: ['ssoOnly'], budget: '500-1500'
  };

  function loadDemo() {
    Store.setConsent({ core: true, sensitive: true, review: true });
    Store.setAnswers(DEMO);
    Store.log('โหลดข้อมูลจำลองเพื่อสาธิต (ไม่ใช่ข้อมูลบุคคลจริง)');
    const result = Engine.assess(DEMO, Store.state.consent);
    Store.setResult(result);
    renderProfile(result);
    go('profile');
    toast('กำลังแสดงผลจากข้อมูลจำลอง');
  }

  /* ───────── global actions ───────── */
  function initActions() {
    $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.action;

      if (act === 'load-demo') loadDemo();

      if (act === 'restart') {
        if (Store.state.consent.core) startQuiz(); else go('consent');
      }

      if (act === 'export') {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-data-pkkk.json';
        a.click();
        URL.revokeObjectURL(url);
        Store.log('ผู้ใช้ดาวน์โหลดข้อมูลของตนเอง');
        toast('ดาวน์โหลดแล้ว');
      }

      if (act === 'delete-all') {
        if (!window.confirm('ลบข้อมูลทั้งหมดออกจากเครื่องนี้ถาวร?\n\nรวมคำตอบ ผลการประเมิน ความยินยอม และประวัติการทำงาน — ย้อนกลับไม่ได้')) return;
        Store.clearAll();
        $('#consent-core').checked = false;
        $('#consent-sensitive').checked = false;
        $('#consent-review').checked = false;
        $('#btn-consent-next').disabled = true;
        toast('ลบข้อมูลทั้งหมดแล้ว');
        go('welcome');
      }
    }));
  }

  /* ───────── boot ───────── */
  function boot() {
    renderHome();
    initTabs();
    initConsent();
    initQuiz();
    initReview();
    initActions();

    // กลับมาเปิดแอปอีกครั้งแล้วมีผลเดิมอยู่ → เสนอให้ดูผลเดิมได้เลยจากหน้าแรก
    if (Store.state.result) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-hero';
      btn.textContent = 'ดูผลการประเมินครั้งล่าสุด';
      btn.addEventListener('click', () => { renderProfile(Store.state.result); go('profile'); });
      const trust = $('#screen-welcome .hero-trust');
      trust.parentNode.insertBefore(btn, trust);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* เปิดจาก file:// จะลงทะเบียนไม่ได้ ถือว่าปกติ */ });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
