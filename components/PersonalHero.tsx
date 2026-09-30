'use client';

import { useEffect, useMemo, useState } from 'react';
import { assessPlace, LEVEL_NAME, LEVEL_TEXT, STATUS, stationStatus } from '@/lib/assess';
import { ago, fmt, thDateTime, thShort } from '@/lib/format';
import type { Graph, HouseOpts, Photo, Place, Situation } from '@/lib/types';
import { LineChart, StationGauge } from './charts';
import { IconPin } from './icons';

interface Props {
  data: Situation;
  place: Place;
  opts: HouseOpts;
  onOpts: (o: HouseOpts) => void;
  onChangePlace: () => void;
  onPhoto: (p: Photo) => void;
}

export default function PersonalHero({ data, place, opts, onOpts, onChangePlace, onPhoto }: Props) {
  const a = useMemo(() => assessPlace(place, opts, data.stations, data.rain, data.overall), [place, opts, data]);
  const txt = LEVEL_TEXT[a.level as 1 | 2 | 3 | 4];
  const top = a.nearest[0]?.s;

  const [graph, setGraph] = useState<{ id: number; g: Graph | null } | null>(null);
  useEffect(() => {
    if (!top) return;
    let alive = true;
    fetch(`/api/graph?id=${top.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(g => alive && setGraph({ id: top.id, g }))
      .catch(() => alive && setGraph({ id: top.id, g: null }));
    return () => { alive = false; };
  }, [top]);
  const g = graph && top && graph.id === top.id ? graph.g : undefined;

  const radar = data.photos.radar[0];
  const maxRain = Math.max(35, ...a.rainNear.map(x => x.r.mm));

  return (
    <section className="hero" id="top">
      <div className="wrap">
        <p className="eyebrow">
          <span>ข้อมูลล่าสุด {thDateTime(data.latest)}</span>
          <span>· อัปเดตอัตโนมัติทุก 10 นาที</span>
        </p>

        <div className="status-card lv" data-level={a.level}>
          <div className="status-level">
            <div className="level-badge"><div><small>{a.level}</small>{LEVEL_NAME[a.level]}</div></div>
            <div className="level-scale" aria-hidden="true">
              {[1, 2, 3, 4].map(l => <span key={l} className={l === a.level ? 'on' : ''} />)}
            </div>
          </div>
          <div className="status-body">
            <div className="status-place">
              <IconPin size={16} /> <b style={{ color: 'var(--text)' }}>{place.name}</b>
              <button type="button" className="btn-link" onClick={onChangePlace}>เปลี่ยนพื้นที่</button>
            </div>
            <h1>{txt.title}</h1>
            <p className="status-summary">{txt.summary}</p>
            <ul className="todo">{a.todo.map(t => <li key={t}>{t}</li>)}</ul>
            <div className="why">
              <h3>ทำไมถึงประเมินแบบนี้</h3>
              <ul className="todo">{a.reasons.map(t => <li key={t}>{t}</li>)}</ul>
              <div style={{ display: 'flex', gap: '4px 16px', flexWrap: 'wrap', marginTop: 10 }}>
                <label className="check"><input type="checkbox" checked={opts.river} onChange={e => onOpts({ ...opts, river: e.target.checked })} /> บ้านริมน้ำ/นอกคันกั้นน้ำ</label>
                <label className="check"><input type="checkbox" checked={opts.low} onChange={e => onOpts({ ...opts, low: e.target.checked })} /> พื้นที่ต่ำ</label>
                <label className="check"><input type="checkbox" checked={opts.oneFloor} onChange={e => onOpts({ ...opts, oneFloor: e.target.checked })} /> บ้านชั้นเดียว</label>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-grid">
          <div className="panel">
            <h3>ระดับน้ำที่สถานีใกล้บ้านคุณ</h3>
            <p className="sub">เทียบกับความสูงตลิ่ง (เส้นประ) ถ้าน้ำเกินเส้นประ แปลว่าน้ำล้นตลิ่งแล้ว</p>
            {a.nearest.length ? (
              <div className="gauges">
                {a.nearest.slice(0, 4).map(({ s, d }) => <StationGauge key={s.id} s={s} distance={d} />)}
              </div>
            ) : (
              <p className="muted">ไม่มีสถานีวัดน้ำที่อัปเดตในรัศมี 25 กม.</p>
            )}
            {top && (
              <>
                <h3 style={{ marginTop: 18 }}>7 วันที่ผ่านมาที่ {top.name}</h3>
                <p className="sub">ระดับน้ำ (ม.รทก.) · อัปเดต {ago(top.time)} · <span style={{ color: STATUS[stationStatus(top)].color }}>{STATUS[stationStatus(top)].label}</span></p>
                {g === undefined ? (
                  <div className="skeleton" style={{ minHeight: 180 }} />
                ) : g ? (
                  <LineChart
                    points={g.points}
                    field="v"
                    unit="ม.รทก."
                    height={190}
                    refs={g.bank !== null ? [{ v: g.bank, label: `ตลิ่ง ${fmt(g.bank)}`, color: 'var(--l4)' }] : []}
                  />
                ) : (
                  <p className="muted">โหลดกราฟไม่สำเร็จ</p>
                )}
              </>
            )}
          </div>

          <div className="panel">
            <h3>ฝนรอบบ้านคุณ (24 ชม.)</h3>
            <p className="sub">สถานีวัดฝนในรัศมี 15 กม. · 35+ มม. น้ำเริ่มขังถนน · 90+ มม. ท่วมขังหลายจุด</p>
            {a.rainNear.length ? (
              <div className="rainbars">
                {a.rainNear.map(({ r, d }) => (
                  <div className="rainbar" key={`${r.name}-${r.lat}`}>
                    <span className="nm" title={r.name}>{r.name} <small className="muted">{fmt(d, 1)} กม.</small></span>
                    <span className="track"><i style={{ width: `${Math.max(2, (r.mm / maxRain) * 100)}%` }} /></span>
                    <b>{fmt(r.mm, 1)} มม.</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">ไม่มีรายงานฝนในรัศมี 15 กม.</p>
            )}

            {radar && (
              <>
                <h3 style={{ marginTop: 18 }}>ภาพเรดาร์ฝนล่าสุด</h3>
                <p className="sub">{radar.title} · {thShort(radar.time)} · จุดสีเขียว–แดงคือกลุ่มฝน</p>
                <button type="button" className="photo" style={{ width: '100%' }} onClick={() => onPhoto(radar)}>
                  <div className="ph-img" style={{ aspectRatio: '6 / 5' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- ภาพจาก ThaiWater เปลี่ยนทุก 5 นาที ไม่ต้องผ่าน image optimizer */}
                    <img src={radar.url} alt={`${radar.title} เวลา ${thShort(radar.time)}`} loading="lazy" />
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
