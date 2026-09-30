/* eslint-disable @next/next/no-img-element -- ภาพสดผ่าน /api/image ไม่ต้องใช้ image optimizer */
'use client';

import { useState } from 'react';

/** รูปที่ลองโหลดใหม่หนึ่งครั้งถ้าล้มเหลว แล้วแสดงข้อความแทนไอคอนรูปเสีย */
export default function SafeImg({ src, alt, className, onClick, loading = 'lazy' }: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}) {
  const [tries, setTries] = useState(0);
  if (tries > 1) {
    return (
      <div className="img-fail" role="img" aria-label={alt}>
        <span>โหลดภาพไม่สำเร็จ</span>
        <button type="button" className="btn-link" onClick={e => { e.stopPropagation(); setTries(0); }}>ลองใหม่</button>
      </div>
    );
  }
  const url = tries ? `${src}${src.includes('?') ? '&' : '?'}retry=${tries}` : src;
  return (
    <img
      key={url}
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={() => setTimeout(() => setTries(t => t + 1), tries ? 0 : 1500)}
    />
  );
}
