'use client';

import { useMemo, useState } from 'react';
import { assessPlace, LEVEL_NAME, LEVEL_TEXT } from '@/lib/assess';
import { ago, fmt, thDateTime, thShort } from '@/lib/format';
import type { HouseOpts, Photo, Place, Situation, Station } from '@/lib/types';
import { StationGauge } from './charts';
import StationHistory from './StationHistory';
import { referenceLevels } from '@/lib/barriers';
import { IconPin } from './icons';

interface Props {
  data: Situation;
  place: Place;
  opts: HouseOpts;
  onOpts: (o: HouseOpts) => void;
  onChangePlace: () => void;
  onPhoto: (p: Photo) => void;
  onStation: (s: Station) => void;
}

export default function PersonalHero({ data, place, opts, onOpts, onChangePlace, onPhoto, onStation }: Props) {
  const a = useMemo(() => assessPlace(place, opts, data.stations, data.rain, data.overall), [place, opts, data]);
  const txt = LEVEL_TEXT[a.level as 1 | 2 | 3 | 4];
  const [picked, setPicked] = useState<number | null>(null);
  const selected = a.nearest.find(x => x.s.id === picked)?.s ?? a.nearest[0]?.s;

  const kinds = new Set(a.nearest.slice(0, 4).flatMap(x => referenceLevels(x.s).map(r => r.key)));
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
            <p className="sub">ความสูงเป็นเมตรเหนือระดับน้ำทะเลปานกลาง (ม.รทก.) เทียบกับระดับที่น้ำจะเริ่มล้น</p>
            <ul className="ref-legend">
              <li><i style={{ borderTop: '2px dashed var(--text)' }} /><b>ตลิ่ง</b> ขอบลำน้ำ ถ้าสองฝั่งสูงไม่เท่ากัน จะแสดงทั้งคู่พร้อมทิศ (เช่น ฝั่งตะวันออก) น้ำจะล้นฝั่งที่ต่ำกว่าก่อน</li>
              {kinds.has('wall') && <li><i style={{ borderTop: '3px solid var(--l3)' }} /><b>คันกั้นน้ำ</b> แนวป้องกันที่สร้างสูงกว่าตลิ่ง บ้านหลังคันกั้นน้ำยังปลอดภัยแม้น้ำล้นตลิ่ง จนกว่าน้ำจะสูงเกินคัน (≈ คือค่าประมาณ)</li>}
              {kinds.has('critical') && <li><i style={{ borderTop: '2px dotted var(--l4)' }} /><b>ระดับวิกฤต</b> เกณฑ์ของกรมชลประทาน (มีเฉพาะบางสถานี)</li>}
            </ul>
            {a.nearest.length ? (
              <div className="gauges">
                {a.nearest.slice(0, 4).map(({ s, d }) => (
                  <StationGauge key={s.id} s={s} distance={d} selected={s.id === selected?.id} onClick={() => setPicked(s.id)} refTime={data.fetchedAt} />
                ))}
              </div>
            ) : (
              <p className="muted">ไม่มีสถานีวัดน้ำที่อัปเดตในรัศมี 25 กม.</p>
            )}
            {selected && (
              <>
                <div className="history-title">
                  <div>
                    <h3>ข้อมูลย้อนหลัง: {selected.name}</h3>
                    <p className="sub" style={{ margin: 0 }}>แตะที่หลอดด้านบนเพื่อดูสถานีอื่น · อัปเดต {ago(selected.time)}</p>
                  </div>
                  <button type="button" className="btn-link" onClick={() => onStation(selected)}>ขยายเต็มจอ</button>
                </div>
                <StationHistory key={selected.id} station={selected} />
              </>
            )}
          </div>

          <div className="panel">
            <h3>ฝนรอบบ้านคุณ (24 ชม.)</h3>
            <p className="sub">สถานีวัดฝนในรัศมี 15 กม. · 35+ มม. น้ำเริ่มขังถนน · 90+ มม. ท่วมขังหลายจุด</p>
            {a.rainNear.some(x => x.r.mm >= 0.1) ? (
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
              <p className="muted">
                {a.rainNear.length
                  ? `ไม่มีฝนตกใน 24 ชม. ที่ผ่านมา (${a.rainNear.length} สถานีวัดฝนในรัศมี 15 กม. วัดได้ 0 มม.)`
                  : 'ไม่มีสถานีวัดฝนในรัศมี 15 กม.'}
              </p>
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
