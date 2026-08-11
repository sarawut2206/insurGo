/* store.js — การจัดเก็บข้อมูลและบันทึกการทำงาน
 *
 * เวอร์ชันต้นแบบเก็บทุกอย่างไว้ใน localStorage ของเครื่องผู้ใช้เท่านั้น
 * ไม่มีการส่งข้อมูลออกนอกเครื่อง — จึงไม่มี data controller ภายนอกในขั้นนี้
 *
 * เมื่อขึ้น production และมีเซิร์ฟเวอร์ ต้องเพิ่ม:
 *   - นโยบายระยะเวลาเก็บข้อมูล (retention)
 *   - การเข้ารหัสข้อมูลขณะพักและขณะส่ง
 *   - บันทึก audit log ฝั่งเซิร์ฟเวอร์ที่ผู้ใช้แก้ไขไม่ได้
 */

const Store = (function () {
  const KEY = 'pkkk.v1';

  const blank = () => ({
    consent: { core: false, sensitive: false, review: false, at: null },
    answers: {},
    result: null,
    reviewSent: null,
    installDismissed: false,
    audit: []
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign(blank(), JSON.parse(raw)) : blank();
    } catch (e) {
      return blank();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* โหมดส่วนตัวอาจเขียนไม่ได้ */ }
  }

  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /* บันทึกทุกเหตุการณ์สำคัญ เพื่อให้ผู้ใช้ตรวจสอบย้อนหลังได้ว่าระบบทำอะไรไปบ้าง */
  function log(event) {
    state.audit.push({ at: stamp(), event: event });
    if (state.audit.length > 80) state.audit = state.audit.slice(-80);
    save();
  }

  return {
    get state() { return state; },

    setConsent(patch) {
      Object.assign(state.consent, patch, { at: stamp() });
      save();
    },

    setAnswer(id, value) {
      state.answers[id] = value;
      save();
    },

    setAnswers(obj) {
      state.answers = Object.assign({}, obj);
      save();
    },

    setResult(r) {
      state.result = r;
      save();
    },

    markReviewSent(ref) {
      state.reviewSent = { ref: ref, at: stamp() };
      save();
    },

    // ผู้ใช้ปิดคำชวนติดตั้งแล้ว อย่ารบกวนซ้ำ
    setInstallDismissed() {
      state.installDismissed = true;
      save();
    },

    log: log,
    stamp: stamp,

    exportJSON() {
      return JSON.stringify({
        exportedAt: stamp(),
        note: 'ข้อมูลส่วนบุคคลของผู้ใช้ ส่งออกจากแอป ประกันไปกับคุณ (ต้นแบบ)',
        data: state
      }, null, 2);
    },

    clearAll() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = blank();
      log('ผู้ใช้ลบข้อมูลทั้งหมด');
    }
  };
})();
