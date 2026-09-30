'use client';

import { useEffect, useRef, useState } from 'react';
import { STATUS, stationStatus } from '@/lib/assess';
import { referenceLevels } from '@/lib/barriers';
import { fmt, fmtInt, thDate, thShort } from '@/lib/format';
import type { Graph, Station } from '@/lib/types';
import { LineChart } from './charts';

const RANGES: { days: number; label: string }[] = [
  { days: 1, label: '24 ชม.' },
  { days: 7, label: '7 วัน' },
  { days: 30, label: '30 วัน' },
  { days: 90, label: '3 เดือน' },
  { days: 365, label: '1 ปี' },
];

type Result = { ok: true; g: Graph } | { ok: false };

function when(t: string, days: number) {
  return days <= 7 ? thShort(t) : thDate(t);
}

function change(d: number) {
  if (Math.abs(d) < 0.01) return { text: 'ทรงตัว', cls: '' };
  const txt = Math.abs(d) < 1 ? `${Math.round(Math.abs(d) * 100)} ซม.` : `${fmt(Math.abs(d))} ม.`;
  return d > 0 ? { text: `▲ สูงขึ้น ${txt}`, cls: 'trend-up' } : { text: `▼ ลดลง ${txt}`, cls: 'trend-down' };
}

export default function StationHistory({ station, initialDays = 7 }: { station: Station; initialDays?: number }) {
  const [days, setDays] = useState(initialDays);
  const [field, setField] = useState<'v' | 'q'>('v');
  const [results, setResults] = useState<Record<string, Result>>({});
  const key = `${station.id}:${days}`;
  const res = results[key];

  // ขอข้อมูลแต่ละช่วงครั้งเดียว แล้วเก็บไว้ให้สลับกลับมาดูได้ทันที
  const requested = useRef(new Set<string>());
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (requested.current.has(key)) return;
    requested.current.add(key);
    fetch(`/api/graph?id=${station.id}&days=${days}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g: Graph) => setResults(m => ({ ...m, [key]: { ok: true, g } })))
      .catch(() => {
        requested.current.delete(key); // ให้ลองใหม่ได้เมื่อกลับมาเลือกช่วงนี้อีกครั้ง
        setResults(m => ({ ...m, [key]: { ok: false } }));
      });
  }, [key, station.id, days, attempt]);

  // ถ้ารอนานเกิน 3 วินาที บอกผู้ใช้ว่าข้อมูลช่วงยาวใช้เวลาโหลด
  const [slow, setSlow] = useState<string | null>(null);
  useEffect(() => {
    if (res) return;
    const t = setTimeout(() => setSlow(key), 3000);
    return () => clearTimeout(t);
  }, [key, res]);

  const retry = () => {
    requested.current.delete(key);
    setResults(m => {
      const next = { ...m };
      delete next[key];
      return next;
    });
    setAttempt(a => a + 1);
  };

  const g = res?.ok ? res.g : null;
  const st = g?.stats;
  const hasQ = !!g?.points.some(p => p.q !== null);
  const showQ = field === 'q' && hasQ;

  const levels = referenceLevels(station);
  const refs = showQ
    ? (g?.qmax ? [{ v: g.qmax, label: `ความจุลำน้ำ ${fmtInt(g.qmax)}`, color: 'var(--l4)' }] : [])
    : levels.map(r => ({ v: r.v, label: `${r.label} ${fmt(r.v)} ม.`, color: r.key === 'bank' ? 'var(--l4)' : r.color }));

  const overDays = st ? st.hoursOverBank / 24 : 0;

  return (
    <div className="history">
      <div className="history-bar">
        <div className="tabs" role="tablist" aria-label="ช่วงเวลา" style={{ margin: 0 }}>
          {RANGES.map(r => (
            <button key={r.days} type="button" role="tab" className="chip" aria-selected={r.days === days} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
        {hasQ && (
          <div className="tabs" role="group" aria-label="ข้อมูลที่แสดง" style={{ margin: 0 }}>
            <button type="button" className="chip" aria-pressed={field === 'v'} onClick={() => setField('v')}>ระดับน้ำ</button>
            <button type="button" className="chip" aria-pressed={field === 'q'} onClick={() => setField('q')}>ปริมาณน้ำไหล</button>
          </div>
        )}
      </div>

      {!res ? (
        <>
          {slow === key && (
            <p className="hint" role="status" style={{ marginTop: 0 }}>
              กำลังโหลดข้อมูลย้อนหลัง{days >= 30 ? ' ช่วงยาวจากคลังข้อมูลน้ำ อาจใช้เวลาสักครู่' : '…'}
            </p>
          )}
          <div className="stats">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ minHeight: 64 }} />)}</div>
          <div className="skeleton" style={{ minHeight: 200, marginTop: 10 }} />
        </>
      ) : !res.ok ? (
        <p className="muted">
          โหลดข้อมูลไม่สำเร็จ (คลังข้อมูลน้ำอาจตอบช้า){' '}
          <button type="button" className="btn-link" onClick={retry}>ลองใหม่</button>
        </p>
      ) : !g || !st || !st.hours ? (
        <p className="muted">ไม่มีข้อมูลย้อนหลังในช่วงนี้</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <span>ล่าสุด</span>
              <b>{fmt(st.last!.v)} ม.</b>
              <small>{thShort(st.last!.t)}</small>
            </div>
            <div className="stat">
              <span>สูงสุดในช่วงนี้</span>
              <b style={{ color: g.bank !== null && st.max!.v > g.bank ? STATUS.over.color : undefined }}>{fmt(st.max!.v)} ม.</b>
              <small>{when(st.max!.t, days)}</small>
            </div>
            <div className="stat">
              <span>ต่ำสุดในช่วงนี้</span>
              <b>{fmt(st.min!.v)} ม.</b>
              <small>{when(st.min!.t, days)}</small>
            </div>
            <div className="stat">
              <span>เฉลี่ย</span>
              <b>{fmt(st.avg)} ม.</b>
              <small>จาก {fmtInt(st.hours)} ชั่วโมงที่มีข้อมูล</small>
            </div>
            <div className="stat">
              <span>เทียบกับต้นช่วง</span>
              <b className={change(st.last!.v - st.first!.v).cls}>{change(st.last!.v - st.first!.v).text}</b>
              <small>จาก {fmt(st.first!.v)} ม. เมื่อ {when(st.first!.t, days)}</small>
            </div>
            <div className="stat">
              <span>น้ำล้นตลิ่ง</span>
              {g.bank === null ? (
                <b>–</b>
              ) : st.hoursOverBank ? (
                <b style={{ color: STATUS.over.color }}>{overDays >= 1 ? `${fmt(overDays, 1)} วัน` : `${st.hoursOverBank} ชม.`}</b>
              ) : (
                <b style={{ color: STATUS.ok.color }}>ไม่เคยล้น</b>
              )}
              <small>{g.bank !== null ? `เทียบตลิ่ง ${fmt(g.bank)} ม.` : 'ไม่มีข้อมูลตลิ่ง'}</small>
            </div>
            {st.qMax && (
              <div className="stat">
                <span>ปริมาณน้ำไหลสูงสุด</span>
                <b>{fmtInt(st.qMax.v)}</b>
                <small>ลบ.ม./วินาที · {when(st.qMax.t, days)}</small>
              </div>
            )}
          </div>

          <LineChart
            key={`${key}-${showQ ? 'q' : 'v'}`}
            points={g.points}
            field={showQ ? 'q' : 'v'}
            unit={showQ ? 'ลบ.ม./วิ' : 'ม.รทก.'}
            decimals={showQ ? 0 : 2}
            height={220}
            refs={refs}
          />
          <p className="hint">
            {showQ ? 'ปริมาณน้ำไหลผ่านสถานี (ลบ.ม./วินาที)' : 'ระดับน้ำเป็นเมตรเหนือระดับน้ำทะเลปานกลาง (ม.รทก.)'}
            {g.step > 1 && ` · แต่ละจุดคือค่าสูงสุดในช่วง ${g.step >= 24 ? `${fmt(g.step / 24, g.step % 24 ? 1 : 0)} วัน` : `${g.step} ชม.`}`}
            {!showQ && levels.some(r => r.approx) && ' · เส้นคันกั้นน้ำเป็นค่าประมาณของ กทม. ไม่ใช่ค่าที่วัดที่สถานีนี้'}
            {' · '}สถานะตอนนี้: <span style={{ color: STATUS[stationStatus(station)].color, fontWeight: 600 }}>{STATUS[stationStatus(station)].label}</span>
          </p>
        </>
      )}
    </div>
  );
}
