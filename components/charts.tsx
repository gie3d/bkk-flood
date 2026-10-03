'use client';

import { useMemo, useRef, useState } from 'react';
import { STATUS, bankGapText, stationStatus } from '@/lib/assess';
import { ago, clamp, fmt, fmtInt, thDateTime, thShort } from '@/lib/format';
import { referenceLevels } from '@/lib/barriers';
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
    const vals = pts.map(p => p.v).concat(refs.map(r => r.v).filter(Number.isFinite));
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
  // ขีดแกนเวลาตามความยาวช่วง: ทุก 6 ชม. / ทุกวัน / ทุกสัปดาห์ / ทุกเดือน (เวลาไทย)
  const spanDays = (t1 - t0) / 864e5;
  const TH = 7 * 3600e3;
  const ticks: { t: number; label: string }[] = [];
  const dayLabel = (t: number) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });
  if (spanDays <= 2) {
    for (let t = Math.ceil((t0 + TH) / 216e5) * 216e5 - TH; t < t1; t += 216e5) {
      const hh = new Date(t + TH).getUTCHours();
      ticks.push({ t, label: hh === 0 ? dayLabel(t) : `${String(hh).padStart(2, '0')}:00` });
    }
  } else if (spanDays <= 12) {
    for (let t = Math.ceil((t0 + TH) / 864e5) * 864e5 - TH; t < t1; t += 864e5) ticks.push({ t, label: dayLabel(t) });
  } else if (spanDays <= 100) {
    const every = spanDays <= 40 ? 7 : 14;
    for (let t = Math.ceil((t0 + TH) / 864e5) * 864e5 - TH; t < t1; t += every * 864e5) ticks.push({ t, label: dayLabel(t) });
  } else {
    const d = new Date(t0 + TH);
    let m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).getTime() - TH;
    while (m < t1) {
      ticks.push({ t: m, label: new Date(m).toLocaleDateString('th-TH', { month: 'short', timeZone: 'Asia/Bangkok' }) });
      const n = new Date(m + TH);
      m = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)).getTime() - TH;
    }
  }

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
        {ticks.map(k => (
          <g key={k.t}>
            <line x1={x(k.t)} x2={x(k.t)} y1={H - B} y2={H - B + 4} stroke="var(--line)" />
            <text x={x(k.t)} y={H - 6} textAnchor="middle">{k.label}</text>
          </g>
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

/* ---------------- หลอดวัดระดับน้ำ เทียบตลิ่ง / คันกั้นน้ำ ---------------- */

/** จัดป้ายไม่ให้ทับกัน: เรียงจากบนลงล่าง แล้วดันลงให้ห่างกันอย่างน้อยตามความสูงป้าย */
function layoutLabels<T extends { y: number; h: number }>(items: T[], minY: number, maxY: number): (T & { ly: number })[] {
  const sorted = items.slice().sort((a, b) => a.y - b.y).map(it => ({ ...it, ly: it.y }));
  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    sorted[i].ly = Math.max(sorted[i].ly, minY, prev ? prev.ly + prev.h : minY);
  }
  // ถ้าล้นขอบล่าง ดันกลับขึ้น
  for (let i = sorted.length - 1; i >= 0; i--) {
    const next = sorted[i + 1];
    const limit = next ? next.ly - sorted[i].h : maxY - sorted[i].h;
    sorted[i].ly = Math.min(sorted[i].ly, limit);
  }
  return sorted;
}

export function StationGauge({ s, distance, selected, onClick, refTime }: {
  s: Station;
  distance?: number;
  selected?: boolean;
  onClick?: () => void;
  /** เวลาที่ดึงข้อมูล (ISO) ใช้ตัดสินว่าค่าที่วัดเก่าเกิน 2 ชม. หรือไม่ */
  refTime?: string;
}) {
  const asOf = refTime ? new Date(refTime).getTime() : undefined;
  const old = !!(s.time && asOf && asOf - new Date(s.time).getTime() > 2 * 3600e3);
  const st = stationStatus(s);
  const color = STATUS[st].color;
  const refs = referenceLevels(s);
  const wl = s.wl;

  // สเกลเป็นเมตรจริง: บนสุด = เส้นอ้างอิง/ผิวน้ำที่สูงที่สุด, ล่างสุด = ต่ำกว่าตลิ่ง/ผิวน้ำ 1.5 ม.
  const W = 190, H = 190, top = 12, bottom = H - 8, tx = 10, tw = 38;
  const vals = [...refs.map(r => r.v), ...(wl !== null ? [wl] : [])].filter(Number.isFinite);
  const hi = (vals.length ? Math.max(...vals) : 1) + 0.25;
  const lo = (vals.length ? Math.min(...vals) : 0) - 1.5;
  const y = (v: number) => top + ((hi - clamp(v, lo, hi)) / (hi - lo)) * (bottom - top);
  const water = wl !== null ? y(wl) : bottom;
  const lx = tx + tw + 14;

  type Item = { key: string; y: number; h: number; node: (ly: number) => React.ReactNode };
  const items: Item[] = refs.map(r => ({
    key: r.key,
    y: y(r.v) + 4,
    h: 17, // ภาษาไทยมีสระบน/วรรณยุกต์ ต้องเว้นมากกว่าขนาดตัวอักษร
    node: (ly: number) => (
      <text x={lx} y={ly} fontSize="11" fill="var(--muted)">
        {r.label} <tspan fontWeight="700" fill={r.key === 'wall' ? r.color : 'var(--text)'}>{fmt(r.v)} ม.</tspan>
      </text>
    ),
  }));
  if (wl !== null) {
    items.push({
      key: 'water',
      y: water + 4,
      h: 30,
      node: (ly: number) => (
        <>
          <text x={lx} y={ly} fontSize="11" fill="var(--muted)">น้ำ <tspan fontWeight="700" fill="var(--text)">{fmt(wl)} ม.</tspan></text>
          <text x={lx} y={ly + 15} fontSize="12" fontWeight="700" fill={color}>{bankGapText(s) ?? ''}</text>
        </>
      ),
    });
  }
  const placed = layoutLabels(items, top + 8, bottom + 6);

  const wall = refs.find(r => r.key === 'wall');
  const aria = [
    `ระดับน้ำ ${fmt(wl)} เมตร`,
    ...refs.map(r => `${r.label} ${fmt(r.v)} เมตร`),
    bankGapText(s) ?? '',
  ].join(' ');

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`gauge${selected ? ' selected' : ''}`} {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': !!selected } : {})}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        <rect x={tx} y={top} width={tw} height={bottom - top} rx="8" fill="var(--bg-alt)" stroke="var(--line)" />
        <clipPath id={`clip-${s.id}`}>
          <rect x={tx} y={top} width={tw} height={bottom - top} rx="8" />
        </clipPath>
        <g clipPath={`url(#clip-${s.id})`}>
          <rect x={tx} y={water} width={tw} height={bottom - water} fill={color} opacity=".85" />
          <path d={`M${tx} ${water} q 4.75 -4 9.5 0 t 9.5 0 t 9.5 0 t 9.5 0`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5" />
        </g>
        {refs.map(r => (
          <line key={r.key} x1={tx - 5} x2={tx + tw + 6} y1={y(r.v)} y2={y(r.v)} stroke={r.color}
            strokeWidth={r.key === 'wall' ? 2.5 : 1.5} strokeDasharray={r.dash} />
        ))}
        {placed.map(p => {
          const lineY = p.key === 'water' ? water : y(refs.find(r => r.key === p.key)!.v);
          const stroke = p.key === 'water' ? color : 'var(--muted)';
          return (
            <g key={p.key}>
              <line x1={tx + tw + 6} x2={lx - 3} y1={lineY} y2={p.ly - 4} stroke={stroke} strokeWidth=".9" />
              {p.node(p.ly)}
            </g>
          );
        })}
      </svg>
      <div className="g-name">{s.name}</div>
      {s.time && (
        <div className={`g-time${old ? ' old' : ''}`}>
          วัดเมื่อ {thDateTime(s.time)}
          {old && <> ({ago(s.time, asOf)})</>}
        </div>
      )}
      <div className="g-sub">{s.river || s.amphoe}{distance !== undefined ? ` · ${fmt(distance, 1)} กม.` : ''}</div>
      <div className="g-val" style={{ color }}>{STATUS[st].label}</div>
      {(() => {
        const lowBank = refs.find(r => r.key === 'bank' && r.side);
        return lowBank && wl !== null && !s.stale ? (
          <div className="g-sub">{wl > lowBank.v ? `น้ำล้นตลิ่งฝั่ง${lowBank.side}แล้ว` : `ถ้าน้ำขึ้น จะล้นฝั่ง${lowBank.side}ก่อน`}</div>
        ) : null;
      })()}
      {wall && wl !== null && (
        <div className="g-sub">
          {wl < wall.v ? `ต่ำกว่าคันกั้นน้ำ${wall.approx ? ' ~' : ' '}${fmt(wall.v - wl)} ม.` : `สูงกว่าคันกั้นน้ำ${wall.approx ? ' ~' : ' '}${fmt(wl - wall.v)} ม.!`}
        </div>
      )}
    </Tag>
  );
}

/* ---------------- ภาพตัดยาวแม่น้ำเจ้าพระยา ---------------- */

export function RiverProfile({ stations, highlight }: { stations: Station[]; highlight?: Set<number> }) {
  const [hover, setHover] = useState<number | null>(null);
  const list = stations;
  if (list.length < 2) return <p className="muted">ไม่มีข้อมูล</p>;
  // ป้ายชื่อสถานีเอียง 45° ยื่นลงล่างและไปทางซ้าย จึงเว้นขอบล่าง/ซ้ายไว้ให้พอ ไม่ให้ถูกตัดหรือทับป้ายต้นน้ำ/ปากแม่น้ำ
  const W = Math.max(640, list.length * 34) + 40, H = 350, L = 90, R = 10, T = 16, B = 170;
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
              <text x={cx} y={H - B + 12} transform={`rotate(-45 ${cx} ${H - B + 12})`} textAnchor="end" style={{ fontSize: 9.5, fill: hl ? 'var(--brand)' : undefined, fontWeight: hl ? 700 : undefined }}>
                {s.prov.replace('พระนครศรีอยุธยา', 'อยุธยา').replace('กรุงเทพมหานคร', 'กทม.')} · {s.name.length > 20 ? s.name.slice(0, 19) + '…' : s.name}
              </text>
            </g>
          );
        })}
        {hover !== null && (() => {
          const s = list[hover];
          const cx = clamp(L + hover * bw + bw / 2, 110, W - 110);
          return (
            <g pointerEvents="none">
              <rect x={cx - 105} y={T} width="210" height="60" rx="6" fill="var(--text)" />
              <text x={cx} y={T + 17} textAnchor="middle" style={{ fill: 'var(--bg)', fontSize: 11, fontWeight: 600 }}>{s.name} ({s.code})</text>
              <text x={cx} y={T + 34} textAnchor="middle" style={{ fill: 'var(--bg)', fontSize: 10.5 }}>
                {s.pct !== null ? `${Math.round(s.pct)}% ของตลิ่ง` : '–'} · น้ำ {fmt(s.wl)} / ตลิ่ง {fmt(s.bank)} ม.
              </text>
              <text x={cx} y={T + 51} textAnchor="middle" style={{ fill: 'var(--bg)', fontSize: 10.5 }}>
                วัดเมื่อ {thShort(s.time)}{s.stale ? ' (ไม่อัปเดต)' : ''}
              </text>
            </g>
          );
        })()}
        <line x1={L} x2={W - R} y1={H - 20} y2={H - 20} stroke="var(--line)" />
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
