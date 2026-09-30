'use client';

import { useEffect, useRef } from 'react';
import { STATUS, stationStatus } from '@/lib/assess';
import { ago, fmt, fmtInt } from '@/lib/format';
import type { Station } from '@/lib/types';
import StationHistory from './StationHistory';

export default function StationModal({ station, onClose }: { station: Station | null; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!station) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [station, onClose]);

  if (!station) return null;
  const s = station;
  const st = stationStatus(s);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="station-title" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 id="station-title" style={{ fontSize: '1.3rem', margin: 0 }}>{s.name} <small className="muted" style={{ fontWeight: 400, fontSize: '.85rem' }}>{s.code}</small></h2>
            <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>
              {s.river && `${s.river} · `}อ.{s.amphoe} จ.{s.prov} · {s.agency}
            </p>
          </div>
          <button ref={closeBtn} type="button" className="modal-close" aria-label="ปิด" onClick={onClose}>×</button>
        </div>

        <div className="modal-now">
          <span className="sbadge" style={{ color: STATUS[st].color, fontWeight: 700 }}>
            <i className="dot" style={{ background: STATUS[st].color }} />{STATUS[st].label}{s.pct !== null && !s.stale ? ` ${Math.round(s.pct)}% ของตลิ่ง` : ''}
          </span>
          <span>น้ำ <b>{fmt(s.wl)} ม.</b></span>
          <span>ตลิ่ง <b>{fmt(s.bank)} ม.</b></span>
          {s.discharge !== null && <span>ไหล <b>{fmtInt(s.discharge)}</b> ลบ.ม./วิ</span>}
          <span className="muted">อัปเดต {ago(s.time)}</span>
        </div>

        <StationHistory station={s} />
      </div>
    </div>
  );
}
