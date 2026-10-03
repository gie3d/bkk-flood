'use client';

import { useState } from 'react';

/** แชร์ข้อความสรุปพร้อมลิงก์ ใช้ Web Share ถ้ามี ไม่งั้นคัดลอก และมีปุ่ม LINE แยก */
export default function Share({ text, label = 'แชร์สถานการณ์' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const full = () => `${text}\nดูข้อมูลล่าสุด: ${window.location.origin}/`;

  const share = async () => {
    const body = full();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'น้ำจะท่วมบ้านไหม?', text: body });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* เบราว์เซอร์ไม่อนุญาตให้คัดลอก */ }
  };
  const line = () => window.open(`https://line.me/R/share?text=${encodeURIComponent(full())}`, '_blank', 'noopener,noreferrer');

  return (
    <div className="share">
      <button type="button" className="btn btn-ghost btn-sm" onClick={share}>{copied ? 'คัดลอกข้อความแล้ว' : label}</button>
      <button type="button" className="btn btn-line btn-sm" onClick={line}>ส่งทาง LINE</button>
    </div>
  );
}
