import { ImageResponse } from 'next/og';
import { FLOW, LEVEL_NAME, THREAT_NAME } from '@/lib/assess';
import { fmtInt, thShort } from '@/lib/format';
import { getSituation } from '@/lib/thaiwater';
import type { Indicator, Level, Overall } from '@/lib/types';

export const alt = 'สถานการณ์น้ำกรุงเทพฯ ล่าสุด: น้ำเหนือที่ C.2 และ C.13 เทียบเกณฑ์ 3,000 ลบ.ม./วินาที';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// ภาพที่แชร์ในไลน์/เฟซบุ๊กแสดงตัวเลขล่าสุด สร้างใหม่ทุก 10 นาทีเหมือนข้อมูล
export const revalidate = 600;

const COLOR: Record<Level, string> = { 0: '#a3adb8', 1: '#1f9d55', 2: '#b98500', 3: '#e0661b', 4: '#d42a2a' };

// satori วางวรรณยุกต์ซ้อนบนสระบน (เช่น เขื่อน ที่) ไม่ได้ ข้อความในภาพจึงเลี่ยงคำแบบนั้น
const FONT = 'Noto+Sans+Thai';

/** ImageResponse ไม่มีฟอนต์ไทยในตัว จึงดึง Noto Sans Thai เฉพาะตัวอักษรที่ใช้จาก Google Fonts (ได้ TTF) */
async function thaiFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${FONT}:wght@700&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  let o: Overall | null = null;
  try {
    o = (await getSituation()).overall;
  } catch { /* ThaiWater ล่ม ใช้ภาพทั่วไป */ }

  const flows = (['c2', 'c13'] as const)
    .map(k => o?.indicators.find(i => i.key === k))
    .filter((i): i is Indicator => !!i);
  const asOf = flows[0]?.asOf;

  const title = 'น้ำจะท่วมบ้านไหม?';
  const threats = o ? (['north', 'rain'] as const).map(t => ({ name: THREAT_NAME[t], level: o[t] })) : [];
  const rows = flows.map(i => ({
    name: i.key === 'c2' ? 'C.2 นครสวรรค์' : 'C.13 ชัยนาท',
    value: fmtInt(i.value),
    level: i.level,
    pct: Math.min(i.value / (FLOW.severe + 500), 1),
  }));
  const foot = `ลบ.ม./วินาที · กระทบ กทม. ถ้าเกิน ${fmtInt(FLOW.bkk)}${asOf ? ` · วัดจริง ${thShort(asOf)}` : ''} · ข้อมูล ThaiWater`;
  const fallback = 'เช็กสถานการณ์น้ำใกล้บ้านคุณ';

  const allText = [title, fallback, foot, ...threats.flatMap(t => [t.name, LEVEL_NAME[t.level]]), ...rows.flatMap(r => [r.name, r.value]), '0123456789,·:.'].join('');
  const font = await thaiFont(allText);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa', padding: 60, fontFamily: 'Noto Sans Thai', color: '#16202b' }}>
        <div style={{ fontSize: 64, display: 'flex' }}>{title}</div>
        {threats.length > 0 ? (
          <div style={{ display: 'flex', gap: 20, marginTop: 24 }}>
            {threats.map(t => (
              <div key={t.name} style={{ display: 'flex', fontSize: 34, color: '#fff', background: COLOR[t.level], borderRadius: 999, padding: '8px 28px' }}>
                {t.name}: {LEVEL_NAME[t.level]}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 40, marginTop: 24, display: 'flex' }}>{fallback}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 48 }}>
          {rows.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 380, fontSize: 36, display: 'flex' }}>{r.name}</div>
              <div style={{ position: 'relative', display: 'flex', flex: 1, height: 36, background: '#e3e8ee', borderRadius: 18 }}>
                <div style={{ width: `${r.pct * 100}%`, background: COLOR[r.level], borderRadius: 18, display: 'flex' }} />
                <div style={{ position: 'absolute', left: `${(FLOW.bkk / (FLOW.severe + 500)) * 100}%`, top: -8, bottom: -8, width: 4, background: '#d42a2a', display: 'flex' }} />
              </div>
              <div style={{ width: 150, fontSize: 48, textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>{r.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', fontSize: 26, color: '#5b6776', display: 'flex' }}>{rows.length ? foot : 'ข้อมูล ThaiWater'}</div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Noto Sans Thai', data: font, style: 'normal', weight: 700 }] : undefined },
  );
}
