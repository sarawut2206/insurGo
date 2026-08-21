/* activities.js — คลังกิจกรรมในทริป
 *
 * แต่ละกิจกรรมมีระดับความเสี่ยงและแท็ก ซึ่งส่งต่อไปยังตัวจับคู่ความคุ้มครอง
 *
 * แท็ก: water=ทางน้ำ · road=ยานพาหนะ · height=ที่สูง · medical=เจ็บป่วย
 *       baggage=สัมภาระ · vulnerable=กลุ่มเปราะบาง · night=กลางคืน · extreme=ผาดโผน
 */

export const ACTIVITIES = [
  // ── ทางน้ำและทะเล ──
  { id: 'swim',      label: 'ว่ายน้ำทะเล',            cat: 'sea', risk: 'mid',  tags: ['water'],            words: ['ว่ายน้ำ', 'เล่นน้ำ', 'ลงทะเล'] },
  { id: 'snorkel',   label: 'ดำน้ำตื้น',              cat: 'sea', risk: 'mid',  tags: ['water'],            words: ['ดำน้ำตื้น', 'สน็อกเกิล'] },
  { id: 'scuba',     label: 'ดำน้ำลึก',               cat: 'sea', risk: 'high', tags: ['water', 'extreme'], words: ['ดำน้ำลึก', 'สกูบา', 'ดำน้ำ'] },
  { id: 'jetski',    label: 'เจ็ตสกี / บานาน่าโบ๊ท',   cat: 'sea', risk: 'high', tags: ['water', 'extreme'], words: ['เจ็ตสกี', 'บานาน่าโบ๊ท'] },
  { id: 'kayak',     label: 'พายเรือคายัค / SUP',      cat: 'sea', risk: 'mid',  tags: ['water'],            words: ['คายัค', 'พายเรือ', 'ซับบอร์ด'] },
  { id: 'surf',      label: 'เซิร์ฟ / ไคท์เซิร์ฟ',      cat: 'sea', risk: 'high', tags: ['water', 'extreme'], words: ['เซิร์ฟ', 'โต้คลื่น', 'ไคท์'] },
  { id: 'boat',      label: 'ล่องเรือ / ทัวร์เกาะ',     cat: 'sea', risk: 'mid',  tags: ['water'],            words: ['ล่องเรือ', 'ทัวร์เกาะ', 'นั่งเรือ', 'ไปเกาะ'] },
  { id: 'fishing',   label: 'ตกปลา',                  cat: 'sea', risk: 'low',  tags: ['water'],            words: ['ตกปลา', 'ตกหมึก'] },
  { id: 'beach',     label: 'เดินเล่นชายหาด',          cat: 'sea', risk: 'low',  tags: [],                   words: ['ชายหาด', 'เดินหาด', 'อาบแดด'] },

  // ── ภูเขาและธรรมชาติ ──
  { id: 'hike',      label: 'เดินป่า / เดินเทรล',      cat: 'nature', risk: 'mid',  tags: ['extreme'],           words: ['เดินป่า', 'เทรล', 'เดินเขา'] },
  { id: 'climb',     label: 'ปีนเขา / ปีนผา',          cat: 'nature', risk: 'high', tags: ['height', 'extreme'], words: ['ปีนเขา', 'ปีนผา', 'ปีนหน้าผา'] },
  { id: 'camp',      label: 'ตั้งแคมป์ / กางเต็นท์',    cat: 'nature', risk: 'mid',  tags: [],                    words: ['แคมป์', 'กางเต็นท์', 'นอนเต็นท์'] },
  { id: 'raft',      label: 'ล่องแก่ง',                cat: 'nature', risk: 'high', tags: ['water', 'extreme'],  words: ['ล่องแก่ง', 'แพยาง'] },
  { id: 'waterfall', label: 'เที่ยวน้ำตก',             cat: 'nature', risk: 'mid',  tags: ['water'],             words: ['น้ำตก'] },
  { id: 'viewpoint', label: 'ชมวิว / จุดชมวิว',        cat: 'nature', risk: 'low',  tags: [],                    words: ['ชมวิว', 'จุดชมวิว', 'ทะเลหมอก'] },
  { id: 'zipline',   label: 'ซิปไลน์ / โรยตัว',        cat: 'nature', risk: 'high', tags: ['height', 'extreme'], words: ['ซิปไลน์', 'โรยตัว'] },
  { id: 'stargaze',  label: 'ดูดาว',                  cat: 'nature', risk: 'low',  tags: ['night'],             words: ['ดูดาว'] },
  { id: 'animal',    label: 'ปางช้าง / สวนสัตว์',      cat: 'nature', risk: 'mid',  tags: [],                    words: ['ขี่ช้าง', 'ปางช้าง', 'ให้อาหารสัตว์', 'สวนสัตว์'] },

  // ── การเดินทาง ──
  { id: 'longdrive', label: 'ขับรถทางไกล',            cat: 'transit', risk: 'mid',  tags: ['road'],            words: ['ขับรถ', 'ขับไป', 'ขับเอง'] },
  { id: 'ridebike',  label: 'ขี่มอเตอร์ไซค์',          cat: 'transit', risk: 'high', tags: ['road', 'extreme'], words: ['มอเตอร์ไซค์', 'มอไซค์', 'ขี่รถ', 'บิ๊กไบค์'] },
  { id: 'flight',    label: 'เดินทางด้วยเครื่องบิน',    cat: 'transit', risk: 'low',  tags: ['baggage'],         words: ['เครื่องบิน', 'บินไป', 'ขึ้นเครื่อง'] },
  { id: 'bus',       label: 'นั่งรถทัวร์ / รถไฟ',       cat: 'transit', risk: 'mid',  tags: ['road'],            words: ['รถทัวร์', 'รถไฟ', 'รถตู้', 'รถบัส'] },
  { id: 'rentcar',   label: 'เช่ารถขับเอง',            cat: 'transit', risk: 'mid',  tags: ['road'],            words: ['เช่ารถ', 'รถเช่า'] },

  // ── เมืองและทั่วไป ──
  { id: 'shopping',  label: 'ช้อปปิ้ง / เที่ยวห้าง',    cat: 'city', risk: 'low',  tags: ['baggage'], words: ['ช้อปปิ้ง', 'ห้าง', 'ซื้อของ'] },
  { id: 'cafe',      label: 'คาเฟ่ / ร้านอาหาร',       cat: 'city', risk: 'low',  tags: [],          words: ['คาเฟ่', 'ร้านอาหาร', 'กินข้าว'] },
  { id: 'temple',    label: 'ไหว้พระ / เที่ยววัด',      cat: 'city', risk: 'low',  tags: [],          words: ['ไหว้พระ', 'วัด', 'ทำบุญ'] },
  { id: 'museum',    label: 'พิพิธภัณฑ์ / แหล่งเรียนรู้', cat: 'city', risk: 'low', tags: [],          words: ['พิพิธภัณฑ์', 'นิทรรศการ'] },
  { id: 'themepark', label: 'สวนสนุก / สวนน้ำ',        cat: 'city', risk: 'mid',  tags: ['water'],   words: ['สวนสนุก', 'สวนน้ำ', 'เครื่องเล่น'] },
  { id: 'concert',   label: 'คอนเสิร์ต / เทศกาล',      cat: 'city', risk: 'mid',  tags: ['night'],   words: ['คอนเสิร์ต', 'เทศกาล', 'งานวัด', 'เคาท์ดาวน์'] },
  { id: 'nightlife', label: 'เที่ยวกลางคืน',           cat: 'city', risk: 'high', tags: ['night'],   words: ['กลางคืน', 'ผับ', 'บาร์', 'สถานบันเทิง'] },
  { id: 'photo',     label: 'ถ่ายรูป / พกอุปกรณ์มีค่า',  cat: 'city', risk: 'low',  tags: ['baggage'], words: ['ถ่ายรูป', 'กล้อง', 'โดรน'] },

  // ── กีฬาและผาดโผน ──
  { id: 'marathon',  label: 'วิ่งมาราธอน / งานวิ่ง',    cat: 'sport', risk: 'mid',  tags: ['extreme'],           words: ['วิ่ง', 'มาราธอน', 'ฟันรัน'] },
  { id: 'cycling',   label: 'ปั่นจักรยานทางไกล',       cat: 'sport', risk: 'high', tags: ['road', 'extreme'],   words: ['ปั่นจักรยาน', 'จักรยาน'] },
  { id: 'ski',       label: 'สกี / สโนว์บอร์ด',         cat: 'sport', risk: 'high', tags: ['extreme'],           words: ['สกี', 'สโนว์บอร์ด', 'เล่นหิมะ'] },
  { id: 'paraglide', label: 'พาราไกลดิ้ง / ร่มร่อน',    cat: 'sport', risk: 'high', tags: ['height', 'extreme'], words: ['พาราไกลดิ้ง', 'ร่มร่อน', 'กระโดดร่ม'] },
  { id: 'bungee',    label: 'บันจี้จัมพ์',              cat: 'sport', risk: 'high', tags: ['height', 'extreme'], words: ['บันจี้'] },
  { id: 'atv',       label: 'ATV / รถวิบาก',           cat: 'sport', risk: 'high', tags: ['road', 'extreme'],   words: ['เอทีวี', 'ATV', 'รถวิบาก', 'บักกี้'] },
  { id: 'golf',      label: 'กอล์ฟ',                  cat: 'sport', risk: 'low',  tags: [],                    words: ['กอล์ฟ', 'ตีกอล์ฟ'] },

  // ── ทำงาน ──
  { id: 'meeting',   label: 'ประชุม / สัมมนา',         cat: 'work', risk: 'low', tags: [],          words: ['ประชุม', 'สัมมนา', 'อบรม', 'ทำงาน'] },
  { id: 'expo',      label: 'ออกบูธ / งานแสดงสินค้า',   cat: 'work', risk: 'low', tags: ['baggage'], words: ['ออกบูธ', 'งานแสดงสินค้า', 'จัดบูธ'] },
  { id: 'fieldwork', label: 'ลงพื้นที่ / ตรวจงาน',      cat: 'work', risk: 'mid', tags: ['road'],    words: ['ลงพื้นที่', 'ตรวจงาน', 'ดูงาน', 'ไซต์งาน'] },

  // ── อาหารและสุขภาพ ──
  { id: 'seafood',   label: 'กินอาหารทะเล',           cat: 'health', risk: 'mid',  tags: ['medical'],          words: ['อาหารทะเล', 'ซีฟู้ด'] },
  { id: 'street',    label: 'กินสตรีทฟู้ด',            cat: 'health', risk: 'mid',  tags: ['medical'],          words: ['สตรีทฟู้ด', 'อาหารพื้นเมือง', 'อาหารท้องถิ่น'] },
  { id: 'alcohol',   label: 'ดื่มแอลกอฮอล์',           cat: 'health', risk: 'high', tags: ['medical', 'night'], words: ['ดื่ม', 'เหล้า', 'เบียร์', 'สังสรรค์', 'ปาร์ตี้'] },
  { id: 'spa',       label: 'สปา / นวดแผนไทย',         cat: 'health', risk: 'low',  tags: [],                   words: ['สปา', 'นวด'] },
  { id: 'hotspring', label: 'ออนเซ็น / บ่อน้ำพุร้อน',   cat: 'health', risk: 'mid',  tags: ['water'],            words: ['ออนเซ็น', 'น้ำพุร้อน', 'แช่น้ำ'] },

  // ── กลุ่มที่ต้องดูแลพิเศษ ──
  { id: 'kids',      label: 'เดินทางกับเด็กเล็ก',       cat: 'family', risk: 'mid',  tags: ['vulnerable', 'medical'], words: ['เด็กเล็ก', 'ลูกเล็ก', 'ทารก'] },
  { id: 'elderly',   label: 'เดินทางกับผู้สูงอายุ',      cat: 'family', risk: 'high', tags: ['vulnerable', 'medical'], words: ['ผู้สูงอายุ', 'คนแก่', 'พ่อแม่', 'ยาย', 'ปู่', 'ย่า'] },
  { id: 'pregnant',  label: 'เดินทางขณะตั้งครรภ์',      cat: 'family', risk: 'high', tags: ['vulnerable', 'medical'], words: ['ตั้งครรภ์'] }
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));

export const ACTIVITY_CATS = [
  { key: 'sea',     label: 'ทางน้ำและทะเล',       icon: '🌊' },
  { key: 'nature',  label: 'ภูเขาและธรรมชาติ',    icon: '⛰️' },
  { key: 'transit', label: 'การเดินทาง',          icon: '🚗' },
  { key: 'city',    label: 'เมืองและทั่วไป',      icon: '🏙️' },
  { key: 'sport',   label: 'กีฬาและผาดโผน',       icon: '🏃' },
  { key: 'work',    label: 'ทำงาน',              icon: '💼' },
  { key: 'health',  label: 'อาหารและสุขภาพ',      icon: '🍽️' },
  { key: 'family',  label: 'กลุ่มที่ต้องดูแลพิเศษ', icon: '👨‍👩‍👧' }
];

/* กิจกรรมที่มักเกิดขึ้นตามประเภทปลายทาง — ใช้เสนอให้ผู้ใช้เลือก */
export const BY_PLACE_KIND = {
  sea:       ['swim', 'snorkel', 'boat', 'beach', 'seafood', 'jetski', 'kayak', 'scuba', 'fishing', 'surf'],
  mountain:  ['hike', 'viewpoint', 'camp', 'waterfall', 'stargaze', 'climb', 'raft', 'animal', 'street', 'zipline'],
  upcountry: ['temple', 'street', 'viewpoint', 'cafe', 'longdrive', 'waterfall', 'museum', 'camp', 'photo', 'shopping'],
  city:      ['shopping', 'cafe', 'temple', 'museum', 'photo', 'concert', 'nightlife', 'themepark', 'street', 'spa'],
  abroad:    ['flight', 'shopping', 'cafe', 'museum', 'photo', 'street', 'temple', 'concert', 'longdrive', 'spa']
};

export const GENERAL_ACTIVITIES = ['cafe', 'photo', 'shopping', 'street', 'viewpoint', 'temple', 'museum', 'spa', 'beach', 'longdrive'];

export const TRANSPORT = [
  { key: 'moto',   label: 'รถจักรยานยนต์', activity: 'ridebike',  words: ['มอเตอร์ไซค์', 'มอไซค์', 'จักรยานยนต์', 'บิ๊กไบค์', 'สกู๊ตเตอร์', 'ขี่รถ'] },
  { key: 'car',    label: 'รถยนต์',        activity: 'longdrive', words: ['รถยนต์', 'ขับรถ', 'รถเก๋ง', 'รถกระบะ', 'ขับไป', 'รถส่วนตัว'] },
  { key: 'plane',  label: 'เครื่องบิน',     activity: 'flight',    words: ['เครื่องบิน', 'บินไป', 'สายการบิน', 'ขึ้นเครื่อง'] },
  { key: 'public', label: 'ขนส่งสาธารณะ',   activity: 'bus',       words: ['รถทัวร์', 'รถไฟ', 'รถตู้', 'รถเมล์', 'แท็กซี่', 'รถบัส'] }
];

export const TRANSPORT_BY_KEY = Object.fromEntries(TRANSPORT.map(t => [t.key, t]));
