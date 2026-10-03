'use client';

import { useEffect, useState } from 'react';
import { fmt } from '@/lib/format';
import type { Graph, Station } from '@/lib/types';

/** ความชันของระดับน้ำช่วง 48 ชม. ล่าสุด (เมตรต่อวัน) ด้วย linear regression เพื่อลดผลของค่าที่แกว่ง */
function ratePerDay(g: Graph): number | null {
  const pts = g.points.filter(p => p.v !== null).map(p => ({ t: new Date(p.t).getTime() / 864e5, v: p.v as number }));
  if (pts.length < 6) return null;
  const end = pts[pts.length - 1].t;
  const win = pts.filter(p => p.t >= end - 2);
  if (win.length < 6 || end - win[0].t < 1) return null;
  const mt = win.reduce((s, p) => s + p.t, 0) / win.length;
  const mv = win.reduce((s, p) => s + p.v, 0) / win.length;
  const num = win.reduce((s, p) => s + (p.t - mt) * (p.v - mv), 0);
  const den = win.reduce((s, p) => s + (p.t - mt) ** 2, 0);
  return den ? num / den : null;
}

/** น้ำในคลองใกล้บ้านลดเร็วแค่ไหน และอีกกี่วันจะต่ำกว่าตลิ่ง */
export default function DrainRate({ station }: { station: Station }) {
  const [g, setG] = useState<Graph | null | 'error'>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/graph?id=${station.id}&days=7`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((x: Graph) => { if (live) setG(x); })
      .catch(() => { if (live) setG('error'); });
    return () => { live = false; };
  }, [station.id]);

  const name = station.river || station.name;
  if (g === null) return <p className="muted">กำลังคำนวณอัตราน้ำลดที่{name}…</p>;
  if (g === 'error') return <p className="muted">โหลดข้อมูลย้อนหลังของ{name}ไม่สำเร็จ</p>;
  const r = ratePerDay(g);
  if (r === null) return <p className="muted">ข้อมูลย้อนหลังของ{name}ไม่พอคำนวณอัตราน้ำลด</p>;

  const cm = r * 100;
  const above = station.wl !== null && station.bank !== null ? station.wl - station.bank : null;
  let verdict: React.ReactNode;
  if (cm <= -0.3) {
    const days = above !== null && above > 0 ? Math.ceil(above / -r) : null;
    verdict = (
      <>
        <b className="trend-down">▼ ลดลงวันละ ~{fmt(-cm, 1)} ซม.</b>
        {days !== null && <> · ถ้าลดในอัตรานี้ จะต่ำกว่าตลิ่งในอีกราว <b>{days} วัน</b></>}
        {days === null && above !== null && <> · ตอนนี้ต่ำกว่าตลิ่ง {fmt(-above)} ม.</>}
      </>
    );
  } else if (cm >= 0.3) {
    verdict = <><b className="trend-up">▲ ยังสูงขึ้นวันละ ~{fmt(cm, 1)} ซม.</b> · ยังไม่เริ่มลด</>;
  } else {
    verdict = <><b>ทรงตัว</b> (เปลี่ยนไม่ถึง 0.3 ซม./วัน) · คลองยังระบายออกได้น้อย</>;
  }

  return (
    <div className="drain-rate">
      <p style={{ margin: 0 }}>{name} ({station.name}) ช่วง 48 ชม. ล่าสุด: {verdict}</p>
      {above !== null && above > 0 && <p className="hint" style={{ marginTop: 4 }}>ตอนนี้น้ำสูงกว่าตลิ่ง {fmt(above)} ม.</p>}
    </div>
  );
}
