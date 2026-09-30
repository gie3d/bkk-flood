'use client';

import { useMemo, useRef, useState } from 'react';
import { STATUS, stationStatus } from '@/lib/assess';
import { clamp, fmt, fmtInt, thShort } from '@/lib/format';
import type { GraphPoint, Station } from '@/lib/types';

/* ---------------- กราฟเส้นพร้อม tooltip ---------------- */

interface Ref { v: number; label: string; color: string }

export function LineChart({ points, field, refs = [], unit, decimals = 2, height = 200 }: {
  points: GraphPoint[];
  field: 'v' | 'q';
  refs?: Ref[];
  unit: string;
  decimals?: number;
  height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = height, L = 46, R = 12, T = 14, B = 24;

  const geo = useMemo(() => {
    const pts = points.filter(p => p[field] !== null).map(p => ({ t: new Date(p.t).getTime(), v: p[field] as number }));
    if (pts.length < 2) return null;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const vals = pts.map(p => p.v).concat(refs.map(r => r.v));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.12 || 1;
    lo -= pad; hi += pad;
    const x = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    return { pts, t0, t1, lo, hi, x, y };
  }, [points, field, refs, H]);

  if (!geo) return <p className="muted">ไม่มีข้อมูลกราฟ</p>;
  const { pts, t0, t1, lo, hi, x, y } = geo;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${path}L${x(t1).toFixed(1)},${H - B}L${x(t0).toFixed(1)},${H - B}Z`;
  const fmtV = (v: number) => (decimals ? fmt(v, decimals) : fmtInt(v));

  const grid = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const days: number[] = [];
  const d0 = new Date(t0 + 7 * 3600e3);
  d0.setUTCHours(0, 0, 0, 0);
  for (let d = d0.getTime() - 7 * 3600e3 + 864e5; d < t1; d += 864e5) days.push(d);

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - L) / (W - L - R)) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - t) < Math.abs(pts[best].t - t)) best = i;
    setHover(best);
  };
  const hp = hover !== null ? pts[hover] : null;
  const last = pts[pts.length - 1];

  return (
    <div className="chart" ref={wrap} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`กราฟ${unit}`}>
        <defs>
          <linearGradient id={`g-${field}-${H}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--water)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--water)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={L - 6} y={y(v) + 3} textAnchor="end">{decimals ? v.toFixed(1) : Math.round(v).toLocaleString('th-TH')}</text>
          </g>
        ))}
        {days.map(d => (
          <text key={d} x={x(d)} y={H - 6} textAnchor="middle">
            {new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })}
          </text>
        ))}
        <path d={area} fill={`url(#g-${field}-${H})`} />
        {refs.map(r => (
          <g key={r.label}>
            <line x1={L} x2={W - R} y1={y(r.v)} y2={y(r.v)} stroke={r.color} strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - R - 4} y={y(r.v) - 5} textAnchor="end" style={{ fill: r.color, fontWeight: 600 }}>{r.label}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(last.t)} cy={y(last.v)} r="4" fill="var(--brand)" />
        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="2 3" />
            <circle cx={x(hp.t)} cy={y(hp.v)} r="5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="tip" style={{ left: `${(x(hp.t) / W) * 100}%`, top: `${(y(hp.v) / H) * 100}%` }}>
          <b>{fmtV(hp.v)}</b> {unit}
          <br />
          {thShort(new Date(hp.t).toISOString())}
        </div>
      )}
    </div>
  );
}

/* ---------------- หลอดวัดระดับน้ำเทียบตลิ่ง ---------------- */

export function StationGauge({ s, distance }: { s: Station; distance?: number }) {
  const st = stationStatus(s);
  const pct = s.pct ?? 0;
  // สเกล 0–130% ของตลิ่ง
  const H = 150, top = 12, bottom = H - 16;
  const yOf = (p: number) => bottom - (clamp(p, 0, 130) / 130) * (bottom - top);
  const water = yOf(pct);
  const bank = yOf(100);
  const color = STATUS[st].color;
  return (
    <div className="gauge">
      <svg viewBox={`0 0 110 ${H}`} aria-hidden="true">
        <rect x="30" y={top} width="46" height={bottom - top} rx="8" fill="var(--bg-alt)" stroke="var(--line)" />
        <clipPath id={`clip-${s.id}`}>
          <rect x="30" y={top} width="46" height={bottom - top} rx="8" />
        </clipPath>
        <g clipPath={`url(#clip-${s.id})`}>
          <rect x="30" y={water} width="46" height={bottom - water} fill={color} opacity=".85" />
          <path d={`M30 ${water} q 6 -4 11.5 0 t 11.5 0 t 11.5 0 t 11.5 0`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5" />
        </g>
        <line x1="22" x2="84" y1={bank} y2={bank} stroke="var(--text)" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="86" y={bank + 3} fontSize="9" fill="var(--muted)">ตลิ่ง</text>
        <text x="53" y={Math.min(water - 5, bottom - 4)} fontSize="12" fontWeight="700" textAnchor="middle" fill={pct > 60 ? '#fff' : 'var(--text)'} style={{ paintOrder: 'stroke' }}>
          {s.pct !== null ? `${Math.round(pct)}%` : '–'}
        </text>
      </svg>
      <div className="g-name">{s.name}</div>
      <div className="g-sub">{s.river || s.amphoe}{distance !== undefined ? ` · ${fmt(distance, 1)} กม.` : ''}</div>
      <div className="g-val" style={{ color }}>{STATUS[st].label}{s.over > 0 ? ` +${fmt(s.over)} ม.` : ''}</div>
    </div>
  );
}

/* ---------------- ภาพตัดยาวแม่น้ำเจ้าพระยา ---------------- */

export function RiverProfile({ stations, highlight }: { stations: Station[]; highlight?: Set<number> }) {
  const [hover, setHover] = useState<number | null>(null);
  const list = stations;
  if (list.length < 2) return <p className="muted">ไม่มีข้อมูล</p>;
  const W = Math.max(640, list.length * 34), H = 250, L = 36, R = 10, T = 16, B = 70;
  const bw = (W - L - R) / list.length;
  const maxP = Math.max(130, ...list.map(s => s.pct ?? 0));
  const y = (p: number) => T + (1 - clamp(p, 0, maxP) / maxP) * (H - T - B);
  return (
    <div className="profile">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ระดับน้ำเทียบตลิ่งตลอดแม่น้ำเจ้าพระยา">
        {[0, 50, 100].map(p => (
          <g key={p}>
            <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke={p === 100 ? 'var(--l4)' : 'var(--line)'} strokeDasharray={p === 100 ? '5 4' : undefined} strokeWidth={p === 100 ? 1.5 : 1} />
            <text x={L - 6} y={y(p) + 3} textAnchor="end">{p}%</text>
          </g>
        ))}
        <text x={W - R - 2} y={y(100) - 5} textAnchor="end" style={{ fill: 'var(--l4)', fontWeight: 600 }}>ระดับตลิ่ง</text>
        {list.map((s, i) => {
          const st = stationStatus(s);
          const p = s.pct ?? 0;
          const cx = L + i * bw + bw / 2;
          const hl = highlight?.has(s.id);
          return (
            <g key={s.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill={hover === i ? 'var(--bg-alt)' : 'transparent'} />
              <rect x={cx - bw * 0.32} y={y(p)} width={bw * 0.64} height={Math.max(y(0) - y(p), 1)} rx="3" fill={STATUS[st].color} opacity={st === 'stale' ? 0.45 : 0.9} />
              {hl && <circle cx={cx} cy={y(p) - 8} r="4" fill="var(--brand)" />}
              <text x={cx} y={H - B + 12} transform={`rotate(-50 ${cx} ${H - B + 12})`} textAnchor="end" style={{ fontSize: 9.5, fill: hl ? 'var(--brand)' : undefined, fontWeight: hl ? 700 : undefined }}>
                {s.prov.replace('พระนครศรีอยุธยา', 'อยุธยา').replace('กรุงเทพมหานคร', 'กทม.')} · {s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name}
              </text>
            </g>
          );
        })}
        {hover !== null && (() => {
          const s = list[hover];
          const cx = clamp(L + hover * bw + bw / 2, 110, W - 110);
          return (
            <g pointerEvents="none">
              <rect x={cx - 105} y={T} width="210" height="44" rx="6" fill="var(--text)" />
              <text x={cx} y={T + 17} textAnchor="middle" style={{ fill: 'var(--bg)', fontSize: 11, fontWeight: 600 }}>{s.name} ({s.code})</text>
              <text x={cx} y={T + 34} textAnchor="middle" style={{ fill: 'var(--bg)', fontSize: 10.5 }}>
                {s.pct !== null ? `${Math.round(s.pct)}% ของตลิ่ง` : '–'} · น้ำ {fmt(s.wl)} / ตลิ่ง {fmt(s.bank)} ม.
              </text>
            </g>
          );
        })()}
        <text x={L} y={H - 4} style={{ fontSize: 10 }}>← ต้นน้ำ (นครสวรรค์)</text>
        <text x={W - R} y={H - 4} textAnchor="end" style={{ fontSize: 10 }}>ปากแม่น้ำ (สมุทรปราการ) →</text>
      </svg>
    </div>
  );
}

/* ---------------- วงแหวนความจุเขื่อน ---------------- */

export function Donut({ pct, color, size = 86 }: { pct: number; color: string; size?: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const v = clamp(pct, 0, 100) / 100;
  return (
    <svg className="donut" viewBox="0 0 86 86" width={size} height={size} role="img" aria-label={`${Math.round(pct)}%`}>
      <circle cx="43" cy="43" r={r} fill="none" stroke="var(--bg-alt)" strokeWidth="10" />
      <circle cx="43" cy="43" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${c * v} ${c}`} strokeLinecap="round" transform="rotate(-90 43 43)" />
      <text x="43" y="48" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)">{Math.round(pct)}%</text>
    </svg>
  );
}
