import BANK_SIDES from './bank-sides.json';
import { floodwallAt, FLOODWALL_SOURCE } from './floodwall';
import type { Station } from './types';

/** เส้นระดับอ้างอิงที่แสดงคู่กับระดับน้ำ (หน่วย ม.รทก.) */
export interface RefLevel {
  key: 'bank' | 'bank2' | 'wall' | 'critical';
  v: number;
  label: string;
  color: string;
  dash?: string;
  /** ค่าประมาณ ไม่ใช่ค่าที่วัดที่สถานีนี้ */
  approx?: boolean;
  /** ทิศของตลิ่งฝั่งนี้ เช่น "ตะวันออก" (ถ้าทราบ) */
  side?: string;
  note: string;
}

type Sides = Record<string, { flow: number; left: string; right: string; match: string; way?: string; distM?: number }>;
const SIDES = BANK_SIDES as Sides;

/** ทิศของตลิ่งซ้าย/ขวา (หันหน้าตามทิศน้ำไหล) จากทิศการไหลของลำน้ำใน OpenStreetMap — ดู scripts/compute-bank-sides.mjs */
export function bankSides(code: string): { left: string; right: string } | null {
  const x = SIDES[code];
  // ใช้เฉพาะแม่น้ำที่ทิศการไหลชัดเจน (เช่น เจ้าพระยา ท่าจีน ป่าสัก)
  // คลองในกรุงเทพฯ ไหลได้สองทางตามน้ำขึ้นลง/การสูบน้ำ และทิศเส้นใน OSM ไม่แน่นอน ถ้าเดาผิดจะบอกฝั่งสลับกัน
  // จึงไม่แสดงทิศสำหรับคลอง (แสดงเฉพาะตลิ่งด้านที่ต่ำกว่าแทน)
  if (!x || !(x.way ?? '').startsWith('แม่น้ำ') || !(x.match === 'name' || (x.distM ?? 999) <= 50)) return null;
  return { left: x.left, right: x.right };
}

/**
 * ความสูงคันกั้นน้ำที่ทราบค่าแน่นอนรายสถานี (ม.รทก.) — ใส่เพิ่มได้เมื่อมีข้อมูลจากหน่วยงาน
 * ตัวอย่าง: 'C.12': { v: 3.0, source: 'สำนักการระบายน้ำ กทม.' }
 * ถ้าไม่มีในตารางนี้ สถานีริมเจ้าพระยาในกรุงเทพฯ จะใช้ความสูงออกแบบของช่วงนั้น (lib/floodwall.ts)
 */
export const BARRIERS: Record<string, { v: number; source: string }> = {};

export function referenceLevels(s: Pick<Station, 'code' | 'lat' | 'provCode' | 'river' | 'bank' | 'leftBank' | 'rightBank' | 'critical'>): RefLevel[] {
  const out: RefLevel[] = [];
  // ข้อมูลบางสถานีผิดพลาด (เช่น ตลิ่ง 1,580 ม. หรือระดับวิกฤต 0 ที่แปลว่า "ไม่ได้ตั้งค่า")
  // จึงรับเฉพาะตัวเลขจริงที่อยู่ห่างจากตลิ่งด้านต่ำไม่เกิน 5 ม.
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const banks = [s.leftBank, s.rightBank].filter(ok);
  const low = ok(s.bank) ? s.bank : banks.length ? Math.min(...banks) : null;
  const near = (v: number) => low === null || Math.abs(v - low) <= 5;
  const highs = banks.filter(near);
  const high = highs.length ? Math.max(...highs) : null;

  if (low !== null) {
    const two = high !== null && high - low >= 0.05;
    const dir = bankSides(s.code);
    if (!two || !dir) {
      // ไม่รู้ทิศ: แสดงเฉพาะตลิ่งด้านที่ต่ำกว่า (น้ำจะล้นตรงนี้ก่อน) ไม่ใช้คำว่าซ้าย/ขวา
      out.push({ key: 'bank', v: low, label: 'ตลิ่ง', color: 'var(--text)', dash: '4 3', note: 'ระดับตลิ่ง ถ้าน้ำสูงกว่านี้แปลว่าน้ำล้นตลิ่ง' });
    } else {
      // ตลิ่งฝั่งไหนต่ำกว่า: เทียบ left/right ของ ThaiWater แล้วแปลงเป็นทิศ
      const lowIsLeft = ok(s.leftBank) && ok(s.rightBank) ? s.leftBank <= s.rightBank : true;
      const lowSide = lowIsLeft ? dir.left : dir.right;
      const highSide = lowIsLeft ? dir.right : dir.left;
      out.push({
        key: 'bank', v: low, label: `ตลิ่งฝั่ง${lowSide}`, side: lowSide, color: 'var(--text)', dash: '4 3',
        note: `ตลิ่งฝั่ง${lowSide} ต่ำกว่าอีกฝั่ง น้ำจะล้นฝั่งนี้ก่อน`,
      });
      out.push({ key: 'bank2', v: high!, label: `ตลิ่งฝั่ง${highSide}`, side: highSide, color: 'var(--muted)', dash: '2 3', note: `ตลิ่งฝั่ง${highSide}` });
    }
  }

  const known = BARRIERS[s.code];
  if (known) {
    out.push({ key: 'wall', v: known.v, label: 'คันกั้นน้ำ', color: 'var(--l3)', note: `ความสูงคันกั้นน้ำ (ที่มา: ${known.source})` });
  } else if (s.provCode === '10' && /เจ้าพระยา/.test(s.river)) {
    const w = floodwallAt(s.lat);
    if (low === null || w.v > low)
      out.push({
        key: 'wall', v: w.v, label: 'คันกั้นน้ำ', color: 'var(--l3)',
        note: `ความสูงแนวป้องกันน้ำท่วมช่วง${w.section} ${w.v.toFixed(2)} ม.รทก. (ที่มา: ${FLOODWALL_SOURCE}) เป็นความสูงออกแบบของช่วงนี้ ไม่ใช่ค่าที่สำรวจตรงสถานี`,
      });
  }

  if (ok(s.critical) && s.critical !== 0 && near(s.critical) && !out.some(r => Math.abs(r.v - s.critical!) < 0.03)) {
    out.push({ key: 'critical', v: s.critical, label: 'ระดับวิกฤต', color: 'var(--l4)', dash: '1 3', note: 'ระดับวิกฤตที่กรมชลประทานกำหนดสำหรับสถานีนี้' });
  }
  return out.sort((a, b) => b.v - a.v);
}
