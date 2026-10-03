import { FLOW, LEVEL_NAME, THREAT_NAME } from './assess';
import { fmtInt, thShort } from './format';
import type { Overall } from './types';

/** บรรทัดตัวเลขวัดจริงที่ C.2 / C.13 สำหรับแชร์ แทนข่าวลือที่ส่งต่อกันในกลุ่มไลน์ */
export function flowLine(o: Overall): string | null {
  const c2 = o.indicators.find(i => i.key === 'c2');
  const c13 = o.indicators.find(i => i.key === 'c13');
  if (!c2 && !c13) return null;
  const parts = [c2 && `C.2 นครสวรรค์ ${fmtInt(c2.value)}`, c13 && `C.13 เขื่อนเจ้าพระยา ${fmtInt(c13.value)}`].filter(Boolean);
  const asOf = (c13 ?? c2)!.asOf;
  return `ตัวเลขวัดจริง${asOf ? ` ${thShort(asOf)}` : ''}: ${parts.join(' · ')} ลบ.ม./วิ (กระทบ กทม. ที่ ${fmtInt(FLOW.bkk)})`;
}

export function overallShareText(o: Overall): string {
  return [
    'สถานการณ์น้ำกรุงเทพฯ ตอนนี้',
    `• ${THREAT_NAME.north}: ${LEVEL_NAME[o.north]}`,
    `• ${THREAT_NAME.rain}: ${LEVEL_NAME[o.rain]}`,
    flowLine(o),
  ].filter(Boolean).join('\n');
}
