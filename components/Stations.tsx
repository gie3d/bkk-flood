'use client';

import { useMemo, useState } from 'react';
import LeafletMap from './LeafletMap';
import { METRO, STATUS, stationStatus } from '@/lib/assess';
import { distKm, fmt, thShort } from '@/lib/format';
import type { Place, Station, StationStatus } from '@/lib/types';

const CHIPS: { key: string; label: string; test: (s: Station, p: Place | null) => boolean }[] = [
  { key: 'near', label: 'ใกล้บ้านฉัน (20 กม.)', test: (s, p) => !!p && distKm(p.lat, p.lng, s.lat, s.lng) <= 20 },
  { key: 'metro', label: 'กรุงเทพฯ และปริมณฑล', test: s => METRO.includes(s.provCode) },
  { key: '10', label: 'กรุงเทพฯ', test: s => s.provCode === '10' },
  { key: '12', label: 'นนทบุรี', test: s => s.provCode === '12' },
  { key: '13', label: 'ปทุมธานี', test: s => s.provCode === '13' },
  { key: '11', label: 'สมุทรปราการ', test: s => s.provCode === '11' },
  { key: '14', label: 'อยุธยา', test: s => s.provCode === '14' },
  { key: 'cp', label: 'แม่น้ำเจ้าพระยา', test: s => /เจ้าพระยา/.test(s.river) },
  { key: 'central', label: 'ภาคกลางทั้งหมด', test: s => s.areaCode === '2' },
];

const ORDER: Record<StationStatus, number> = { over: 0, near: 1, high: 2, ok: 3, stale: 4 };

export function StationMap({ stations, place, onStation }: { stations: Station[]; place: Place | null; onStation: (s: Station) => void }) {
  const shown = useMemo(() => stations.filter(s => s.areaCode === '2' || (s.lat > 12.5 && s.lat < 17.5 && s.lng > 98.5 && s.lng < 102.5)), [stations]);
  return (
    <>
      <div className="legend">
        {(Object.keys(STATUS) as StationStatus[]).map(k => (
          <span key={k}><i className="dot" style={{ background: STATUS[k].color, width: 12, height: 12 }} />{STATUS[k].label}{STATUS[k].range && ` (${STATUS[k].range})`}</span>
        ))}
        {place && <span><i className="dot" style={{ background: 'var(--brand)', width: 12, height: 12 }} />บ้านของคุณ</span>}
      </div>
      <LeafletMap
        stations={shown}
        place={place}
        label="แผนที่สถานีวัดระดับน้ำ"
        onStation={id => {
          const s = stations.find(x => x.id === id);
          if (s) onStation(s);
        }}
      />
    </>
  );
}

export function StationTable({ stations, place, onStation }: { stations: Station[]; place: Place | null; onStation: (s: Station) => void }) {
  const [chip, setChip] = useState(place ? 'near' : 'metro');
  const chips = CHIPS.filter(c => c.key !== 'near' || place);
  const active = chips.find(c => c.key === chip) ?? chips[0];
  const rows = stations
    .filter(s => active.test(s, place))
    .sort((a, b) => ORDER[stationStatus(a)] - ORDER[stationStatus(b)] || (b.pct ?? -1) - (a.pct ?? -1));

  return (
    <>
      <div className="tabs" role="tablist">
        {chips.map(c => (
          <button key={c.key} type="button" role="tab" className="chip" aria-selected={c.key === active.key} onClick={() => setChip(c.key)}>{c.label}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>สถานี</th><th>พื้นที่</th>
              <th className="num">ระดับน้ำ<br /><small>ม.รทก.</small></th>
              <th className="num">ตลิ่ง<br /><small>ม.รทก.</small></th>
              <th>สถานะ</th><th className="num">แนวโน้ม</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map(s => {
              const st = stationStatus(s);
              const tr = s.wl !== null && s.prev !== null ? (s.wl - s.prev) * 100 : null;
              return (
                <tr key={s.id} className={`clickable${s.stale ? ' stale' : ''}`} onClick={() => onStation(s)}>
                  <td>
                    <button type="button" className="row-link" onClick={e => { e.stopPropagation(); onStation(s); }}>{s.name}</button>
                    <small>{s.river || s.code}</small>
                  </td>
                  <td>{s.amphoe}<small>{s.prov}</small></td>
                  <td className="num">{fmt(s.wl)}</td>
                  <td className="num">{fmt(s.bank)}</td>
                  <td>
                    <span className="sbadge"><i className="dot" style={{ background: STATUS[st].color }} />{STATUS[st].label}{s.pct !== null && !s.stale ? ` ${Math.round(s.pct)}%` : ''}</span>
                    {!s.stale && s.pct !== null && (
                      <span className="pctbar" aria-hidden="true"><i style={{ width: `${Math.min(s.pct, 100)}%`, background: STATUS[st].color }} /></span>
                    )}
                    {s.stale && <small>{thShort(s.time)}</small>}
                  </td>
                  <td className="num">
                    {tr === null || s.stale || Math.abs(tr) > 100 ? '–' : Math.abs(tr) < 1 ? 'ทรงตัว' : (
                      <span className={tr > 0 ? 'trend-up' : 'trend-down'}>{tr > 0 ? '▲' : '▼'} {Math.abs(tr).toFixed(0)} ซม.</span>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={6} className="muted">ไม่มีสถานีในพื้นที่นี้</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint">ม.รทก. = เมตรเหนือระดับน้ำทะเลปานกลาง · แนวโน้มเทียบกับการวัดครั้งก่อน · สถานีที่ไม่อัปเดตเกิน 6 ชั่วโมงแสดงเป็นสีเทา · แตะที่สถานีเพื่อดูข้อมูลย้อนหลังสูงสุด 1 ปี</p>
    </>
  );
}
