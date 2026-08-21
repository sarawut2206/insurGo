/* build.js — เตรียมไฟล์เว็บสำหรับ Capacitor
 *
 * ทำไมต้องมีขั้นตอนนี้:
 *   GitHub Pages เสิร์ฟไฟล์จาก root ของ repo
 *   ส่วน Capacitor ต้องการโฟลเดอร์ webDir แยกต่างหาก (www) เพื่อคัดลอกเข้าโปรเจกต์เนทีฟ
 *   สคริปต์นี้จึงคัดลอกไฟล์เว็บไปไว้ใน www ให้ โดยไม่กระทบ Pages
 *
 * ไม่มี bundler ไม่มี transpile — โค้ดเป็น ES module มาตรฐานที่เบราว์เซอร์รันได้ตรง ๆ
 */

import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(project, 'www');

/* ที่มาของไฟล์เว็บต่างกันตามที่ใช้งาน:
     repo ที่ deploy ขึ้น GitHub Pages — ไฟล์อยู่ที่ root
     โปรเจกต์บนเครื่องระหว่างพัฒนา     — ไฟล์อยู่ในโฟลเดอร์ app/
   ตรวจให้อัตโนมัติ จะได้ใช้สคริปต์เดียวกันได้ทั้งสองแบบ */
const root = existsSync(join(project, 'index.html')) ? project : join(project, 'app');

const ITEMS = ['index.html', 'manifest.json', 'css', 'js', 'icons'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const item of ITEMS) {
  const from = join(root, item);
  if (!existsSync(from)) {
    console.error(`ไม่พบ ${item} — ตรวจว่ารันคำสั่งจากโฟลเดอร์โปรเจกต์`);
    process.exit(1);
  }
  await cp(from, join(out, item), { recursive: true });
}

/* service worker ใช้เฉพาะเวอร์ชันเว็บ
   ในแอปเนทีฟไฟล์อยู่ในเครื่องอยู่แล้ว การมี SW ซ้อนจะทำให้อัปเดตแอปแล้วยังเห็นของเก่า */
await writeFile(join(out, 'sw.js'), '/* ไม่ใช้ service worker ในแอปเนทีฟ */\n');

console.log('สร้าง www/ เรียบร้อย — พร้อมสำหรับ npx cap sync');
