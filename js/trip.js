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

  /* ═══════════ คลังกิจกรรม ═══════════
     แต่ละกิจกรรมมี "ระดับความเสี่ยง" และ "แท็ก" ที่ใช้ส่งต่อไปยัง matching engine
     tags: water=ทางน้ำ · road=ยานพาหนะ · height=ที่สูง · medical=เจ็บป่วย
           baggage=สัมภาระ · vulnerable=กลุ่มเปราะบาง · night=กลางคืน */
  const ACTIVITIES = [
    // ── ทางน้ำและทะเล ──
    { id: 'swim',      label: 'ว่ายน้ำทะเล',        cat: 'sea',  risk: 'mid',  tags: ['water'],            words: ['ว่ายน้ำ','เล่นน้ำ','ลงทะเล'] },
    { id: 'snorkel',   label: 'ดำน้ำตื้น',          cat: 'sea',  risk: 'mid',  tags: ['water'],            words: ['ดำน้ำตื้น','สน็อกเกิล'] },
    { id: 'scuba',     label: 'ดำน้ำลึก',           cat: 'sea',  risk: 'high', tags: ['water','extreme'],  words: ['ดำน้ำลึก','สกูบา','ดำน้ำ'] },
    { id: 'jetski',    label: 'เจ็ตสกี / บานาน่าโบ๊ท', cat: 'sea', risk: 'high', tags: ['water','extreme'], words: ['เจ็ตสกี','บานาน่าโบ๊ท'] },
    { id: 'kayak',     label: 'พายเรือคายัค / SUP',  cat: 'sea',  risk: 'mid',  tags: ['water'],            words: ['คายัค','พายเรือ','ซับบอร์ด'] },
    { id: 'surf',      label: 'เซิร์ฟ / ไคท์เซิร์ฟ',  cat: 'sea',  risk: 'high', tags: ['water','extreme'],  words: ['เซิร์ฟ','โต้คลื่น','ไคท์'] },
    { id: 'boat',      label: 'ล่องเรือ / ทัวร์เกาะ', cat: 'sea',  risk: 'mid',  tags: ['water'],            words: ['ล่องเรือ','ทัวร์เกาะ','นั่งเรือ','ไปเกาะ'] },
    { id: 'fishing',   label: 'ตกปลา',              cat: 'sea',  risk: 'low',  tags: ['water'],            words: ['ตกปลา','ตกหมึก'] },
    { id: 'beach',     label: 'เดินเล่นชายหาด',      cat: 'sea',  risk: 'low',  tags: [],                   words: ['ชายหาด','เดินหาด','อาบแดด'] },

    // ── ภูเขาและธรรมชาติ ──
    { id: 'hike',      label: 'เดินป่า / เดินเทรล',   cat: 'nature', risk: 'mid',  tags: ['extreme'],        words: ['เดินป่า','เทรล','เดินเขา'] },
    { id: 'climb',     label: 'ปีนเขา / ปีนผา',      cat: 'nature', risk: 'high', tags: ['height','extreme'], words: ['ปีนเขา','ปีนผา','ปีนหน้าผา'] },
    { id: 'camp',      label: 'ตั้งแคมป์ / กางเต็นท์', cat: 'nature', risk: 'mid',  tags: [],                 words: ['แคมป์','กางเต็นท์','นอนเต็นท์'] },
    { id: 'raft',      label: 'ล่องแก่ง',            cat: 'nature', risk: 'high', tags: ['water','extreme'], words: ['ล่องแก่ง','แพยาง'] },
    { id: 'waterfall', label: 'เที่ยวน้ำตก',         cat: 'nature', risk: 'mid',  tags: ['water'],           words: ['น้ำตก'] },
    { id: 'viewpoint', label: 'ชมวิว / จุดชมวิว',    cat: 'nature', risk: 'low',  tags: [],                  words: ['ชมวิว','จุดชมวิว','ดูทะเลหมอก'] },
    { id: 'zipline',   label: 'ซิปไลน์ / โรยตัว',    cat: 'nature', risk: 'high', tags: ['height','extreme'], words: ['ซิปไลน์','โรยตัว'] },
    { id: 'stargaze',  label: 'ดูดาว',              cat: 'nature', risk: 'low',  tags: ['night'],           words: ['ดูดาว'] },
    { id: 'elephant',  label: 'ขี่ช้าง / ให้อาหารสัตว์', cat: 'nature', risk: 'mid', tags: [],               words: ['ขี่ช้าง','ปางช้าง','ให้อาหารสัตว์','สวนสัตว์'] },

    // ── การเดินทาง ──
    { id: 'longdrive', label: 'ขับรถทางไกล',        cat: 'transit', risk: 'mid',  tags: ['road'],           words: ['ขับรถ','ขับไป','ขับเอง'] },
    { id: 'ridebike',  label: 'ขี่มอเตอร์ไซค์',      cat: 'transit', risk: 'high', tags: ['road','extreme'], words: ['มอเตอร์ไซค์','มอไซค์','ขี่รถ','บิ๊กไบค์'] },
    { id: 'flight',    label: 'เดินทางด้วยเครื่องบิน', cat: 'transit', risk: 'low', tags: ['baggage'],       words: ['เครื่องบิน','บินไป','ขึ้นเครื่อง'] },
    { id: 'bus',       label: 'นั่งรถทัวร์ / รถไฟ',   cat: 'transit', risk: 'mid',  tags: ['road'],           words: ['รถทัวร์','รถไฟ','รถตู้','รถบัส'] },
    { id: 'rentcar',   label: 'เช่ารถขับเอง',        cat: 'transit', risk: 'mid',  tags: ['road'],           words: ['เช่ารถ','รถเช่า'] },

    // ── เมืองและทั่วไป ──
    { id: 'shopping',  label: 'ช้อปปิ้ง / เที่ยวห้าง', cat: 'city', risk: 'low',  tags: ['baggage'],         words: ['ช้อปปิ้ง','ห้าง','ซื้อของ'] },
    { id: 'cafe',      label: 'คาเฟ่ / ร้านอาหาร',   cat: 'city', risk: 'low',  tags: [],                   words: ['คาเฟ่','ร้านอาหาร','กินข้าว'] },
    { id: 'temple',    label: 'ไหว้พระ / เที่ยววัด',  cat: 'city', risk: 'low',  tags: [],                   words: ['ไหว้พระ','วัด','ทำบุญ'] },
    { id: 'museum',    label: 'พิพิธภัณฑ์ / แหล่งเรียนรู้', cat: 'city', risk: 'low', tags: [],              words: ['พิพิธภัณฑ์','นิทรรศการ'] },
    { id: 'themepark', label: 'สวนสนุก / สวนน้ำ',    cat: 'city', risk: 'mid',  tags: ['water'],            words: ['สวนสนุก','สวนน้ำ','เครื่องเล่น'] },
    { id: 'concert',   label: 'คอนเสิร์ต / เทศกาล',  cat: 'city', risk: 'mid',  tags: ['night'],            words: ['คอนเสิร์ต','เทศกาล','งานวัด','เคาท์ดาวน์'] },
    { id: 'nightlife', label: 'เที่ยวกลางคืน / สถานบันเทิง', cat: 'city', risk: 'high', tags: ['night'],     words: ['กลางคืน','ผับ','บาร์','สถานบันเทิง'] },
    { id: 'photo',     label: 'ถ่ายรูป / พกอุปกรณ์มีค่า', cat: 'city', risk: 'low', tags: ['baggage'],       words: ['ถ่ายรูป','กล้อง','โดรน'] },

    // ── กีฬาและผาดโผน ──
    { id: 'marathon',  label: 'วิ่งมาราธอน / งานวิ่ง', cat: 'sport', risk: 'mid',  tags: ['extreme'],        words: ['วิ่ง','มาราธอน','ฟันรัน'] },
    { id: 'cycling',   label: 'ปั่นจักรยานทางไกล',   cat: 'sport', risk: 'high', tags: ['road','extreme'],  words: ['ปั่นจักรยาน','จักรยาน'] },
    { id: 'ski',       label: 'สกี / สโนว์บอร์ด',     cat: 'sport', risk: 'high', tags: ['extreme'],         words: ['สกี','สโนว์บอร์ด','เล่นหิมะ'] },
    { id: 'paraglide', label: 'พาราไกลดิ้ง / ร่มร่อน', cat: 'sport', risk: 'high', tags: ['height','extreme'], words: ['พาราไกลดิ้ง','ร่มร่อน','กระโดดร่ม'] },
    { id: 'bungee',    label: 'บันจี้จัมพ์',          cat: 'sport', risk: 'high', tags: ['height','extreme'], words: ['บันจี้'] },
    { id: 'atv',       label: 'ATV / รถวิบาก',       cat: 'sport', risk: 'high', tags: ['road','extreme'],  words: ['เอทีวี','atv','รถวิบาก','บักกี้'] },
    { id: 'golf',      label: 'กอล์ฟ',              cat: 'sport', risk: 'low',  tags: [],                   words: ['กอล์ฟ','ตีกอล์ฟ'] },

    // ── ทำงาน ──
    { id: 'meeting',   label: 'ประชุม / สัมมนา',     cat: 'work', risk: 'low',  tags: [],                   words: ['ประชุม','สัมมนา','อบรม','ทำงาน'] },
    { id: 'expo',      label: 'ออกบูธ / งานแสดงสินค้า', cat: 'work', risk: 'low', tags: ['baggage'],        words: ['ออกบูธ','งานแสดงสินค้า','จัดบูธ'] },
    { id: 'fieldwork', label: 'ลงพื้นที่ / ตรวจงาน',  cat: 'work', risk: 'mid',  tags: ['road'],            words: ['ลงพื้นที่','ตรวจงาน','ดูงาน','ไซต์งาน'] },

    // ── อาหารและสุขภาพ ──
    { id: 'seafood',   label: 'กินอาหารทะเล',       cat: 'health', risk: 'mid',  tags: ['medical'],         words: ['อาหารทะเล','ซีฟู้ด'] },
    { id: 'street',    label: 'กินสตรีทฟู้ด / อาหารพื้นเมือง', cat: 'health', risk: 'mid', tags: ['medical'], words: ['สตรีทฟู้ด','อาหารพื้นเมือง','อาหารท้องถิ่น'] },
    { id: 'alcohol',   label: 'ดื่มแอลกอฮอล์',       cat: 'health', risk: 'high', tags: ['medical','night'], words: ['ดื่ม','เหล้า','เบียร์','สังสรรค์','ปาร์ตี้'] },
    { id: 'spa',       label: 'สปา / นวดแผนไทย',     cat: 'health', risk: 'low',  tags: [],                  words: ['สปา','นวด'] },
    { id: 'hotspring', label: 'ออนเซ็น / บ่อน้ำพุร้อน', cat: 'health', risk: 'mid', tags: ['water'],         words: ['ออนเซ็น','น้ำพุร้อน','แช่น้ำ'] },

    // ── กลุ่มเปราะบาง ──
    { id: 'kids',      label: 'เดินทางกับเด็กเล็ก',   cat: 'family', risk: 'mid',  tags: ['vulnerable','medical'], words: ['เด็กเล็ก','ลูกเล็ก','ทารก','พาลูก'] },
    { id: 'elderly',   label: 'เดินทางกับผู้สูงอายุ',  cat: 'family', risk: 'high', tags: ['vulnerable','medical'], words: ['ผู้สูงอายุ','คนแก่','พ่อแม่','ยาย','ปู่','ย่า','ตา'] },
    { id: 'pregnant',  label: 'เดินทางขณะตั้งครรภ์',  cat: 'family', risk: 'high', tags: ['vulnerable','medical'], words: ['ตั้งครรภ์','ท้อง'] }
  ];

  const ACT_BY_ID = {};
  ACTIVITIES.forEach(a => { ACT_BY_ID[a.id] = a; });

  /* กิจกรรมที่เสนอตาม "ประเภทปลายทาง" — ใช้เติมให้ครบขั้นต่ำ 10 รายการเสมอ */
  const BY_PLACE = {
    sea:       ['swim','snorkel','boat','beach','seafood','jetski','kayak','scuba','fishing','surf'],
    mountain:  ['hike','viewpoint','camp','waterfall','stargaze','climb','raft','elephant','street','zipline'],
    upcountry: ['temple','street','viewpoint','cafe','longdrive','waterfall','museum','camp','photo','shopping'],
    city:      ['shopping','cafe','temple','museum','photo','concert','nightlife','themepark','street','spa'],
    abroad:    ['flight','shopping','cafe','museum','photo','street','temple','concert','longdrive','spa']
  };
  const GENERAL = ['cafe','photo','shopping','street','viewpoint','temple','museum','spa','beach','longdrive'];

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

    /* — การเดินทาง — */
    const transport = TRANSPORT.find(m => m.words.some(w => t.indexOf(w) !== -1)) || null;

    /* — กิจกรรม (เลือกได้หลายอย่าง) —
       ขั้นที่ 1: จับจากคำที่ผู้ใช้พูดตรง ๆ → เลือกให้เลย
       ขั้นที่ 2: เติมจากบริบทปลายทางและวิธีเดินทาง → เสนอให้ผู้ใช้ติ๊กเอง */
    const picked = [];   // เลือกให้อัตโนมัติ เพราะผู้ใช้พูดถึงตรง ๆ
    ACTIVITIES.forEach(a => {
      if (a.words.some(w => t.toLowerCase().indexOf(w.toLowerCase()) !== -1)) picked.push(a.id);
    });

    // วิธีเดินทางถือเป็นกิจกรรมด้วย เพราะเป็นความเสี่ยงจริงระหว่างทริป
    const T2A = { moto: 'ridebike', car: 'longdrive', plane: 'flight', public: 'bus' };
    if (transport && T2A[transport] && picked.indexOf(T2A[transport]) === -1) picked.push(T2A[transport]);

    const suggested = suggestActivities({ place: place, abroad: place ? place.abroad : false, days: days || 1 }, picked);

    /* ถ้าผู้ใช้ไม่ได้พูดถึงกิจกรรมเลย ระบบจะเลือกกิจกรรมที่แทบจะเกิดขึ้นแน่นอน
       ของปลายทางแบบนั้นให้เบื้องต้น (เฉพาะความเสี่ยงต่ำถึงกลาง ไม่เดากิจกรรมเสี่ยงสูงให้ใคร)
       และทำเครื่องหมายไว้ว่า "ระบบเดาให้" เพื่อให้ผู้ใช้ตรวจและปรับได้ */
    const guessed = [];
    if (picked.length < 3) {
      suggested.forEach(id => {
        const a = ACT_BY_ID[id];
        if (picked.length >= 3) return;
        if (!a || a.risk === 'high') return;
        if (picked.indexOf(id) !== -1) return;
        picked.push(id);
        guessed.push(id);
      });
    }

    if (peopleFrom) found.push({ field: 'จำนวนคน', text: peopleFrom });
    if (daysFrom)   found.push({ field: 'ระยะเวลา', text: daysFrom });
    if (place)      found.push({ field: 'ปลายทาง',  text: 'รู้จัก "' + place.k + '" — ' + place.note });
    if (transport)  found.push({ field: 'การเดินทาง', text: 'พบว่าเดินทางด้วย' + transport.label });
    const said = picked.filter(id => guessed.indexOf(id) === -1);
    if (said.length) {
      found.push({ field: 'กิจกรรม', text: 'จับได้จากที่คุณเล่าโดยตรง: ' + said.map(id => ACT_BY_ID[id].label).join(', ') });
    }
    if (guessed.length) {
      found.push({ field: 'กิจกรรม (ระบบเสนอ)', text: 'คุณไม่ได้ระบุกิจกรรม ระบบจึงเลือกที่พบบ่อยของปลายทางแบบนี้ให้เบื้องต้น: ' +
        guessed.map(id => ACT_BY_ID[id].label).join(', ') + ' — กดยกเลิกได้ถ้าไม่ตรง' });
    }

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
      activities: picked,      // กิจกรรมที่ถูกเลือกไว้แล้ว
      guessed: guessed,        // ในนั้น อันไหนที่ระบบเดาให้ ไม่ได้มาจากคำพูดผู้ใช้
      suggested: suggested,    // กิจกรรมที่เสนอให้ติ๊กเพิ่ม (อย่างน้อย 10 รายการรวมที่เลือกแล้ว)
      custom: [],              // กิจกรรมที่ผู้ใช้พิมพ์เพิ่มเอง
      found: found,
      missing: missing
    };
  }

  /* เสนอกิจกรรมที่เป็นไปได้จากบริบททริป — รับประกันว่าได้อย่างน้อย 10 รายการเสมอ */
  function suggestActivities(ctx, already) {
    const out = (already || []).slice();
    const push = id => { if (ACT_BY_ID[id] && out.indexOf(id) === -1) out.push(id); };

    const kind = ctx.abroad ? 'abroad' : (ctx.place ? ctx.place.kind : null);
    (BY_PLACE[kind] || []).forEach(push);

    if (ctx.abroad) { push('flight'); push('street'); }
    if (ctx.days >= 4) push('spa');

    // เติมจากกิจกรรมทั่วไปจนครบขั้นต่ำ 10 รายการ
    GENERAL.forEach(id => { if (out.length < 10) push(id); });
    // ถ้ายังไม่ครบจริง ๆ (กรณีหายาก) เติมจากคลังทั้งหมด
    ACTIVITIES.forEach(a => { if (out.length < 10) push(a.id); });

    return out;
  }

  /* จัดกลุ่มกิจกรรมทั้งหมดไว้ให้ UI แสดงเป็นหมวด */
  const ACT_CATS = [
    { key: 'sea',     label: '🌊 ทางน้ำและทะเล' },
    { key: 'nature',  label: '⛰️ ภูเขาและธรรมชาติ' },
    { key: 'transit', label: '🚗 การเดินทาง' },
    { key: 'city',    label: '🏙️ เมืองและทั่วไป' },
    { key: 'sport',   label: '🏃 กีฬาและผาดโผน' },
    { key: 'work',    label: '💼 ทำงาน' },
    { key: 'health',  label: '🍽️ อาหารและสุขภาพ' },
    { key: 'family',  label: '👨‍👩‍👧 กลุ่มที่ต้องดูแลพิเศษ' }
  ];

  /* วิเคราะห์กิจกรรมที่เลือก → สรุปเป็นแท็กความเสี่ยง */
  function activityProfile(ids, custom) {
    const list = (ids || []).map(id => ACT_BY_ID[id]).filter(Boolean);
    const tags = {};
    let high = 0, mid = 0;

    list.forEach(a => {
      a.tags.forEach(t => { tags[t] = true; });
      if (a.risk === 'high') high++;
      else if (a.risk === 'mid') mid++;
    });

    // กิจกรรมที่ผู้ใช้พิมพ์เอง — สแกนหาคำเสี่ยงเพื่อจัดระดับอย่างระมัดระวัง
    (custom || []).forEach(txt => {
      const s = String(txt);
      if (/ดำน้ำ|ปีน|กระโดด|แข่ง|วิบาก|สกี|โต้คลื่น|ล่องแก่ง|ผาดโผน|เสี่ยง/.test(s)) { high++; tags.extreme = true; }
      else mid++;
    });

    return {
      list: list,
      tags: tags,
      highCount: high,
      midCount: mid,
      isAdventure: high > 0 || !!tags.extreme
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
    const P = trip.place;
    const prof = activityProfile(trip.activities, trip.custom);
    const tag = t => !!prof.tags[t];

    // ── ความเสี่ยงจากกิจกรรมที่เลือก ──
    if (tag('road'))    out.push({ icon: '🛣️', title: 'อุบัติเหตุจากยานพาหนะ', why: 'ทริปนี้มีการเดินทางบนถนน ซึ่งเป็นสาเหตุการบาดเจ็บอันดับต้นของการท่องเที่ยว' });
    if (tag('water'))   out.push({ icon: '🌊', title: 'อุบัติเหตุทางน้ำ', why: 'กิจกรรมทางน้ำที่คุณเลือกมีความเสี่ยงจมน้ำหรือบาดเจ็บ ซึ่งบางกรมธรรม์มีเงื่อนไขเฉพาะ' });
    if (tag('height'))  out.push({ icon: '🧗', title: 'กิจกรรมบนที่สูง', why: 'กิจกรรมบนที่สูงมักถูกระบุเป็นข้อยกเว้น ต้องเลือกแผนที่ขยายความคุ้มครองส่วนนี้' });
    if (tag('medical')) out.push({ icon: '🤒', title: 'เจ็บป่วยระหว่างเดินทาง', why: 'อาหารและสภาพแวดล้อมที่ไม่คุ้นเคยเพิ่มโอกาสเจ็บป่วย ซึ่ง PA ทั่วไปไม่คุ้มครอง' });
    if (tag('baggage')) out.push({ icon: '🧳', title: 'สัมภาระและทรัพย์สิน', why: 'มีโอกาสสัมภาระสูญหาย เสียหาย หรือมาถึงล่าช้า' });
    if (tag('night'))   out.push({ icon: '🌙', title: 'กิจกรรมช่วงกลางคืน', why: 'ทัศนวิสัยต่ำและแอลกอฮอล์เพิ่มความเสี่ยงอุบัติเหตุ และหลายกรมธรรม์ยกเว้นกรณีมึนเมา' });
    if (tag('vulnerable')) out.push({ icon: '👶', title: 'มีผู้ที่ต้องดูแลพิเศษร่วมเดินทาง', why: 'เด็กเล็ก ผู้สูงอายุ หรือผู้ตั้งครรภ์ มีเงื่อนไขการรับประกันและความคุ้มครองต่างจากผู้ใหญ่ทั่วไป' });

    if (prof.highCount >= 2) {
      out.push({ icon: '⚠️', title: 'มีกิจกรรมเสี่ยงสูง ' + prof.highCount + ' อย่าง',
        why: 'ยิ่งมีกิจกรรมเสี่ยงสูงหลายอย่างในทริปเดียว ยิ่งต้องตรวจข้อยกเว้นให้ละเอียดก่อนเลือกแผน' });
    }

    // ── ความเสี่ยงจากปลายทางและขนาดทริป ──
    if (P && P.kind === 'mountain')  out.push({ icon: '⛰️', title: 'เส้นทางภูเขา', why: P.note });
    if (P && P.kind === 'upcountry') out.push({ icon: '🚙', title: 'เดินทางระยะไกล', why: 'ระยะทางไกลทำให้เหนื่อยล้าสะสม ซึ่งเป็นสาเหตุอุบัติเหตุที่พบบ่อย' });
    if (trip.abroad)                 out.push({ icon: '🏥', title: 'ค่ารักษาพยาบาลในต่างประเทศ', why: 'ค่ารักษาในต่างประเทศสูงกว่าในไทยมาก และสิทธิรักษาพยาบาลของไทยไม่ครอบคลุม' });

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
    const prof = activityProfile(trip.activities, trip.custom);

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

      // ทริปต่างประเทศ ค่ารักษาพยาบาลคือความเสี่ยงที่ใหญ่ที่สุด
      // จึงให้น้ำหนักมากพอที่แผนคุ้มครองค่ารักษาจะมาก่อนแผนเสริมอย่างสัมภาระเสมอ
      if (p.fit.abroad === true) { score += 90; reasons.push('ปลายทางอยู่ต่างประเทศ แผนนี้เน้นค่ารักษาพยาบาลนอกประเทศ ซึ่งสิทธิรักษาพยาบาลไทยไม่ครอบคลุม'); }
      if (p.fit.minPeople)       { score += 30; reasons.push('เดินทาง ' + trip.people + ' คน ตรงกับแผนสำหรับกลุ่มตั้งแต่ ' + p.fit.minPeople + ' คน'); }

      // กิจกรรมที่เลือกไว้เป็นตัวชี้ขาดหลักในการจับคู่
      if (p.fit.activity && prof.isAdventure) {
        const risky = prof.list.filter(a => a.risk === 'high').map(a => a.label);
        score += 45;
        reasons.push('ทริปมีกิจกรรมเสี่ยงสูง' + (risky.length ? ' (' + risky.slice(0, 2).join(', ') + ')' : '') + ' แผนนี้ขยายความคุ้มครองส่วนนี้ให้');
      }
      if (p.fit.transport && trip.transport && p.fit.transport.indexOf(trip.transport) !== -1) {
        score += 25;
        const label = (TRANSPORT.find(x => x.key === trip.transport) || {}).label || '';
        reasons.push('เหมาะกับการเดินทางด้วย' + label);
      }
      if (!Object.keys(p.fit).length) { score += 10; reasons.push('เป็นแผนพื้นฐานที่ใช้ได้กับทริปทั่วไป'); }

      // มีกิจกรรมเสี่ยงเจ็บป่วย → ดันแผนสุขภาพขึ้น เพราะ PA ไม่คุ้มครองการเจ็บป่วย
      if (p.type === 'สุขภาพ' && prof.tags.medical) {
        score += 35; reasons.push('ทริปมีความเสี่ยงเจ็บป่วย (เช่น อาหารหรือสภาพแวดล้อมที่ไม่คุ้นเคย) ซึ่งประกันอุบัติเหตุทั่วไปไม่คุ้มครอง');
      }
      if (p.type === 'สัมภาระ' && prof.tags.baggage) {
        score += 30; reasons.push('ทริปมีสัมภาระหรือทรัพย์สินที่ต้องดูแล');
      }
      if (trip.days >= 3 && p.type === 'สุขภาพ') { score += 10; reasons.push('ทริปยาว ' + trip.days + ' วัน ความเสี่ยงเจ็บป่วยระหว่างทางสูงขึ้น'); }

      score += Math.max(0, 12 - p.rate / 8);

      // แผนที่ยกเว้นกิจกรรมหลักของผู้ใช้ ต้องไม่ถูกจัดอันดับต้น ๆ
      // มิฉะนั้นระบบจะแนะนำสิ่งที่ไม่คุ้มครองสิ่งที่ผู้ใช้ตั้งใจจะไปทำจริง ๆ
      const risky = prof.list.filter(a => a.risk === 'high').map(a => a.label);
      const warn = (prof.isAdventure && p.excludes.some(e => e.indexOf('ผาดโผน') !== -1))
        ? 'ทริปนี้มีกิจกรรมเสี่ยงสูง' + (risky.length ? ' (' + risky.slice(0, 2).join(', ') + ')' : '') +
          ' แต่แผนนี้ระบุยกเว้นกิจกรรมผาดโผนไว้ ควรตรวจเงื่อนไขก่อน'
        : null;
      if (warn) score -= 50;

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
    suggestActivities: suggestActivities, activityProfile: activityProfile,
    TRANSPORT: TRANSPORT, PLACES: PLACES, PARTNERS: PARTNERS,
    ACTIVITIES: ACTIVITIES, ACT_BY_ID: ACT_BY_ID, ACT_CATS: ACT_CATS
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
