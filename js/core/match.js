/* match.js — ประเมินความเสี่ยงของทริป และจับคู่ความคุ้มครอง
 *
 * หลักการที่ยึดไว้:
 * 1. ทุกคะแนนต้องอธิบายได้ว่ามาจากอะไร (explainable)
 * 2. แผนที่ยกเว้นสิ่งที่ผู้ใช้ตั้งใจจะไปทำ ต้องไม่ถูกแนะนำเป็นอันดับต้น
 * 3. แผนที่ถูกคัดออก ต้องบอกเหตุผล ไม่ใช่หายไปเงียบ ๆ
 */

import { PLANS, PARTNERS } from '../data/plans.js';
import { TRANSPORT_BY_KEY } from '../data/activities.js';
import { activityProfile } from './nlu.js';

/* ═══════════ ความเสี่ยงของทริป ═══════════ */
export function assessRisks(trip) {
  const profile = activityProfile(trip.activities, trip.custom);
  const has = tag => !!profile.tags[tag];
  const risks = [];

  // จากกิจกรรมที่เลือก
  if (has('road')) risks.push({ icon: '🛣️', title: 'อุบัติเหตุจากยานพาหนะ', why: 'ทริปนี้มีการเดินทางบนถนน ซึ่งเป็นสาเหตุการบาดเจ็บอันดับต้นของการท่องเที่ยว' });
  if (has('water')) risks.push({ icon: '🌊', title: 'อุบัติเหตุทางน้ำ', why: 'กิจกรรมทางน้ำที่คุณเลือกมีความเสี่ยงจมน้ำหรือบาดเจ็บ ซึ่งบางกรมธรรม์มีเงื่อนไขเฉพาะ' });
  if (has('height')) risks.push({ icon: '🧗', title: 'กิจกรรมบนที่สูง', why: 'กิจกรรมบนที่สูงมักถูกระบุเป็นข้อยกเว้น ต้องเลือกแผนที่ขยายความคุ้มครองส่วนนี้' });
  if (has('medical')) risks.push({ icon: '🤒', title: 'เจ็บป่วยระหว่างเดินทาง', why: 'อาหารและสภาพแวดล้อมที่ไม่คุ้นเคยเพิ่มโอกาสเจ็บป่วย ซึ่งประกันอุบัติเหตุทั่วไปไม่คุ้มครอง' });
  if (has('baggage')) risks.push({ icon: '🧳', title: 'สัมภาระและทรัพย์สิน', why: 'มีโอกาสสัมภาระสูญหาย เสียหาย หรือมาถึงล่าช้า' });
  if (has('night')) risks.push({ icon: '🌙', title: 'กิจกรรมช่วงกลางคืน', why: 'ทัศนวิสัยต่ำและแอลกอฮอล์เพิ่มความเสี่ยงอุบัติเหตุ และหลายกรมธรรม์ยกเว้นกรณีมึนเมา' });
  if (has('vulnerable')) risks.push({ icon: '👶', title: 'มีผู้ที่ต้องดูแลพิเศษร่วมเดินทาง', why: 'เด็กเล็ก ผู้สูงอายุ หรือผู้ตั้งครรภ์ มีเงื่อนไขการรับประกันต่างจากผู้ใหญ่ทั่วไป' });

  // กิจกรรมเสี่ยงสูงแม้เพียงอย่างเดียวก็ต้องขึ้นเตือน
  // เพราะเป็นสิ่งที่กรมธรรม์ส่วนใหญ่ระบุยกเว้นไว้ ผู้ใช้ต้องรู้ก่อนเลือกแผน
  if (profile.isExtreme) {
    const named = profile.riskyLabels.slice(0, 2).join(', ');
    risks.push({
      icon: '🤸',
      title: 'กิจกรรมผาดโผน' + (named ? ` (${named})` : ''),
      why: 'กิจกรรมประเภทนี้มักถูกระบุเป็นข้อยกเว้นในกรมธรรม์ทั่วไป ต้องเลือกแผนที่ขยายความคุ้มครองส่วนนี้โดยเฉพาะ'
    });
  }

  if (profile.highCount >= 2) {
    risks.push({
      icon: '⚠️',
      title: `มีกิจกรรมเสี่ยงสูง ${profile.highCount} อย่าง`,
      why: 'ยิ่งมีกิจกรรมเสี่ยงสูงหลายอย่างในทริปเดียว ยิ่งต้องตรวจข้อยกเว้นให้ละเอียดก่อนเลือกแผน'
    });
  }

  // จากปลายทางและขนาดทริป
  if (trip.place?.kind === 'mountain') risks.push({ icon: '⛰️', title: 'เส้นทางภูเขา', why: trip.place.note });
  if (trip.place?.kind === 'upcountry') risks.push({ icon: '🚙', title: 'เดินทางระยะไกล', why: 'ระยะทางไกลทำให้เหนื่อยล้าสะสม ซึ่งเป็นสาเหตุอุบัติเหตุที่พบบ่อย' });
  if (trip.abroad) risks.push({ icon: '🏥', title: 'ค่ารักษาพยาบาลในต่างประเทศ', why: 'ค่ารักษาในต่างประเทศสูงกว่าในไทยมาก และสิทธิรักษาพยาบาลของไทยไม่ครอบคลุม' });

  if (trip.people >= 3) risks.push({ icon: '👨‍👩‍👧', title: `เดินทางเป็นกลุ่ม ${trip.people} คน`, why: 'ทุกคนในกลุ่มต้องมีความคุ้มครอง ไม่ใช่เฉพาะผู้จอง' });
  if (trip.days >= 5) risks.push({ icon: '📅', title: `ทริประยะยาว ${trip.days} วัน`, why: 'ยิ่งอยู่นาน โอกาสเจอเหตุไม่คาดฝันยิ่งสะสมมากขึ้น' });

  return risks;
}

/* ═══════════ กติกาการให้คะแนน ═══════════
 * แยกออกมาเป็นค่าคงที่ เพื่อให้ปรับจูนได้โดยไม่ต้องไล่แก้ในตรรกะ
 */
const WEIGHT = {
  abroadMatch: 90,   // ทริปต่างประเทศ ค่ารักษาพยาบาลคือความเสี่ยงใหญ่ที่สุด
                     // ต้องมาก่อนแผนเสริมอย่างสัมภาระเสมอ
  extremeMatch: 45,
  groupMatch: 30,
  medicalMatch: 35,
  baggageMatch: 30,
  transportMatch: 25,
  longTripHealth: 10,
  genericPlan: 10,
  excludesUserActivity: -50   // แผนที่ยกเว้นสิ่งที่ผู้ใช้จะไปทำ ต้องตกอันดับ
};

function priceOf(plan, trip) {
  return plan.rate * trip.people * trip.days;
}

export function matchPlans(trip) {
  const profile = activityProfile(trip.activities, trip.custom);
  const abroad = !!trip.abroad;
  const excluded = [];

  const matched = PLANS.map(plan => {
    const { fit } = plan;
    const reasons = [];
    let score = 0;

    // ── คัดออก พร้อมบันทึกเหตุผลไว้แสดงให้ผู้ใช้เห็น ──
    if (fit.abroad === true && !abroad) {
      excluded.push({ name: plan.name, why: 'เป็นแผนสำหรับต่างประเทศ แต่ทริปนี้อยู่ในประเทศ' });
      return null;
    }
    if (fit.abroad === false && abroad) {
      excluded.push({ name: plan.name, why: 'เป็นแผนสำหรับในประเทศ แต่ทริปนี้ไปต่างประเทศ' });
      return null;
    }
    if (fit.minPeople && trip.people < fit.minPeople) {
      excluded.push({ name: plan.name, why: `ต้องมีผู้เดินทางตั้งแต่ ${fit.minPeople} คนขึ้นไป` });
      return null;
    }
    if (fit.transport && trip.transport && !fit.transport.includes(trip.transport)) {
      const label = TRANSPORT_BY_KEY[trip.transport]?.label || '';
      excluded.push({ name: plan.name, why: `ไม่ได้ออกแบบมาสำหรับการเดินทางด้วย${label}` });
      return null;
    }

    // ── ให้คะแนน พร้อมเหตุผลทุกข้อ ──
    if (fit.abroad === true) {
      score += WEIGHT.abroadMatch;
      reasons.push('ปลายทางอยู่ต่างประเทศ แผนนี้เน้นค่ารักษาพยาบาลนอกประเทศ ซึ่งสิทธิรักษาพยาบาลไทยไม่ครอบคลุม');
    }
    if (fit.minPeople) {
      score += WEIGHT.groupMatch;
      reasons.push(`เดินทาง ${trip.people} คน ตรงกับแผนสำหรับกลุ่มตั้งแต่ ${fit.minPeople} คน`);
    }
    if (fit.needsExtreme && profile.isExtreme) {
      score += WEIGHT.extremeMatch;
      const named = profile.riskyLabels.slice(0, 2).join(', ');
      reasons.push(`ทริปมีกิจกรรมเสี่ยงสูง${named ? ` (${named})` : ''} แผนนี้ขยายความคุ้มครองส่วนนี้ให้`);
    }
    if (fit.transport && trip.transport && fit.transport.includes(trip.transport)) {
      score += WEIGHT.transportMatch;
      reasons.push(`เหมาะกับการเดินทางด้วย${TRANSPORT_BY_KEY[trip.transport]?.label || ''}`);
    }
    if (!Object.keys(fit).length) {
      score += WEIGHT.genericPlan;
      reasons.push('เป็นแผนพื้นฐานที่ใช้ได้กับทริปทั่วไป');
    }
    if (plan.type === 'สุขภาพ' && profile.tags.medical) {
      score += WEIGHT.medicalMatch;
      reasons.push('ทริปมีความเสี่ยงเจ็บป่วย เช่น อาหารหรือสภาพแวดล้อมที่ไม่คุ้นเคย ซึ่งประกันอุบัติเหตุทั่วไปไม่คุ้มครอง');
    }
    if (plan.type === 'สัมภาระ' && profile.tags.baggage) {
      score += WEIGHT.baggageMatch;
      reasons.push('ทริปมีสัมภาระหรือทรัพย์สินที่ต้องดูแล');
    }
    if (trip.days >= 3 && plan.type === 'สุขภาพ') {
      score += WEIGHT.longTripHealth;
      reasons.push(`ทริปยาว ${trip.days} วัน ความเสี่ยงเจ็บป่วยระหว่างทางสูงขึ้น`);
    }

    // เบี้ยถูกกว่าได้แต้มเล็กน้อย เพื่อไม่ให้แผนแพงลอยขึ้นบนสุดเสมอ
    score += Math.max(0, 12 - plan.rate / 8);

    // ── เตือนเมื่อแผนยกเว้นกิจกรรมหลักของผู้ใช้ ──
    let warning = null;
    if (profile.isExtreme && plan.excludes.some(e => e.includes('ผาดโผน'))) {
      const named = profile.riskyLabels.slice(0, 2).join(', ');
      warning = `ทริปนี้มีกิจกรรมเสี่ยงสูง${named ? ` (${named})` : ''} แต่แผนนี้ระบุยกเว้นกิจกรรมผาดโผนไว้ ควรตรวจเงื่อนไขก่อน`;
      score += WEIGHT.excludesUserActivity;
    }

    const total = priceOf(plan, trip);

    return {
      plan,
      partner: PARTNERS[plan.partner],
      score,
      reasons: reasons.slice(0, 3),
      warning,
      total,
      breakdown: `${plan.rate} บาท × ${trip.people} คน × ${trip.days} วัน = ${total.toLocaleString('th-TH')} บาท`
    };
  }).filter(Boolean);

  matched.sort((a, b) => b.score - a.score);
  return { matched, excluded };
}
