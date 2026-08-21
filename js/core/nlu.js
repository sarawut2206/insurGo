/* nlu.js — เข้าใจประโยคภาษาไทยที่ผู้ใช้พิมพ์
 * ─────────────────────────────────────────────────────────────────────
 * ⚠ พูดให้ตรงความจริงเสมอ:
 *   นี่คือ rule-based NLU ไม่ใช่โมเดลภาษาขนาดใหญ่
 *   ข้อดี  — ทำงานทันที ไม่ต้องต่อเน็ต ไม่ส่งข้อความผู้ใช้ออกนอกเครื่อง
 *   ข้อจำกัด — เข้าใจเฉพาะรูปประโยคที่ครอบคลุมไว้
 *
 *   ระบบจึงต้องทำ 2 อย่างเสมอ:
 *   1. บอกผู้ใช้ว่าเข้าใจอะไรจากคำไหน (อธิบายได้)
 *   2. ให้แก้ไขได้ทุกช่อง (ไม่ตัดสินใจแทน)
 * ───────────────────────────────────────────────────────────────────── */

import { findPlaceIn } from '../data/places.js';
import {
  ACTIVITIES, ACTIVITY_BY_ID, BY_PLACE_KIND, GENERAL_ACTIVITIES, TRANSPORT
} from '../data/activities.js';

const NUM_WORDS = {
  'หนึ่ง': 1, 'สอง': 2, 'สาม': 3, 'สี่': 4, 'ห้า': 5,
  'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9, 'สิบ': 10,
  'เดียว': 1, 'คู่': 2
};

const THAI_DIGITS = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

const MIN_SUGGESTIONS = 10;   // จำนวนกิจกรรมขั้นต่ำที่ต้องเสนอให้ผู้ใช้เลือกเสมอ

function normalize(text) {
  return String(text || '').replace(/[๐-๙]/g, d => THAI_DIGITS[d]).trim();
}

/** หาตัวเลขที่อยู่หน้าหน่วย เช่น "2 คน" หรือ "สองคน" */
function numberBefore(text, unit) {
  const digits = text.match(new RegExp(`(\\d+)\\s*${unit}`));
  if (digits) return parseInt(digits[1], 10);

  const words = Object.keys(NUM_WORDS).join('|');
  const spelled = text.match(new RegExp(`(${words})\\s*${unit}`));
  return spelled ? NUM_WORDS[spelled[1]] : null;
}

/* ─────────── จำนวนคน ─────────── */
function readPeople(text) {
  let count = numberBefore(text, 'คน');

  if (count) {
    // "พาลูก 2 คน" = ลูก 2 คน + ตัวผู้เล่าเอง = 3 คน
    if (/(พา|กับ|พร้อม|ไปกับ)/.test(text)) {
      return { count: count + 1, why: `พบว่าพาคนอื่นไปด้วย จึงนับรวมตัวคุณเองเป็น ${count + 1} คน` };
    }
    return { count, why: `พบคำว่า "${count} คน"` };
  }

  if (/คนเดียว|ลำพัง|ตัวคนเดียว/.test(text)) {
    return { count: 1, why: 'พบคำว่า "คนเดียว"' };
  }
  if (/(พา|กับ|ไปกับ)(แฟน|ภรรยา|สามี|คู่รัก|เมีย|ผัว)|คู่รัก|ฮันนีมูน/.test(text)) {
    return { count: 2, why: 'พบว่าไปกับคู่ จึงนับเป็น 2 คน' };
  }
  if (/(พา|กับ)(พ่อ|แม่|พ่อแม่|ลูก|ครอบครัว)|ครอบครัว/.test(text)) {
    return { count: 3, why: 'พบว่าไปกับครอบครัว — ตั้งค่าเริ่มต้นไว้ 3 คน โปรดแก้ให้ตรง' };
  }
  if (/(พา|กับ)เพื่อน/.test(text)) {
    return { count: 2, why: 'พบว่าไปกับเพื่อน — ตั้งค่าเริ่มต้นไว้ 2 คน โปรดแก้ให้ตรง' };
  }
  return { count: null, why: null };
}

/* ─────────── จำนวนวัน ─────────── */
function readDays(text) {
  const days = numberBefore(text, 'วัน');
  if (days) return { count: days, why: `พบคำว่า "${days} วัน"` };

  const nights = numberBefore(text, 'คืน');
  if (nights) return { count: nights + 1, why: `พบ "${nights} คืน" จึงนับเป็น ${nights + 1} วัน` };

  if (/สุดสัปดาห์|เสาร์อาทิตย์/.test(text)) return { count: 2, why: 'พบคำว่า "สุดสัปดาห์"' };
  if (/เช้าเย็นกลับ|ไปกลับ|วันเดียว/.test(text)) return { count: 1, why: 'พบว่าเป็นทริปไปกลับวันเดียว' };
  if (/สัปดาห์|อาทิตย์/.test(text)) return { count: 7, why: 'พบคำว่า "สัปดาห์"' };
  if (/เดือน/.test(text)) return { count: 30, why: 'พบคำว่า "เดือน"' };

  return { count: null, why: null };
}

/* ─────────── กิจกรรมที่เสนอ ───────────
 * รับประกันว่าได้อย่างน้อย MIN_SUGGESTIONS รายการเสมอ
 * เพื่อให้ผู้ใช้มีตัวเลือกพอที่จะอธิบายทริปของตัวเองได้จริง
 */
export function suggestActivities({ place, abroad, alreadyPicked = [] }) {
  const out = [...alreadyPicked];
  const add = id => { if (ACTIVITY_BY_ID[id] && !out.includes(id)) out.push(id); };

  const kind = abroad ? 'abroad' : place?.kind;
  (BY_PLACE_KIND[kind] || []).forEach(add);

  if (abroad) { add('flight'); add('street'); }

  GENERAL_ACTIVITIES.forEach(id => { if (out.length < MIN_SUGGESTIONS) add(id); });
  ACTIVITIES.forEach(a => { if (out.length < MIN_SUGGESTIONS) add(a.id); });

  return out;
}

/* ─────────── จุดเข้าใช้งานหลัก ─────────── */
export function understand(raw) {
  const text = normalize(raw);
  const notes = [];

  const people = readPeople(text);
  const days = readDays(text);
  const place = findPlaceIn(text);
  const transport = TRANSPORT.find(t => t.words.some(w => text.includes(w))) || null;
  const abroad = place ? place.abroad : false;

  // กิจกรรมที่ผู้ใช้พูดถึงตรง ๆ
  const picked = [];
  ACTIVITIES.forEach(a => {
    if (a.words.some(w => text.includes(w))) picked.push(a.id);
  });

  // วิธีเดินทางคือกิจกรรมด้วย เพราะเป็นความเสี่ยงจริงตลอดทริป
  if (transport && !picked.includes(transport.activity)) picked.push(transport.activity);

  const suggested = suggestActivities({ place, abroad, alreadyPicked: picked });

  /* ถ้าผู้ใช้ไม่ได้เอ่ยถึงกิจกรรมเลย ระบบเลือกกิจกรรมที่แทบจะเกิดขึ้นแน่นอน
     ของปลายทางแบบนั้นให้เบื้องต้น — เฉพาะความเสี่ยงต่ำถึงกลาง
     ไม่เดากิจกรรมเสี่ยงสูงให้ใครเด็ดขาด และทำเครื่องหมายไว้ว่าเป็นการเดา */
  const guessed = [];
  if (picked.length < 3) {
    for (const id of suggested) {
      if (picked.length >= 3) break;
      const a = ACTIVITY_BY_ID[id];
      if (!a || a.risk === 'high' || picked.includes(id)) continue;
      picked.push(id);
      guessed.push(id);
    }
  }

  if (people.why) notes.push({ field: 'จำนวนคน', text: people.why });
  if (days.why) notes.push({ field: 'ระยะเวลา', text: days.why });
  if (place) notes.push({ field: 'ปลายทาง', text: `รู้จัก "${place.name}" — ${place.note}` });
  if (transport) notes.push({ field: 'การเดินทาง', text: `พบว่าเดินทางด้วย${transport.label}` });

  const stated = picked.filter(id => !guessed.includes(id));
  if (stated.length) {
    notes.push({
      field: 'กิจกรรม',
      text: 'จับได้จากที่คุณเล่าโดยตรง: ' + stated.map(id => ACTIVITY_BY_ID[id].label).join(', ')
    });
  }
  if (guessed.length) {
    notes.push({
      field: 'กิจกรรม (ระบบเสนอ)',
      text: 'คุณไม่ได้ระบุกิจกรรม ระบบจึงเลือกที่พบบ่อยของปลายทางแบบนี้ให้เบื้องต้น: ' +
            guessed.map(id => ACTIVITY_BY_ID[id].label).join(', ') + ' — กดยกเลิกได้ถ้าไม่ตรง'
    });
  }

  const missing = [];
  if (!people.count) missing.push('จำนวนคน');
  if (!days.count) missing.push('จำนวนวัน');
  if (!place) missing.push('ปลายทาง');
  if (!transport) missing.push('วิธีเดินทาง');

  return {
    raw,
    people: people.count || 1,
    days: days.count || 1,
    place,
    placeText: place?.name || '',
    abroad,
    transport: transport?.key || '',
    activities: picked,
    guessed,
    suggested,
    custom: [],
    notes,
    missing
  };
}

/* ─────────── สรุปโปรไฟล์กิจกรรม ───────────
 * ใช้ร่วมกันระหว่างตัวประเมินความเสี่ยงและตัวจับคู่แผน
 */
export function activityProfile(ids = [], custom = []) {
  const list = ids.map(id => ACTIVITY_BY_ID[id]).filter(Boolean);
  const tags = {};
  let highCount = 0;
  let midCount = 0;

  list.forEach(a => {
    a.tags.forEach(t => { tags[t] = true; });
    if (a.risk === 'high') highCount++;
    else if (a.risk === 'mid') midCount++;
  });

  // กิจกรรมที่ผู้ใช้พิมพ์เอง — สแกนคำเสี่ยงอย่างระมัดระวัง
  custom.forEach(txt => {
    const t = String(txt).toLowerCase();
    if (/ดำน้ำ|ปีน|กระโดด|แข่ง|วิบาก|สกี|โต้คลื่น|ล่องแก่ง|ผาดโผน|เสี่ยง|บันจี้|ร่มร่อน|เอทีวี|atv|จักรยานยนต์|มอเตอร์ไซค์|มอไซค์|เจ็ตสกี|สโนว์บอร์ด|พาราไกล|ซิปไลน์|โรยตัว|เซิร์ฟ|บิ๊กไบค์|สเก็ต|เซิร์ฟสเก็ต/.test(t)) {
      highCount++;
      tags.extreme = true;
    } else {
      midCount++;
    }
  });

  return {
    list,
    tags,
    highCount,
    midCount,
    // นับเป็นทริปผาดโผนเฉพาะเมื่อมีกิจกรรม "ความเสี่ยงสูง" จริง
    // กิจกรรมความเสี่ยงกลางอย่างเดินป่า ไม่ควรดันให้ระบบแนะนำแผนผาดโผนที่แพงกว่า
    // โดยเฉพาะเมื่อกิจกรรมนั้นมาจากการเดาของระบบเอง ไม่ใช่คำพูดของผู้ใช้
    isExtreme: highCount > 0,
    riskyLabels: list.filter(a => a.risk === 'high').map(a => a.label)
  };
}
