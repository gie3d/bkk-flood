import { FLOODWALL_REFS, FLOODWALL_SOURCE } from '@/lib/floodwall';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** ที่มาของความสูงคันกั้นน้ำริมเจ้าพระยา (ลิงก์ข่าวที่อ้างสำนักการระบายน้ำ กทม.) */
export function FloodwallSource() {
  return (
    <>
      ที่มา: {FLOODWALL_SOURCE} อ้างใน{' '}
      {FLOODWALL_REFS.map((r, i) => (
        <span key={r.url}>{i > 0 && ', '}<a href={r.url} {...ext}>{r.label}</a></span>
      ))}
    </>
  );
}

/** ที่มาของระดับน้ำและตลิ่ง */
export function ThaiWaterSource() {
  return <>ที่มา: <a href="https://www.thaiwater.net/" {...ext}>คลังข้อมูลน้ำแห่งชาติ (ThaiWater)</a></>;
}
