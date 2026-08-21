/* native.js — สะพานเชื่อมกับความสามารถของเครื่อง
 * ─────────────────────────────────────────────────────────────────────
 * โค้ดชุดเดียวทำงานได้ทั้ง 3 แบบ:
 *   1. เว็บบนเบราว์เซอร์
 *   2. PWA ที่ติดตั้งลงหน้าจอโฮม
 *   3. แอปเนทีฟที่ build ด้วย Capacitor (APK / IPA)
 *
 * วิธีทำ: ถ้ามีปลั๊กอินของ Capacitor ให้ใช้ของเครื่องจริง
 *        ถ้าไม่มี ให้ถอยไปใช้ Web API ที่เทียบเท่า
 * ทุกอย่างหุ้ม try/catch เพราะฟีเจอร์ระดับเครื่องล้มเหลวได้เสมอ
 * และไม่ควรทำให้ทั้งแอปพัง
 * ───────────────────────────────────────────────────────────────────── */

const cap = () => globalThis.Capacitor;

/** กำลังรันเป็นแอปเนทีฟอยู่หรือไม่ */
export const isNative = () => {
  try { return !!cap()?.isNativePlatform?.(); } catch { return false; }
};

/** ชื่อแพลตฟอร์ม: 'android' | 'ios' | 'web' */
export const platform = () => {
  try { return cap()?.getPlatform?.() || 'web'; } catch { return 'web'; }
};

/** เปิดจากหน้าจอโฮมแบบเต็มจอ (PWA ที่ติดตั้งแล้ว) */
export const isStandalone = () =>
  isNative() ||
  globalThis.matchMedia?.('(display-mode: standalone)').matches ||
  globalThis.navigator?.standalone === true;

export const isIOS = () =>
  platform() === 'ios' ||
  (/iPad|iPhone|iPod/.test(navigator.userAgent) && !globalThis.MSStream);

const plugin = name => {
  try { return cap()?.Plugins?.[name] || null; } catch { return null; }
};

/* ─────────── การสั่นตอบสนอง ───────────
 * แอปที่ดีให้ feedback ทันทีที่นิ้วแตะ ไม่ใช่รอผลลัพธ์
 */
export function haptic(style = 'light') {
  try {
    const Haptics = plugin('Haptics');
    if (Haptics) {
      if (style === 'success' || style === 'warning' || style === 'error') {
        Haptics.notification({ type: style.toUpperCase() });
      } else {
        Haptics.impact({ style: style === 'heavy' ? 'HEAVY' : style === 'medium' ? 'MEDIUM' : 'LIGHT' });
      }
      return;
    }
    // เว็บ: ใช้ Vibration API ซึ่ง Android รองรับ ส่วน iOS Safari ไม่รองรับ
    const pattern = { light: 6, medium: 12, heavy: 20, success: [10, 40, 10], warning: [20, 60, 20], error: [30, 80, 30] };
    navigator.vibrate?.(pattern[style] ?? 8);
  } catch { /* ไม่รองรับก็ไม่เป็นไร */ }
}

/* ─────────── แถบสถานะของระบบ ─────────── */
export async function styleStatusBar(dark) {
  try {
    const StatusBar = plugin('StatusBar');
    if (!StatusBar) return;
    await StatusBar.setStyle({ style: dark ? 'DARK' : 'LIGHT' });
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: dark ? '#081327' : '#0B3D91' });
    }
  } catch { /* ข้าม */ }
}

/* ─────────── ปิดหน้าจอเปิดแอป ─────────── */
export async function hideSplash() {
  try { await plugin('SplashScreen')?.hide(); } catch { /* ข้าม */ }
}

/* ─────────── ปุ่มย้อนกลับของ Android ───────────
 * บนแอปเนทีฟ ปุ่มย้อนกลับของเครื่องต้องถอยหน้าในแอป
 * และเมื่ออยู่หน้าแรกแล้วกดอีกครั้ง จึงค่อยออกจากแอป
 */
export function onHardwareBack(handler) {
  try {
    plugin('App')?.addListener('backButton', ({ canGoBack }) => handler(canGoBack));
  } catch { /* ข้าม */ }
}

export async function exitApp() {
  try { await plugin('App')?.exitApp(); } catch { /* ข้าม */ }
}

/* ─────────── แชร์ ───────────
 * เนทีฟ → แผ่นแชร์ของระบบ · เว็บ → Web Share API · ไม่มีทั้งคู่ → คัดลอกลิงก์
 */
export async function share({ title, text, url }) {
  try {
    const Share = plugin('Share');
    if (Share) { await Share.share({ title, text, url, dialogTitle: title }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/* ─────────── เปิดลิงก์ภายนอก ───────────
 * ในแอปเนทีฟต้องเปิดด้วยเบราว์เซอร์ในระบบ ไม่ใช่ทับหน้าแอปตัวเอง
 */
export async function openExternal(url) {
  try {
    const Browser = plugin('Browser');
    if (Browser) { await Browser.open({ url }); return; }
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }
}

/* ─────────── สถานะเครือข่าย ─────────── */
export function onNetworkChange(handler) {
  const Network = plugin('Network');
  if (Network) {
    Network.addListener('networkStatusChange', s => handler(s.connected));
    Network.getStatus().then(s => handler(s.connected)).catch(() => handler(navigator.onLine));
    return;
  }
  const emit = () => handler(navigator.onLine);
  globalThis.addEventListener('online', emit);
  globalThis.addEventListener('offline', emit);
  emit();
}

/* ─────────── ติดตั้งเป็นแอป (เฉพาะบนเว็บ) ─────────── */
let installEvent = null;

export function watchInstallPrompt(onAvailable) {
  if (isNative()) return;                    // เป็นแอปอยู่แล้ว ไม่ต้องชวนติดตั้ง
  globalThis.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e;
    onAvailable('prompt');
  });
  // iOS Safari ไม่ยิง beforeinstallprompt จึงต้องบอกวิธีติดตั้งเอง
  if (isIOS() && !isStandalone()) onAvailable('ios');
}

export async function promptInstall() {
  if (!installEvent) return 'unavailable';
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  return outcome;
}
