/* trip.js — Trip Understanding & Insurance Matching Engine
 * ─────────────────────────────────────────────────────────────────────
 * แปลงประโยคภาษาไทยที่ผู้ใช้พิมพ์ เป็นข้อมูลที่ระบบเอาไปจับคู่ความคุ้มครองได้
 *
 * ⚠ สิ่งที่ต้องพูดให้ตรงความจริงเสมอ:
 *   ตัวแยกความหมายในไฟล์นี้เป็น rule-based NLU ไม่ใช่โมเดลภาษาขนาดใหญ่
 *   ข้อดีคือทำงานทันที ไม่ต้องต่อเน็ต ไม่ส่งข้อความของผู้ใช้ออกนอกเครื่อง
 *   ข้อจำกัดคือเข้าใจได้เฉพาะรูปประโยคที่ครอบคลุมไว้
 *   ระบบจึงให้ผู้ใช้ "แก้ไขได้ทุกช่อง" และ "พิมพ์ปลายทางเองได้" เสมอ
 *
 *   บริษัทพันธมิตร ก–จ แผน เบี้ย และทุนประกันในไฟล์นี้เป็นข้อมูลสมมติทั้งหมด
 *   ใช้สาธิตกลไกการจับคู่เท่านั้น ไม่ใช่ข้อเสนอจริงของบริษัทใด
 *   รายชื่อบริษัทจริงอยู่ในหน้า "บริษัทประกันภัยในไทย" และไม่มีราคาผูกไว้
 * ───────────────────────────────────────────────────────────────────── */

const Trip = (function () {

  /* ═══════════ ตัวเลขไทย ═══════════ */
  const NUM_WORD = {
    'หนึ่ง':1,'สอง':2,'สาม':3,'สี่':4,'ห้า':5,'หก':6,'เจ็ด':7,'แปด':8,'เก้า':9,'สิบ':10,
    'เดียว':1,'คู่':2
  };
  const THAI_DIGIT = { '๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9' };

  function normalize(s) {
    return String(s || '').replace(/[๐-๙]/g, d => THAI_DIGIT[d]).trim();
  }

  function numBefore(text, unit) {
    const m = text.match(new RegExp('(\\d+)\\s*' + unit));
    if (m) return parseInt(m[1], 10);
    const words = Object.keys(NUM_WORD).join('|');
    const w = text.match(new RegExp('(' + words + ')\\s*' + unit));
    if (w) return NUM_WORD[w[1]];
    return null;
  }

  /* ═══════════ ปลายทาง ═══════════
     ครอบคลุมทุกจังหวัดในไทยและปลายทางต่างประเทศยอดนิยม
     ถ้าผู้ใช้พิมพ์ที่ที่ไม่อยู่ในรายการ ระบบยังรับได้ แต่จะบอกตรง ๆ ว่าไม่รู้จัก */
  const GROUPS = [
    { kind: 'sea', abroad: false, note: 'ปลายทางติดทะเล มีโอกาสทำกิจกรรมทางน้ำ',
      list: ['ชลบุรี','พัทยา','บางแสน','ศรีราชา','ระยอง','เกาะเสม็ด','จันทบุรี','ตราด','เกาะช้าง',
             'หัวหิน','ชะอำ','เพชรบุรี','ประจวบคีรีขันธ์','ชุมพร','ระนอง',
             'สุราษฎร์ธานี','เกาะสมุย','สมุย','เกาะพะงัน','เกาะเต่า','นครศรีธรรมราช',
             'พังงา','เขาหลัก','ภูเก็ต','กระบี่','ตรัง','สตูล','สงขลา','หาดใหญ่',
             'ปัตตานี','ยะลา','นราธิวาส'] },

    { kind: 'mountain', abroad: false, note: 'เส้นทางภูเขา ทางโค้งลาดชัน อากาศเปลี่ยนแปลงเร็ว',
      list: ['เชียงใหม่','เชียงราย','แม่ฮ่องสอน','ปาย','น่าน','พะเยา','แพร่','ลำปาง','ลำพูน',
             'อุตรดิตถ์','สุโขทัย','ตาก','แม่สอด','เพชรบูรณ์','เขาค้อ','ภูทับเบิก',
             'เลย','เชียงคาน','ภูเรือ','กาญจนบุรี','สังขละบุรี','อุทัยธานี',
             'เขาใหญ่','ปากช่อง','วังน้ำเขียว','นครนายก'] },

    { kind: 'upcountry', abroad: false, note: 'เดินทางต่างจังหวัด ระยะทางไกล',
      list: ['นครราชสีมา','โคราช','ขอนแก่น','อุดรธานี','หนองคาย','บึงกาฬ','สกลนคร','นครพนม',
             'มุกดาหาร','กาฬสินธุ์','ร้อยเอ็ด','มหาสารคาม','ยโสธร','อำนาจเจริญ','อุบลราชธานี','อุบล','อุดร',
             'ศรีสะเกษ','สุรินทร์','บุรีรัมย์','ชัยภูมิ','หนองบัวลำภู',
             'พิษณุโลก','พิจิตร','กำแพงเพชร','นครสวรรค์','ลพบุรี','สระบุรี','สุพรรณบุรี',
             'ราชบุรี','ฉะเชิงเทรา','ปราจีนบุรี','สระแก้ว','อ่างทอง','สิงห์บุรี','ชัยนาท'] },

    { kind: 'city', abroad: false, note: 'เขตเมือง การจราจรหนาแน่น',
      list: ['กรุงเทพฯ','กรุงเทพ','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร','สมุทรสงคราม',
             'นครปฐม','พระนครศรีอยุธยา','อยุธยา'] },

    { kind: 'abroad', abroad: true, note: 'ต่างประเทศ ค่ารักษาพยาบาลสูงกว่าในไทยมาก',
      list: ['ญี่ปุ่น','โตเกียว','โอซาก้า','ฮอกไกโด','เกาหลี','โซล','ปูซาน',
             'จีน','ไต้หวัน','ฮ่องกง','มาเก๊า','สิงคโปร์','มาเลเซีย','เวียดนาม','ลาว','กัมพูชา',
             'พม่า','เมียนมา','อินโดนีเซีย','บาหลี','ฟิลิปปินส์','อินเดีย','เนปาล','ภูฏาน',
             'ดูไบ','ตุรกี','อียิปต์','มัลดีฟส์',
             'ยุโรป','อังกฤษ','ฝรั่งเศส','อิตาลี','สวิตเซอร์แลนด์','เยอรมนี','สเปน','รัสเซีย',
             'ออสเตรเลีย','นิวซีแลนด์','อเมริกา','สหรัฐอเมริกา','แคนาดา'] }
  ];

  const PLACES = [];
  GROUPS.forEach(g => g.list.forEach(k => PLACES.push({ k: k, kind: g.kind, abroad: g.abroad, note: g.note })));
  // เรียงชื่อยาวไว้ก่อน เพื่อให้ "เกาะสมุย" ชนะ "สมุย" และ "พระนครศรีอยุธยา" ชนะ "อยุธยา"
  const PLACES_BY_LEN = PLACES.slice().sort((a, b) => b.k.length - a.k.length);

  const TRANSPORT = [
    { key: 'moto',   label: 'รถจักรยานยนต์', words: ['มอเตอร์ไซค์','มอไซค์','จักรยานยนต์','บิ๊กไบค์','สกู๊ตเตอร์','ขี่รถ'] },
    { key: 'car',    label: 'รถยนต์',        words: ['รถยนต์','ขับรถ','รถเก๋ง','รถกระบะ','ขับไป','รถส่วนตัว'] },
    { key: 'plane',  label: 'เครื่องบิน',     words: ['เครื่องบิน','บินไป','สายการบิน','ขึ้นเครื่อง'] },
    { key: 'public', label: 'ขนส่งสาธารณะ',   words: ['รถทัวร์','รถไฟ','รถตู้','รถเมล์','แท็กซี่','รถบัส'] }
  ];

  const ACTIVITY = [
    { key: 'adventure', label: 'กิจกรรมผาดโผน', words: ['ดำน้ำ','ปีนเขา','เดินป่า','ล่องแก่ง','ปั่นจักรยาน','วิ่งมาราธอน','สกี','เซิร์ฟ','แคมป์','ตั้งแคมป์','พาราไกลดิ้ง','บันจี้'] },
    { key: 'work',      label: 'ทำงาน/ประชุม',  words: ['ทำงาน','ประชุม','สัมมนา','อบรม','ดูงาน','ออกบูธ','ติดต่อธุรกิจ'] },
    { key: 'leisure',   label: 'ท่องเที่ยว',    words: ['เที่ยว','พักผ่อน','ทริป','ไหว้พระ','กิน','ฮันนีมูน','ดูคอนเสิร์ต'] }
  ];

  /* ═══════════ 1. เข้าใจสิ่งที่ผู้ใช้พิมพ์ ═══════════ */
  function understand(raw) {
    const t = normalize(raw);
    const found = [];

    /* — จำนวนคน — */
    let people = numBefore(t, 'คน');
    let peopleFrom = people ? 'พบคำว่า "' + people + ' คน"' : null;

    // "พาลูก 2 คน" = ลูก 2 + ตัวเราเอง = 3
    if (people && /(พา|กับ|พร้อม|ไปกับ)/.test(t)) {
      people = people + 1;
      peopleFrom = 'พบว่าพาคนอื่นไปด้วย จึงนับรวมตัวคุณเองเป็น ' + people + ' คน';
    }
    if (!people) {
      if (/คนเดียว|ลำพัง|ตัวคนเดียว/.test(t)) {
        people = 1; peopleFrom = 'พบคำว่า "คนเดียว"';
      } else if (/(พา|กับ|ไปกับ)(แฟน|ภรรยา|สามี|คู่รัก|เมีย|ผัว)|คู่รัก|ฮันนีมูน/.test(t)) {
        people = 2; peopleFrom = 'พบว่าไปกับคู่ จึงนับเป็น 2 คน';
      } else if (/(พา|กับ)(พ่อ|แม่|พ่อแม่|ลูก|ครอบครัว)/.test(t) || /ครอบครัว/.test(t)) {
        people = 3; peopleFrom = 'พบว่าไปกับครอบครัว — ตั้งค่าเริ่มต้นไว้ 3 คน โปรดแก้ให้ตรง';
      } else if (/(พา|กับ)(เพื่อน)/.test(t)) {
        people = 2; peopleFrom = 'พบว่าไปกับเพื่อน — ตั้งค่าเริ่มต้นไว้ 2 คน โปรดแก้ให้ตรง';
      }
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
      else if (/เดือน/.test(t)) { days = 30; daysFrom = 'พบคำว่า "เดือน"'; }
    }

    /* — ปลายทาง — */
    const place = PLACES_BY_LEN.find(p => t.indexOf(p.k) !== -1) || null;

    /* — การเดินทาง / กิจกรรม — */
    const transport = TRANSPORT.find(m => m.words.some(w => t.indexOf(w) !== -1)) || null;
    const activity  = ACTIVITY.find(a => a.words.some(w => t.indexOf(w) !== -1)) || null;

    if (peopleFrom) found.push({ field: 'จำนวนคน', text: peopleFrom });
    if (daysFrom)   found.push({ field: 'ระยะเวลา', text: daysFrom });
    if (place)      found.push({ field: 'ปลายทาง',  text: 'รู้จัก "' + place.k + '" — ' + place.note });
    if (transport)  found.push({ field: 'การเดินทาง', text: 'พบว่าเดินทางด้วย' + transport.label });
    if (activity)   found.push({ field: 'กิจกรรม',  text: 'พบว่าเป็น' + activity.label });

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
      abroad: place ? place.abroad : false,
      transport: transport ? transport.key : '',
      activity: activity ? activity.key : '',
      found: found,
      missing: missing
    };
  }

  /* ค้นหาปลายทางที่ผู้ใช้พิมพ์เอง — ใช้ตอนผู้ใช้แก้ช่องปลายทาง */
  function lookupPlace(text) {
    const t = normalize(text);
    if (!t) return null;
    return PLACES_BY_LEN.find(p => p.k === t) || PLACES_BY_LEN.find(p => t.indexOf(p.k) !== -1) || null;
  }

  /* ═══════════ 2. แปลงทริปเป็นความเสี่ยง ═══════════ */
  function risks(trip) {
    const out = [];
    const T = trip.transport, A = trip.activity, P = trip.place;

    if (T === 'moto')   out.push({ icon: '🛵', title: 'อุบัติเหตุจากรถจักรยานยนต์', why: 'จักรยานยนต์เป็นพาหนะที่มีความเสี่ยงบาดเจ็บสูงที่สุดในการเดินทางทั่วไป' });
    if (T === 'car')    out.push({ icon: '🚗', title: 'อุบัติเหตุจากการขับขี่', why: 'เดินทางด้วยรถยนต์ ระยะทางไกลเพิ่มโอกาสเกิดเหตุและความอ่อนล้า' });
    if (T === 'plane')  out.push({ icon: '🧳', title: 'สัมภาระและเที่ยวบิน', why: 'การเดินทางด้วยเครื่องบินมีความเสี่ยงเรื่องสัมภาระสูญหายและเที่ยวบินล่าช้า' });
    if (T === 'public') out.push({ icon: '🚌', title: 'อุบัติเหตุระหว่างโดยสาร', why: 'เดินทางด้วยขนส่งสาธารณะ ควบคุมปัจจัยความปลอดภัยเองได้น้อย' });

    if (P && P.kind === 'mountain')  out.push({ icon: '⛰️', title: 'เส้นทางภูเขาและพื้นที่ธรรมชาติ', why: P.note });
    if (P && P.kind === 'sea')       out.push({ icon: '🌊', title: 'กิจกรรมทางน้ำ', why: 'ปลายทางติดทะเล มีโอกาสทำกิจกรรมทางน้ำที่เพิ่มความเสี่ยง' });
    if (P && P.kind === 'upcountry') out.push({ icon: '🛣️', title: 'เดินทางระยะไกล', why: 'ระยะทางไกลทำให้เหนื่อยล้าสะสม ซึ่งเป็นสาเหตุอุบัติเหตุที่พบบ่อย' });
    if (trip.abroad)                 out.push({ icon: '🏥', title: 'ค่ารักษาพยาบาลในต่างประเทศ', why: 'ค่ารักษาในต่างประเทศสูงกว่าในไทยมาก และสิทธิรักษาพยาบาลของไทยไม่ครอบคลุม' });

    if (A === 'adventure') out.push({ icon: '🧗', title: 'กิจกรรมผาดโผน', why: 'กิจกรรมประเภทนี้มักมีเงื่อนไขเฉพาะในกรมธรรม์ ต้องตรวจว่าคุ้มครองหรือยกเว้น' });

    if (trip.people >= 3) out.push({ icon: '👨‍👩‍👧', title: 'เดินทางเป็นกลุ่ม ' + trip.people + ' คน', why: 'ทุกคนในกลุ่มต้องมีความคุ้มครอง ไม่ใช่เฉพาะผู้จอง' });
    if (trip.days >= 5)   out.push({ icon: '📅', title: 'ทริประยะยาว ' + trip.days + ' วัน', why: 'ยิ่งอยู่นาน โอกาสเจอเหตุไม่คาดฝันยิ่งสะสมมากขึ้น' });

    return out;
  }

  /* ═══════════ 3. พันธมิตรและแผน (ข้อมูลสมมติทั้งหมด) ═══════════ */
  const PARTNERS = {
    A: { name: 'พันธมิตร ก', tone: '#1565C0' },
    B: { name: 'พันธมิตร ข', tone: '#00897B' },
    C: { name: 'พันธมิตร ค', tone: '#6A4CB8' },
    D: { name: 'พันธมิตร ง', tone: '#E2564D' },
    E: { name: 'พันธมิตร จ', tone: '#E8A317' }
  };

  const PLANS = [
    {
      id: 'A1', partner: 'A', name: 'PA เดินทางรายวัน', type: 'อุบัติเหตุ',
      rate: 19, fit: { transport: ['car','public','moto'], abroad: false },
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '100,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '10,000 บาท/ครั้ง' },
        { item: 'ค่าชดเชยรายวันระหว่างนอนโรงพยาบาล', amount: '500 บาท/วัน (สูงสุด 15 วัน)' }
      ],
      excludes: ['เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ', 'กิจกรรมผาดโผน', 'ขับขี่ขณะมึนเมา']
    },
    {
      id: 'A2', partner: 'A', name: 'PA เดินทาง + กิจกรรมผาดโผน', type: 'อุบัติเหตุ',
      rate: 35, fit: { activity: ['adventure'], abroad: false },
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '300,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '30,000 บาท/ครั้ง' },
        { item: 'ขยายความคุ้มครองกิจกรรมผาดโผนที่ระบุไว้', amount: 'รวมอยู่ในทุนหลัก' },
        { item: 'ค่าเคลื่อนย้ายผู้ป่วยฉุกเฉิน', amount: '50,000 บาท' }
      ],
      excludes: ['การแข่งขันเพื่อรางวัล', 'เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ']
    },
    {
      id: 'A3', partner: 'A', name: 'PA ผู้ขับขี่รถจักรยานยนต์', type: 'อุบัติเหตุ',
      rate: 28, fit: { transport: ['moto'], abroad: false },
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุรถจักรยานยนต์', amount: '200,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '20,000 บาท/ครั้ง' },
        { item: 'ค่าชดเชยรายวัน', amount: '700 บาท/วัน (สูงสุด 20 วัน)' }
      ],
      excludes: ['ขับขี่โดยไม่มีใบอนุญาต', 'ไม่สวมหมวกนิรภัย', 'แข่งขันความเร็ว']
    },
    {
      id: 'B1', partner: 'B', name: 'ประกันเดินทางในประเทศ', type: 'เดินทาง',
      rate: 25, fit: { transport: ['car','public','plane'], abroad: false },
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '200,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '20,000 บาท/ครั้ง' },
        { item: 'สัมภาระสูญหายหรือเสียหาย', amount: '10,000 บาท' },
        { item: 'การเดินทางล่าช้าเกิน 6 ชั่วโมง', amount: '1,000 บาท' }
      ],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'ทรัพย์สินมีค่าที่ไม่ได้แจ้งไว้']
    },
    {
      id: 'B2', partner: 'B', name: 'ประกันเดินทางต่างประเทศ (แผนหลัก)', type: 'เดินทางต่างประเทศ',
      rate: 89, fit: { abroad: true },
      sums: [
        { item: 'ค่ารักษาพยาบาลในต่างประเทศ', amount: '2,000,000 บาท' },
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '1,000,000 บาท' },
        { item: 'ค่าเคลื่อนย้ายกลับประเทศไทย', amount: 'ตามจริง' },
        { item: 'สัมภาระสูญหาย', amount: '30,000 บาท' },
        { item: 'เที่ยวบินล่าช้าหรือยกเลิก', amount: '5,000 บาท' }
      ],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'การเดินทางเข้าพื้นที่เสี่ยงภัยสงคราม']
    },
    {
      id: 'B3', partner: 'B', name: 'ประกันเดินทางต่างประเทศ (แผนประหยัด)', type: 'เดินทางต่างประเทศ',
      rate: 55, fit: { abroad: true },
      sums: [
        { item: 'ค่ารักษาพยาบาลในต่างประเทศ', amount: '1,000,000 บาท' },
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '500,000 บาท' },
        { item: 'สัมภาระสูญหาย', amount: '15,000 บาท' }
      ],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'เที่ยวบินล่าช้า', 'กิจกรรมผาดโผน']
    },
    {
      id: 'C1', partner: 'C', name: 'PA ระยะสั้นเฉพาะบุคคล', type: 'อุบัติเหตุ',
      rate: 15, fit: {},
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวรจากอุบัติเหตุ', amount: '50,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '5,000 บาท/ครั้ง' }
      ],
      excludes: ['สัมภาระ', 'ความไม่สะดวกในการเดินทาง', 'กิจกรรมผาดโผน']
    },
    {
      id: 'C2', partner: 'C', name: 'PA ครอบครัว', type: 'อุบัติเหตุ',
      rate: 22, fit: { minPeople: 3, abroad: false },
      sums: [
        { item: 'เสียชีวิต / ทุพพลภาพถาวร (ทุกคนในกลุ่ม)', amount: '150,000 บาท/คน' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '15,000 บาท/คน/ครั้ง' },
        { item: 'ค่าชดเชยรายวัน', amount: '500 บาท/วัน' },
        { item: 'คุ้มครองผู้เยาว์ในกลุ่ม', amount: 'รวมอยู่ในทุนหลัก' }
      ],
      excludes: ['เจ็บป่วยที่ไม่ได้เกิดจากอุบัติเหตุ', 'กิจกรรมผาดโผน']
    },
    {
      id: 'D1', partner: 'D', name: 'ประกันสุขภาพระหว่างเดินทาง', type: 'สุขภาพ',
      rate: 42, fit: {},
      sums: [
        { item: 'ค่ารักษาพยาบาลจากการเจ็บป่วย', amount: '50,000 บาท' },
        { item: 'ค่ารักษาพยาบาลจากอุบัติเหตุ', amount: '50,000 บาท' },
        { item: 'ค่าห้องผู้ป่วยใน', amount: '2,000 บาท/วัน' },
        { item: 'อาหารเป็นพิษระหว่างเดินทาง', amount: 'รวมอยู่ในทุนหลัก' }
      ],
      excludes: ['โรคประจำตัวที่เป็นอยู่ก่อน', 'การตั้งครรภ์', 'ทันตกรรม']
    },
    {
      id: 'E1', partner: 'E', name: 'ประกันสัมภาระและเที่ยวบิน', type: 'สัมภาระ',
      rate: 18, fit: { transport: ['plane'] },
      sums: [
        { item: 'สัมภาระสูญหายหรือเสียหาย', amount: '25,000 บาท' },
        { item: 'สัมภาระมาถึงล่าช้าเกิน 6 ชั่วโมง', amount: '3,000 บาท' },
        { item: 'เที่ยวบินล่าช้าหรือยกเลิก', amount: '4,000 บาท' },
        { item: 'เอกสารเดินทางสูญหาย', amount: '5,000 บาท' }
      ],
      excludes: ['การบาดเจ็บของผู้เอาประกัน', 'เงินสดและทรัพย์สินมีค่า']
    }
  ];

  /* ═══════════ 4. จับคู่แผนกับทริป ═══════════ */
  function match(trip) {
    const abroad = !!trip.abroad;
    const excluded = [];

    const scored = PLANS.map(p => {
      let score = 0;
      const reasons = [];

      // กรองแผนที่ใช้ไม่ได้ พร้อมบันทึกเหตุผลไว้แสดงให้ผู้ใช้เห็น
      if (p.fit.abroad === true && !abroad) {
        excluded.push({ name: p.name, why: 'เป็นแผนสำหรับต่างประเทศ แต่ทริปนี้อยู่ในประเทศ' });
        return null;
      }
      if (p.fit.abroad === false && abroad) {
        excluded.push({ name: p.name, why: 'เป็นแผนสำหรับในประเทศ แต่ทริปนี้ไปต่างประเทศ' });
        return null;
      }
      if (p.fit.minPeople && trip.people < p.fit.minPeople) {
        excluded.push({ name: p.name, why: 'ต้องมีผู้เดินทางตั้งแต่ ' + p.fit.minPeople + ' คนขึ้นไป' });
        return null;
      }
      if (p.fit.transport && trip.transport && p.fit.transport.indexOf(trip.transport) === -1) {
        const lb = (TRANSPORT.find(x => x.key === trip.transport) || {}).label || '';
        excluded.push({ name: p.name, why: 'ไม่ได้ออกแบบมาสำหรับการเดินทางด้วย' + lb });
        return null;
      }

      if (p.fit.abroad === true) { score += 60; reasons.push('ปลายทางอยู่ต่างประเทศ แผนนี้เน้นค่ารักษาพยาบาลนอกประเทศ'); }
      if (p.fit.minPeople)       { score += 30; reasons.push('เดินทาง ' + trip.people + ' คน ตรงกับแผนสำหรับกลุ่มตั้งแต่ ' + p.fit.minPeople + ' คน'); }
      if (p.fit.activity && trip.activity && p.fit.activity.indexOf(trip.activity) !== -1) {
        score += 45; reasons.push('ทริปมีกิจกรรมผาดโผน แผนนี้ขยายความคุ้มครองส่วนนี้ให้');
      }
      if (p.fit.transport && trip.transport && p.fit.transport.indexOf(trip.transport) !== -1) {
        score += 25;
        const label = (TRANSPORT.find(x => x.key === trip.transport) || {}).label || '';
        reasons.push('เหมาะกับการเดินทางด้วย' + label);
      }
      if (!Object.keys(p.fit).length) { score += 10; reasons.push('เป็นแผนพื้นฐานที่ใช้ได้กับทริปทั่วไป'); }
      if (trip.days >= 3 && p.type === 'สุขภาพ') { score += 15; reasons.push('ทริปยาว ' + trip.days + ' วัน ความเสี่ยงเจ็บป่วยระหว่างทางสูงขึ้น'); }

      score += Math.max(0, 12 - p.rate / 8);

      const warn = (trip.activity === 'adventure' && p.excludes.some(e => e.indexOf('ผาดโผน') !== -1))
        ? 'ทริปนี้มีกิจกรรมผาดโผน แต่แผนนี้ระบุยกเว้นไว้ ควรตรวจเงื่อนไขก่อน' : null;

      const total = p.rate * trip.people * trip.days;

      return {
        plan: p, partner: PARTNERS[p.partner], score: score,
        reasons: reasons.slice(0, 3), warn: warn, perUnit: p.rate, total: total,
        breakdown: p.rate + ' บาท × ' + trip.people + ' คน × ' + trip.days + ' วัน = ' + total.toLocaleString('th-TH') + ' บาท'
      };
    }).filter(Boolean);

    scored.sort((a, b) => b.score - a.score);
    return { matched: scored, excluded: excluded };
  }

  return {
    understand: understand, lookupPlace: lookupPlace,
    risks: risks, match: match,
    TRANSPORT: TRANSPORT, ACTIVITY: ACTIVITY, PLACES: PLACES, PARTNERS: PARTNERS
  };
})();

/* ตัวอย่างประโยคสำหรับให้ผู้ใช้กดลองได้ทันที */
const TRIP_EXAMPLES = [
  'ผมจะพาลูก 2 คนไปเที่ยวเขาใหญ่ 2 วัน',
  'กำลังจะพาแฟนไปเที่ยวชลบุรี 2 วัน 1 คืน',
  'บินไปญี่ปุ่น 5 วัน กับครอบครัว',
  'ขี่มอเตอร์ไซค์ไปปาย 3 วัน',
  'ไปดำน้ำที่กระบี่ 2 คน 3 วัน'
];

/* ═══════════ บริษัทประกันภัยจริงในประเทศไทย ═══════════
 * รายชื่อนี้เป็น "ลิงก์ไปเว็บไซต์ทางการ" เท่านั้น
 * ไม่มีเบี้ย ไม่มีทุนประกัน และไม่ได้แสดงว่าเป็นพันธมิตรของเรา
 * เพราะการนำชื่อบริษัทจริงมาผูกกับตัวเลขที่เราสมมติขึ้น
 * จะเป็นการสร้างข้อมูลเท็จเกี่ยวกับบริษัทที่มีตัวตนจริง
 */
const REAL_INSURERS = {
  official: [
    { name: 'สำนักงาน คปภ. (OIC)', url: 'https://www.oic.or.th/', note: 'หน่วยงานกำกับดูแลธุรกิจประกันภัย ตรวจสอบใบอนุญาตได้ที่นี่' },
    { name: 'สมาคมประกันวินาศภัยไทย (TGIA)', url: 'https://www.tgia.org/insurance/company', note: 'รายชื่อบริษัทสมาชิกอย่างเป็นทางการ ครบถ้วนที่สุด' }
  ],
  companies: [
    { name: 'เมืองไทยประกันภัย',   url: 'https://www.muangthaiinsurance.com/' },
    { name: 'กรุงเทพประกันภัย',    url: 'https://www.bangkokinsurance.com/' },
    { name: 'วิริยะประกันภัย',      url: 'https://www.viriyah.co.th/' },
    { name: 'ไทยวิวัฒน์ประกันภัย',  url: 'https://www.thaivivat.co.th/' },
    { name: 'ธนชาตประกันภัย',      url: 'https://www.thanachartinsurance.co.th/' },
    { name: 'ทิพยประกันภัย',       url: 'https://www.tipinsure.com/' }
  ],
  platforms: [
    { name: 'TQM',        url: 'https://www.tqm.co.th/',    note: 'โบรกเกอร์ เปรียบเทียบเบี้ยจากหลายบริษัท' },
    { name: 'รู้ใจ (Roojai)', url: 'https://www.roojai.com/',  note: 'ประกันออนไลน์ ปรับแต่งแผนเองได้' },
    { name: 'Insurverse', url: 'https://insurverse.co.th/', note: 'แพลตฟอร์มซื้อประกันออนไลน์' }
  ]
};
