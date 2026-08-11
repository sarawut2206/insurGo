/* trip.js — Trip Understanding & Insurance Matching Engine
 * ─────────────────────────────────────────────────────────────────────
 * แปลงประโยคภาษาไทยที่ผู้ใช้พิมพ์ เป็นข้อมูลที่ระบบเอาไปจับคู่ความคุ้มครองได้
 *
 * ⚠ สิ่งที่ต้องพูดให้ตรงความจริงเสมอ:
 *   ตัวแยกความหมายในไฟล์นี้เป็น rule-based NLU ไม่ใช่โมเดลภาษาขนาดใหญ่
 *   ข้อดีคือทำงานได้ทันที ไม่ต้องต่อเน็ต ไม่ส่งข้อความของผู้ใช้ออกนอกเครื่อง
 *   ข้อจำกัดคือเข้าใจได้เฉพาะรูปประโยคที่ครอบคลุมไว้
 *   ระบบจึงแสดงผลที่แยกได้ให้ผู้ใช้ "แก้ไขได้ทุกช่อง" เสมอ ไม่ใช่เดาแล้วเดินหน้าเลย
 *
 *   บริษัทพันธมิตรและเบี้ยประกันในไฟล์นี้เป็นข้อมูลสมมติทั้งหมด
 *   ใช้สาธิตกลไกการจับคู่เท่านั้น ไม่ใช่ข้อเสนอจริงของบริษัทใด
 * ───────────────────────────────────────────────────────────────────── */

const Trip = (function () {

  /* ─── ตัวเลขไทย ─── */
  const NUM_WORD = {
    'หนึ่ง':1,'สอง':2,'สาม':3,'สี่':4,'ห้า':5,'หก':6,'เจ็ด':7,'แปด':8,'เก้า':9,'สิบ':10,
    'เดียว':1,'คู่':2
  };
  const THAI_DIGIT = { '๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9' };

  function normalize(s) {
    return String(s || '').replace(/[๐-๙]/g, d => THAI_DIGIT[d]).trim();
  }

  // ดึงตัวเลขที่อยู่หน้าหน่วยที่ระบุ เช่น หา "2" จาก "2 คน" หรือ "สองคน"
  function numBefore(text, unit) {
    const m = text.match(new RegExp('(\\d+)\\s*' + unit));
    if (m) return parseInt(m[1], 10);
    const words = Object.keys(NUM_WORD).join('|');
    const w = text.match(new RegExp('(' + words + ')\\s*' + unit));
    if (w) return NUM_WORD[w[1]];
    return null;
  }

  /* ─── ปลายทางที่ระบบรู้จัก ───
     ไม่ได้ครอบคลุมทุกที่ ถ้าไม่เจอระบบจะบอกตรง ๆ ว่าไม่รู้จัก แล้วให้ผู้ใช้เลือกเอง */
  const PLACES = [
    { k: 'เขาใหญ่',  kind: 'nature',  abroad: false, note: 'อุทยานแห่งชาติ ถนนภูเขาลาดชัน' },
    { k: 'เชียงใหม่', kind: 'nature',  abroad: false, note: 'เส้นทางภูเขา อากาศเปลี่ยนแปลง' },
    { k: 'เชียงราย',  kind: 'nature',  abroad: false, note: 'เส้นทางภูเขา' },
    { k: 'ปาย',      kind: 'nature',  abroad: false, note: 'ทางโค้งภูเขาจำนวนมาก' },
    { k: 'กาญจนบุรี', kind: 'nature',  abroad: false, note: 'กิจกรรมทางน้ำและป่า' },
    { k: 'ภูเก็ต',    kind: 'sea',     abroad: false, note: 'กิจกรรมทางทะเล' },
    { k: 'กระบี่',    kind: 'sea',     abroad: false, note: 'กิจกรรมทางทะเล' },
    { k: 'สมุย',     kind: 'sea',     abroad: false, note: 'กิจกรรมทางทะเล' },
    { k: 'พัทยา',    kind: 'sea',     abroad: false, note: 'กิจกรรมทางทะเล' },
    { k: 'หัวหิน',    kind: 'sea',     abroad: false, note: 'ชายทะเล' },
    { k: 'ญี่ปุ่น',    kind: 'city',    abroad: true,  note: 'ต่างประเทศ ค่ารักษาพยาบาลสูง' },
    { k: 'เกาหลี',    kind: 'city',    abroad: true,  note: 'ต่างประเทศ ค่ารักษาพยาบาลสูง' },
    { k: 'สิงคโปร์',  kind: 'city',    abroad: true,  note: 'ต่างประเทศ ค่ารักษาพยาบาลสูง' },
    { k: 'เวียดนาม',  kind: 'city',    abroad: true,  note: 'ต่างประเทศ' },
    { k: 'ลาว',      kind: 'city',    abroad: true,  note: 'ต่างประเทศ' },
    { k: 'ยุโรป',     kind: 'city',    abroad: true,  note: 'ต่างประเทศ ระยะไกล ค่ารักษาสูงมาก' },
    { k: 'กรุงเทพ',   kind: 'city',    abroad: false, note: 'เขตเมือง การจราจรหนาแน่น' }
  ];

  const TRANSPORT = [
    { key: 'moto',   label: 'รถจักรยานยนต์', words: ['มอเตอร์ไซค์','มอไซค์','จักรยานยนต์','บิ๊กไบค์','สกู๊ตเตอร์'] },
    { key: 'car',    label: 'รถยนต์',        words: ['รถยนต์','ขับรถ','รถเก๋ง','รถกระบะ','รถตู้ส่วนตัว','ขับไป'] },
    { key: 'plane',  label: 'เครื่องบิน',     words: ['เครื่องบิน','บินไป','สายการบิน'] },
    { key: 'public', label: 'ขนส่งสาธารณะ',   words: ['รถทัวร์','รถไฟ','รถตู้','รถเมล์','แท็กซี่'] }
  ];

  const ACTIVITY = [
    { key: 'adventure', label: 'กิจกรรมผาดโผน', words: ['ดำน้ำ','ปีนเขา','เดินป่า','ล่องแก่ง','ปั่นจักรยาน','วิ่งมาราธอน','สกี','เซิร์ฟ','แคมป์','ตั้งแคมป์'] },
    { key: 'work',      label: 'ทำงาน/ประชุม',  words: ['ทำงาน','ประชุม','สัมมนา','อบรม','ดูงาน','ออกบูธ'] },
    { key: 'leisure',   label: 'ท่องเที่ยว',    words: ['เที่ยว','พักผ่อน','ทริป','ไหว้พระ','กิน'] }
  ];

  /* ═══════════ 1. เข้าใจสิ่งที่ผู้ใช้พิมพ์ ═══════════ */
  function understand(raw) {
    const t = normalize(raw);
    const found = [];   // สิ่งที่ระบบจับได้ พร้อมบอกว่าจับจากคำไหน

    /* — จำนวนคน — */
    let people = numBefore(t, 'คน');
    let peopleFrom = people ? 'พบคำว่า "' + people + ' คน"' : null;

    // "พาลูก 2 คน" = ลูก 2 + ตัวเราเอง = 3
    if (people && /(พา|กับ|พร้อม)/.test(t)) {
      people = people + 1;
      peopleFrom = 'พบว่าพาคนอื่นไปด้วย จึงนับรวมตัวคุณเองเป็น ' + people + ' คน';
    }
    if (!people) {
      if (/คนเดียว|ลำพัง/.test(t))        { people = 1; peopleFrom = 'พบคำว่า "คนเดียว"'; }
      else if (/กับแฟน|กับภรรยา|กับสามี|คู่รัก/.test(t)) { people = 2; peopleFrom = 'พบว่าไปกับคู่ จึงนับเป็น 2 คน'; }
      else if (/ครอบครัว/.test(t))        { people = 4; peopleFrom = 'พบคำว่า "ครอบครัว" — ตั้งค่าเริ่มต้นไว้ 4 คน โปรดแก้ให้ตรง'; }
    }

    /* — จำนวนวัน — */
    let days = numBefore(t, 'วัน');
    let daysFrom = days ? 'พบคำว่า "' + days + ' วัน"' : null;
    if (!days) {
      const nights = numBefore(t, 'คืน');
      if (nights) { days = nights + 1; daysFrom = 'พบ "' + nights + ' คืน" จึงนับเป็น ' + days + ' วัน'; }
      else if (/สุดสัปดาห์|เสาร์อาทิตย์/.test(t)) { days = 2; daysFrom = 'พบคำว่า "สุดสัปดาห์"'; }
      else if (/เช้าเย็นกลับ|ไปกลับ|วันเดียว/.test(t)) { days = 1; daysFrom = 'พบว่าเป็นทริปไปกลับวันเดียว'; }
      else if (/สัปดาห์|อาทิตย์/.test(t)) { days = 7; daysFrom = 'พบคำว่า "สัปดาห์"'; }
    }

    /* — ปลายทาง — */
    const place = PLACES.find(p => t.indexOf(p.k) !== -1) || null;

    /* — การเดินทาง — */
    const transport = TRANSPORT.find(m => m.words.some(w => t.indexOf(w) !== -1)) || null;

    /* — กิจกรรม — */
    const activity = ACTIVITY.find(a => a.words.some(w => t.indexOf(w) !== -1)) || null;

    if (peopleFrom) found.push({ field: 'จำนวนคน', text: peopleFrom });
    if (daysFrom)   found.push({ field: 'ระยะเวลา', text: daysFrom });
    if (place)      found.push({ field: 'ปลายทาง',  text: 'รู้จัก "' + place.k + '" — ' + place.note });
    if (transport)  found.push({ field: 'การเดินทาง', text: 'พบว่าเดินทางด้วย' + transport.label });
    if (activity)   found.push({ field: 'กิจกรรม',  text: 'พบว่าเป็น' + activity.label });

    /* — สิ่งที่ระบบไม่เข้าใจ ต้องบอกให้ชัด ไม่ใช่เงียบแล้วเดา — */
    const missing = [];
    if (!people)    missing.push('จำนวนคน');
    if (!days)      missing.push('จำนวนวัน');
    if (!place)     missing.push('ปลายทาง');
    if (!transport) missing.push('วิธีเดินทาง');

    return {
      raw: raw,
      people: people || 1,
      days: days || 1,
      place: place,
      placeText: place ? place.k : '',
      transport: transport ? transport.key : '',
      activity: activity ? activity.key : '',
      found: found,
      missing: missing
    };
  }

  /* ═══════════ 2. แปลงทริปเป็นความเสี่ยง ═══════════ */
  function risks(trip) {
    const out = [];
    const T = trip.transport, A = trip.activity, P = trip.place;

    if (T === 'moto')   out.push({ icon: '🛵', title: 'อุบัติเหตุจากรถจักรยานยนต์', why: 'จักรยานยนต์เป็นพาหนะที่มีความเสี่ยงบาดเจ็บสูงที่สุดในการเดินทางทั่วไป' });
    if (T === 'car')    out.push({ icon: '🚗', title: 'อุบัติเหตุจากการขับขี่', why: 'เดินทางด้วยรถยนต์ ระยะทางไกลเพิ่มโอกาสเกิดเหตุและความอ่อนล้า' });
    if (T === 'plane')  out.push({ icon: '🧳', title: 'สัมภาระและเที่ยวบิน', why: 'การเดินทางด้วยเครื่องบินมีความเสี่ยงเรื่องสัมภาระสูญหายและเที่ยวบินล่าช้า' });
    if (T === 'public') out.push({ icon: '🚌', title: 'อุบัติเหตุระหว่างโดยสาร', why: 'เดินทางด้วยขนส่งสาธารณะ ควบคุมปัจจัยความปลอดภัยเองได้น้อย' });

    if (P && P.kind === 'nature') out.push({ icon: '⛰️', title: 'เส้นทางภูเขาและพื้นที่ธรรมชาติ', why: P.note });
    if (P && P.kind === 'sea')    out.push({ icon: '🌊', title: 'กิจกรรมทางน้ำ', why: 'ปลายทางติดทะเล มีโอกาสทำกิจกรรมทางน้ำที่เพิ่มความเสี่ยง' });
    if (P && P.abroad)            out.push({ icon: '🏥', title: 'ค่ารักษาพยาบาลในต่างประเทศ', why: 'ค่ารักษาในต่างประเทศสูงกว่าในไทยมาก และสวัสดิการรัฐไทยไม่ครอบคลุม' });

    if (A === 'adventure') out.push({ icon: '🧗', title: 'กิจกรรมผาดโผน', why: 'กิจกรรมประเภทนี้มักมีเงื่อนไขเฉพาะในกรมธรรม์ ต้องตรวจว่าคุ้มครองหรือยกเว้น' });

    if (trip.people >= 3) out.push({ icon: '👨‍👩‍👧', title: 'เดินทางเป็นกลุ่ม ' + trip.people + ' คน', why: 'ทุกคนในกลุ่มต้องมีความคุ้มครอง ไม่ใช่เฉพาะผู้จอง' });
    if (trip.days >= 5)   out.push({ icon: '📅', title: 'ทริประยะยาว ' + trip.days + ' วัน', why: 'ยิ่งอยู่นาน โอกาสเจอเหตุไม่คาดฝันยิ่งสะสมมากขึ้น' });

    return out;
  }

  /* ═══════════ 3. บริษัทพันธมิตรและแผน (ข้อมูลสมมติทั้งหมด) ═══════════ */
  const PARTNERS = {
    A: { name: 'พันธมิตร ก', tone: '#1565C0' },
    B: { name: 'พันธมิตร ข', tone: '#00897B' },
    C: { name: 'พันธมิตร ค', tone: '#6A4CB8' }
  };

  const PLANS = [
    {
      id: 'A1', partner: 'A', name: 'PA เดินทางรายวัน',
      rate: 19, note: 'คิดตามจำนวนคนและจำนวนวันจริง',
      fit: { transport: ['car','public','moto'], abroad: false },
      covers: ['อุบัติเหตุระหว่างเดินทาง', 'ค่ารักษาพยาบาลจากอุบัติเหตุ', 'ค่าชดเชยรายวันเมื่อนอนโรงพยาบาล'],
      excludes: ['เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ', 'กิจกรรมผาดโผนบางประเภท']
    },
    {
      id: 'A2', partner: 'A', name: 'PA เดินทาง + กิจกรรมผาดโผน',
      rate: 35, note: 'ขยายความคุ้มครองกิจกรรมเสี่ยง',
      fit: { activity: ['adventure'], abroad: false },
      covers: ['อุบัติเหตุระหว่างเดินทาง', 'กิจกรรมผาดโผนที่ระบุไว้', 'ค่ารักษาพยาบาลจากอุบัติเหตุ', 'ค่าเคลื่อนย้ายผู้ป่วยฉุกเฉิน'],
      excludes: ['การแข่งขันเพื่อรางวัล', 'เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ']
    },
    {
      id: 'B1', partner: 'B', name: 'ประกันเดินทางในประเทศ',
      rate: 25, note: 'ครอบคลุมทั้งอุบัติเหตุและความไม่สะดวกในการเดินทาง',
      fit: { transport: ['car','public','plane'], abroad: false },
      covers: ['อุบัติเหตุระหว่างเดินทาง', 'ค่ารักษาพยาบาลจากอุบัติเหตุ', 'สัมภาระสูญหายหรือเสียหาย', 'การเดินทางล่าช้า'],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'ทรัพย์สินมีค่าที่ไม่ได้แจ้งไว้']
    },
    {
      id: 'B2', partner: 'B', name: 'ประกันเดินทางต่างประเทศ',
      rate: 89, note: 'เน้นค่ารักษาพยาบาลในต่างประเทศ',
      fit: { abroad: true },
      covers: ['ค่ารักษาพยาบาลในต่างประเทศ', 'ค่าเคลื่อนย้ายกลับประเทศ', 'สัมภาระสูญหาย', 'เที่ยวบินล่าช้าหรือยกเลิก', 'ความช่วยเหลือฉุกเฉิน 24 ชม.'],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'การเดินทางเข้าพื้นที่เสี่ยงภัยสงคราม']
    },
    {
      id: 'C1', partner: 'C', name: 'PA ระยะสั้นเฉพาะบุคคล',
      rate: 15, note: 'แผนพื้นฐาน เบี้ยประหยัดที่สุด',
      fit: {},
      covers: ['อุบัติเหตุส่วนบุคคล', 'ค่ารักษาพยาบาลจากอุบัติเหตุ'],
      excludes: ['สัมภาระ', 'ความไม่สะดวกในการเดินทาง', 'กิจกรรมผาดโผน']
    },
    {
      id: 'C2', partner: 'C', name: 'PA ครอบครัว',
      rate: 22, note: 'ออกแบบสำหรับเดินทางเป็นกลุ่มตั้งแต่ 3 คน',
      fit: { minPeople: 3, abroad: false },
      covers: ['อุบัติเหตุส่วนบุคคลทุกคนในกลุ่ม', 'ค่ารักษาพยาบาลจากอุบัติเหตุ', 'ค่าชดเชยรายวัน', 'คุ้มครองผู้เยาว์ในกลุ่ม'],
      excludes: ['เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ', 'กิจกรรมผาดโผน']
    }
  ];

  /* ═══════════ 4. จับคู่แผนกับทริป ═══════════ */
  function match(trip) {
    const abroad = !!(trip.place && trip.place.abroad);

    const scored = PLANS.map(p => {
      let score = 0;
      const reasons = [];

      // แผนต่างประเทศกับในประเทศต้องไม่สลับกัน
      if (p.fit.abroad === true) {
        if (!abroad) return null;
        score += 60; reasons.push('ปลายทางอยู่ต่างประเทศ แผนนี้เน้นค่ารักษาพยาบาลนอกประเทศ');
      }
      if (p.fit.abroad === false && abroad) return null;

      if (p.fit.minPeople) {
        if (trip.people < p.fit.minPeople) return null;
        score += 30; reasons.push('เดินทาง ' + trip.people + ' คน ตรงกับแผนสำหรับกลุ่มตั้งแต่ ' + p.fit.minPeople + ' คน');
      }
      if (p.fit.activity && trip.activity && p.fit.activity.indexOf(trip.activity) !== -1) {
        score += 45; reasons.push('ทริปมีกิจกรรมผาดโผน แผนนี้ขยายความคุ้มครองส่วนนี้ให้');
      }
      if (p.fit.transport && trip.transport && p.fit.transport.indexOf(trip.transport) !== -1) {
        score += 25;
        const label = (TRANSPORT.find(x => x.key === trip.transport) || {}).label || '';
        reasons.push('เหมาะกับการเดินทางด้วย' + label);
      }
      if (!Object.keys(p.fit).length) {
        score += 10; reasons.push('เป็นแผนพื้นฐานที่ใช้ได้กับทริปทั่วไป');
      }
      // เบี้ยถูกกว่าได้แต้มเล็กน้อย เพื่อไม่ให้ดันแผนแพงขึ้นบนสุดเสมอ
      score += Math.max(0, 12 - p.rate / 8);

      // ถ้ามีกิจกรรมผาดโผนแต่แผนไม่คุ้มครอง ต้องเตือน ไม่ใช่ซ่อน
      const warn = (trip.activity === 'adventure' && p.excludes.some(e => e.indexOf('ผาดโผน') !== -1))
        ? 'ทริปนี้มีกิจกรรมผาดโผน แต่แผนนี้ระบุยกเว้นไว้ ควรตรวจเงื่อนไขก่อน' : null;

      const total = p.rate * trip.people * trip.days;

      return {
        plan: p,
        partner: PARTNERS[p.partner],
        score: score,
        reasons: reasons.slice(0, 3),
        warn: warn,
        perUnit: p.rate,
        total: total,
        breakdown: p.rate + ' บาท × ' + trip.people + ' คน × ' + trip.days + ' วัน = ' + total.toLocaleString('th-TH') + ' บาท'
      };
    }).filter(Boolean);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }

  return {
    understand: understand,
    risks: risks,
    match: match,
    TRANSPORT: TRANSPORT,
    ACTIVITY: ACTIVITY,
    PLACES: PLACES
  };
})();

/* ตัวอย่างประโยคสำหรับให้ผู้ใช้กดลองได้ทันที */
const TRIP_EXAMPLES = [
  'ผมจะพาลูก 2 คนไปเที่ยวเขาใหญ่ 2 วัน',
  'ขับรถไปเชียงใหม่กับแฟน 4 วัน',
  'บินไปญี่ปุ่น 5 วัน กับครอบครัว',
  'ขี่มอเตอร์ไซค์ไปปาย 3 วัน',
  'ไปดำน้ำที่กระบี่ 2 คน 3 วัน'
];
