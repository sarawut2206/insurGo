/* screens/info.js — ข้อมูลของฉัน · บริษัทประกันภัยจริง · โมเดล B2B */

import { $, $$, esc, baht, toast } from '../core/ui.js';
import { go } from '../core/router.js';
import { haptic, openExternal } from '../core/native.js';
import { store, log } from '../core/store.js';
import { REAL_INSURERS, PLANS, PARTNERS } from '../data/plans.js';
import { ACTIVITIES } from '../data/activities.js';
import { PLACES } from '../data/places.js';

/* ═══════════ ความคุ้มครองและข้อมูลของฉัน ═══════════ */
export function renderAccount() {
  const { policies, log: entries } = store.state;

  $('#account-body').innerHTML = `
    <h2 class="section-label">ความคุ้มครองของฉัน</h2>
    ${policies.length ? policies.map(p => `
      <article class="card">
        <div class="plan-head">
          <div class="plan-id">
            <div class="plan-name">${esc(p.planName)}</div>
            <div class="plan-partner">
              <span class="partner-dot" style="background:${p.tone}"></span>${esc(p.partner)} · ตัวอย่าง
            </div>
          </div>
          <div class="plan-price"><b>${baht(p.total)}</b><span>บาท*</span></div>
        </div>
        <div class="plan-calc">${p.people} คน · ${p.days} วัน · ${esc(p.place)} · ออกเมื่อ ${esc(p.issuedAt)}</div>
        <div class="policy-ref" style="color:var(--ink-faint);border-top:1px solid var(--line);padding-top:10px;margin-top:10px">
          ${esc(p.ref)}
        </div>
      </article>`).join('') : `
      <div class="empty"><span class="empty-mark">🧳</span>
        ยังไม่มีความคุ้มครอง — เริ่มจากเล่าทริปของคุณที่หน้าแรก</div>`}

    <h2 class="section-label">ข้อมูลของคุณอยู่ที่ไหน</h2>
    <section class="card tone-info">
      <p style="margin:0;font-size:13.5px;color:var(--ink-soft)">
        ข้อมูลทั้งหมดถูกเก็บไว้ใน<b style="color:var(--ink)">เครื่องของคุณเอง</b>เท่านั้น
        ไม่ถูกส่งออกไปยังเซิร์ฟเวอร์ใด และไม่มีการเก็บชื่อ เบอร์โทร หรือเลขบัตรประชาชน
      </p>
    </section>

    <h2 class="section-label">ประวัติการทำงานของระบบ</h2>
    <section class="card">
      <p class="card-hint">บันทึกว่าระบบทำอะไร เมื่อไหร่ — เพื่อให้ตรวจสอบย้อนหลังได้</p>
      ${entries.length
        ? entries.slice().reverse().map(e =>
            `<div class="log-row"><time>${esc(e.at)}</time><span>${esc(e.event)}</span></div>`).join('')
        : '<p class="card-hint" style="margin:0">ยังไม่มีบันทึก</p>'}
    </section>

    <button type="button" class="btn btn-secondary" id="btn-export">ดาวน์โหลดข้อมูลของฉัน</button>
    <button type="button" class="btn btn-danger" id="btn-wipe">ลบข้อมูลทั้งหมด</button>
  `;

  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insurgo-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    log('ผู้ใช้ดาวน์โหลดข้อมูลของตนเอง');
    toast('ดาวน์โหลดแล้ว', 'success');
  });

  $('#btn-wipe').addEventListener('click', () => {
    const ok = confirm('ลบข้อมูลทั้งหมดออกจากเครื่องนี้ถาวร?\n\nรวมทริป ความคุ้มครองจำลอง และประวัติการทำงาน — ย้อนกลับไม่ได้');
    if (!ok) return;
    store.clear();
    haptic('warning');
    toast('ลบข้อมูลทั้งหมดแล้ว');
    renderAccount();
    go('home');
  });
}

/* ═══════════ บริษัทประกันภัยจริง ═══════════ */
const insurerRow = ({ name, url, note }) => `
  <button type="button" class="ins-row" data-url="${esc(url)}">
    <span class="ins-row-text">
      <b>${esc(name)}</b>
      <span>${esc(note || url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</span>
    </span>
    <span class="ins-row-go">เปิด ↗</span>
  </button>`;

export function renderInsurers() {
  $('#insurers-body').innerHTML = `
    <div class="notice">
      <b>หน้านี้คือข้อมูลจริง</b> — ลิงก์ไปเว็บไซต์ทางการของแต่ละบริษัท
      ไม่มีเบี้ยหรือทุนประกันจากเรา และบริษัทเหล่านี้<b>ยังไม่ได้เป็นพันธมิตร</b>ของแพลตฟอร์ม
      เป็นรายชื่อเป้าหมายที่ต้องการเชื่อมต่อ API ด้วยในอนาคต
    </div>

    <h2 class="section-label">ตรวจสอบก่อนซื้อประกันทุกครั้ง</h2>
    ${REAL_INSURERS.official.map(insurerRow).join('')}

    <h2 class="section-label">บริษัทประกันวินาศภัย</h2>
    <p class="card-hint">ดูรายชื่อครบถ้วนได้ที่เว็บไซต์สมาคมประกันวินาศภัยไทย</p>
    ${REAL_INSURERS.companies.map(insurerRow).join('')}

    <h2 class="section-label">แพลตฟอร์มเปรียบเทียบและซื้อออนไลน์</h2>
    ${REAL_INSURERS.platforms.map(insurerRow).join('')}

    <section class="card tone-warn" style="margin-top:20px">
      <h2 class="card-title">ก่อนซื้อประกันจากที่ใดก็ตาม</h2>
      <ul class="reason-list">
        <li class="reason"><span class="reason-mark">✓</span><span>ตรวจใบอนุญาตของบริษัทและตัวแทนที่เว็บไซต์ คปภ.</span></li>
        <li class="reason"><span class="reason-mark">✓</span><span>อ่านข้อยกเว้นในกรมธรรม์ให้ครบ ไม่ใช่ดูแค่ทุนประกัน</span></li>
        <li class="reason"><span class="reason-mark">✓</span><span>เก็บหลักฐานการชำระเงินและกรมธรรม์ไว้เสมอ</span></li>
      </ul>
    </section>
  `;

  $$('#insurers-body .ins-row').forEach(row =>
    row.addEventListener('click', () => {
      haptic('light');
      openExternal(row.dataset.url);
    }));
}

/* ═══════════ โมเดลธุรกิจ B2B ═══════════ */
export function renderB2B() {
  $('#b2b-body').innerHTML = `
    <div class="said" style="background:linear-gradient(140deg,var(--navy-900),var(--teal-500))">
      <div class="said-label">โมเดลธุรกิจ</div>
      <p class="said-text" style="font-size:19px;font-weight:800;line-height:1.5">
        เราไม่ใช่บริษัทประกัน<br>เราคือเทคโนโลยีของบริษัทประกัน
      </p>
    </div>

    <div class="stat-row">
      <div class="stat"><b>${PLACES.length}</b><span>ปลายทาง</span></div>
      <div class="stat"><b>${ACTIVITIES.length}</b><span>กิจกรรม</span></div>
      <div class="stat"><b>${PLANS.length}</b><span>แผนสาธิต</span></div>
    </div>

    <section class="card">
      <h2 class="card-title">ปัญหาที่เราแก้</h2>
      <p style="font-size:14px;color:var(--ink-soft);margin:0">
        บริษัทประกันมีผลิตภัณฑ์ที่ดีอยู่แล้ว แต่ผู้บริโภค<b style="color:var(--ink)">ไม่รู้ว่าตัวเองควรซื้ออะไร</b>
        และไม่รู้ว่าความเสี่ยงจริงของตัวเองอยู่ตรงไหน ช่องว่างนี้ทำให้คนไม่ซื้อ หรือซื้อผิดแบบ
      </p>
    </section>

    <section class="card">
      <h2 class="card-title">แพลตฟอร์มทำงานอย่างไร</h2>
      <div class="flow-diagram">
        <div class="flow-node">ลูกค้าเล่าทริปด้วยภาษาธรรมดา</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-node is-us">ประกันไปกับคุณ — วิเคราะห์ความเสี่ยง + จับคู่ความคุ้มครอง</div>
        <div class="flow-arrow">↓</div>
        <div class="flow-partners">
          ${Object.values(PARTNERS).map(p => `<div class="flow-node">${esc(p.name)}</div>`).join('')}
        </div>
        <div class="flow-arrow">↓</div>
        <div class="flow-node">บริษัทออกกรมธรรม์จริง</div>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">สิ่งที่บริษัทประกันได้</h2>
      <ul class="reason-list">
        <li class="reason"><span class="reason-mark">✓</span><span><b>ช่องทางขายใหม่</b> เข้าถึงลูกค้าตอนที่กำลังตัดสินใจเดินทาง ซึ่งเป็นจังหวะที่ต้องการความคุ้มครองจริง</span></li>
        <li class="reason"><span class="reason-mark">✓</span><span><b>ลูกค้าที่เข้าใจสินค้า</b> ระบบอธิบายเหตุผลให้ก่อนแล้ว ลดข้อพิพาทเรื่องความคุ้มครองภายหลัง</span></li>
        <li class="reason"><span class="reason-mark">✓</span><span><b>ข้อมูลเชิงลึกความเสี่ยง</b> เห็นว่าลูกค้าทำกิจกรรมอะไร เพื่อออกแบบผลิตภัณฑ์ใหม่</span></li>
        <li class="reason"><span class="reason-mark">✓</span><span><b>ไม่ต้องสร้างเอง</b> เชื่อม API แล้วใช้ได้ ไม่ต้องลงทุนพัฒนา AI เอง</span></li>
      </ul>
    </section>

    <section class="card">
      <h2 class="card-title">รูปแบบรายได้ที่เป็นไปได้</h2>
      <ul class="reason-list">
        <li class="reason"><span class="reason-mark">1</span><span>ค่าธรรมเนียมต่อกรมธรรม์ที่เกิดขึ้นผ่านแพลตฟอร์ม</span></li>
        <li class="reason"><span class="reason-mark">2</span><span>ค่าบริการรายเดือนสำหรับใช้ระบบวิเคราะห์ (SaaS)</span></li>
        <li class="reason"><span class="reason-mark">3</span><span>ให้บริษัทฝัง engine ลงในแอปของตัวเอง (white-label)</span></li>
      </ul>
    </section>

    <section class="card tone-warn">
      <h2 class="card-title">เส้นทางสู่การใช้งานจริง</h2>
      <p class="card-hint">การได้ API ไม่ใช่ปัญหาทางเทคนิค แต่เป็นกระบวนการด้านกฎหมายและความร่วมมือ</p>
      <ul class="reason-list">
        <li class="reason"><span class="reason-mark">1</span><span>ขอใบอนุญาตนายหน้าประกันวินาศภัยจาก คปภ.</span></li>
        <li class="reason"><span class="reason-mark">2</span><span>เข้า Regulatory Sandbox เพื่อทดสอบภายใต้การกำกับดูแล</span></li>
        <li class="reason"><span class="reason-mark">3</span><span>เริ่มจากพันธมิตรรายเดียวเป็น pilot เฉพาะผลิตภัณฑ์</span></li>
        <li class="reason"><span class="reason-mark">4</span><span>พิสูจน์ยอดขายจริง แล้วขยายไปบริษัทอื่น</span></li>
      </ul>
    </section>

    <section class="card tone-info">
      <h2 class="card-title">จุดยืนของเรา</h2>
      <p style="margin:0;font-size:14px;color:var(--ink-soft)">
        AI ช่วยให้ผู้บริโภคเข้าใจความเสี่ยงของตัวเองและหาความคุ้มครองที่เหมาะ
        แต่<b style="color:var(--ink)">การพิจารณารับประกันยังเป็นของบริษัทประกันภัยและผู้เชี่ยวชาญที่ได้รับใบอนุญาต</b>
        ระบบไม่อนุมัติ ไม่ปฏิเสธ และไม่กำหนดเบี้ยเอง
      </p>
    </section>

    <button type="button" class="btn btn-secondary" data-go="insurers">ดูบริษัทประกันภัยจริงในประเทศไทย</button>
  `;

  $$('#b2b-body [data-go]').forEach(btn =>
    btn.addEventListener('click', () => { haptic('light'); go(btn.dataset.go); }));
}
