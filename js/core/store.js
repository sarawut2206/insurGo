/* store.js — สถานะและการจัดเก็บข้อมูล
 *
 * เวอร์ชันต้นแบบเก็บทุกอย่างไว้ในเครื่องผู้ใช้เท่านั้น
 * ไม่มีการส่งข้อมูลออกนอกเครื่อง จึงยังไม่มีผู้ควบคุมข้อมูลภายนอกในขั้นนี้
 *
 * เมื่อขึ้น production และมีเซิร์ฟเวอร์ ต้องเพิ่ม:
 *   นโยบายระยะเวลาเก็บข้อมูล · เข้ารหัสขณะพักและขณะส่ง
 *   บันทึกการทำงานฝั่งเซิร์ฟเวอร์ที่ผู้ใช้แก้ไขไม่ได้
 */

const KEY = 'insurgo.v2';
const MAX_LOG = 60;

const blank = () => ({
  trip: null,
  selectedPlanId: null,
  policies: [],
  installDismissed: false,
  log: []
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    return blank();
  }
}

let state = read();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { /* โหมดส่วนตัวอาจเขียนไม่ได้ — ไม่ควรทำให้แอปพัง */ }
}

export function timestamp(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
         `${p(date.getHours())}:${p(date.getMinutes())}`;
}

/** บันทึกสิ่งที่ระบบทำ เพื่อให้ผู้ใช้ตรวจย้อนหลังได้ */
export function log(event) {
  state.log.push({ at: timestamp(), event });
  if (state.log.length > MAX_LOG) state.log = state.log.slice(-MAX_LOG);
  persist();
}

export const store = {
  get state() { return state; },

  setTrip(trip) { state.trip = trip; persist(); },

  selectPlan(id) { state.selectedPlanId = id; persist(); },

  addPolicy(policy) {
    state.policies.unshift(policy);
    persist();
    return policy;
  },

  dismissInstall() { state.installDismissed = true; persist(); },

  exportJSON() {
    return JSON.stringify({
      exportedAt: timestamp(),
      note: 'ข้อมูลจากแอป ประกันไปกับคุณ (ต้นแบบ) — ความคุ้มครองทั้งหมดเป็นข้อมูลจำลอง',
      data: state
    }, null, 2);
  },

  clear() {
    try { localStorage.removeItem(KEY); } catch { /* ข้าม */ }
    state = blank();
    log('ผู้ใช้ลบข้อมูลทั้งหมด');
  }
};
