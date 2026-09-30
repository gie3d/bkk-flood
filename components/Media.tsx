/* eslint-disable @next/next/no-img-element -- ภาพสดจาก ThaiWater/EGAT เปลี่ยนตลอดเวลา แสดงตรงโดยไม่ผ่าน image optimizer */
'use client';

import { useEffect, useState } from 'react';
import { fmt, thDate, thDay, thShort } from '@/lib/format';
import type { Dam, Photo, Situation } from '@/lib/types';
import { Donut } from './charts';
import SafeImg from './SafeImg';

export function Lightbox({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [photo, onClose]);
  if (!photo) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.title} onClick={onClose}>
      <button type="button" className="close" aria-label="ปิด" onClick={onClose}>×</button>
      <figure onClick={e => e.stopPropagation()}>
        <SafeImg src={photo.url} alt={photo.title} loading="eager" />
        <figcaption>
          <b>{photo.title}</b> · {photo.caption}
          {photo.time && <> · {thShort(photo.time)}</>} · ที่มา: {photo.source}
        </figcaption>
      </figure>
    </div>
  );
}

function PhotoCard({ p, onOpen, meta }: { p: Photo; onOpen: (p: Photo) => void; meta?: string }) {
  return (
    <button type="button" className="photo" onClick={() => onOpen(p)}>
      <div className="ph-img"><SafeImg src={p.thumb} alt={p.title} /></div>
      <div className="ph-body">
        <div className="ph-title">{p.title}</div>
        <div className="ph-meta">{meta ?? (p.time ? thShort(p.time) : '')} · {p.source}</div>
      </div>
    </button>
  );
}

type Tab = 'radar' | 'forecast' | 'region' | 'storm';

export function PhotoGallery({ data, onOpen }: { data: Situation; onOpen: (p: Photo) => void }) {
  const { radar, forecast, forecastRegion, storm } = data.photos;
  const [tab, setTab] = useState<Tab>('radar');
  const [day, setDay] = useState(0);
  const tabs: { k: Tab; label: string; n: number }[] = [
    { k: 'radar', label: 'เรดาร์ฝนตอนนี้', n: radar.length },
    { k: 'forecast', label: 'คาดการณ์ฝน 3 วัน', n: forecast.length },
    { k: 'region', label: 'คาดการณ์ 7 วัน (ภูมิภาค)', n: forecastRegion.length },
    { k: 'storm', label: 'พายุ', n: storm.length },
  ];
  const series = tab === 'forecast' ? forecast : forecastRegion;
  const cur = series[Math.min(day, series.length - 1)];

  if (!tabs.some(t => t.n)) return <p className="muted">ไม่สามารถโหลดภาพได้ในขณะนี้</p>;

  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.filter(t => t.n).map(t => (
          <button key={t.k} type="button" role="tab" className="chip" aria-selected={tab === t.k} onClick={() => { setTab(t.k); setDay(0); }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'radar' && (
        <>
          <p className="lead">ภาพเรดาร์ตรวจอากาศล่าสุด จุดสีเขียว เหลือง แดง คือกลุ่มฝน ยิ่งแดงยิ่งตกหนัก แตะที่ภาพเพื่อขยาย</p>
          <div className="photos">{radar.map(p => <PhotoCard key={p.id} p={p} onOpen={onOpen} />)}</div>
        </>
      )}

      {(tab === 'forecast' || tab === 'region') && cur && (
        <div className="feature">
          <div className="big">
            <SafeImg key={cur.id} src={cur.url} alt={cur.title} onClick={() => onOpen(cur)} loading="eager" />
            <div className="cap">{cur.caption}</div>
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem' }}>{tab === 'forecast' ? 'ฝนจะตกไหมใน 3 วันข้างหน้า' : 'แนวโน้มฝน 7 วันทั้งภูมิภาค'}</h3>
            <p className="lead">
              สีฟ้าอ่อนคือฝนเล็กน้อย สีเขียวถึงเหลืองคือฝนปานกลางถึงหนัก สีส้มแดงคือฝนหนักมาก
              ถ้าเห็นสีเข้มบริเวณภาคเหนือและภาคกลางตอนบนหลายวันติดกัน น้ำเหนือจะเพิ่มขึ้นในอีก 1–2 สัปดาห์
            </p>
            <div className="slider" role="group" aria-label="เลือกวัน">
              {series.map((p, i) => (
                <button key={p.id} type="button" className="chip" aria-pressed={i === day} onClick={() => setDay(i)}>
                  {i === 0 ? 'วันนี้' : thDay(p.time)}
                </button>
              ))}
            </div>
            <p className="hint">แบบจำลองจากสถาบันสารสนเทศทรัพยากรน้ำ (สสน.) · คำนวณเมื่อ {thDate(series[0]?.time)}</p>
          </div>
        </div>
      )}

      {tab === 'storm' && (
        <>
          <p className="lead">ติดตามพายุที่อาจเคลื่อนเข้าไทย พายุที่ขึ้นฝั่งเวียดนามหรือลาวมักทำให้ฝนตกหนักทางภาคเหนือและอีสาน แล้วน้ำจะไหลลงเจ้าพระยาตามมา</p>
          <div className="photos">{storm.map(p => <PhotoCard key={p.id} p={p} onOpen={onOpen} />)}</div>
        </>
      )}
    </>
  );
}

function DamCard({ d, onOpen }: { d: Dam; onOpen: (p: Photo) => void }) {
  const pct = d.storagePct ?? 0;
  const lvl = pct >= 100 ? 4 : pct >= 85 ? 3 : pct >= 70 ? 2 : 1;
  const [broken, setBroken] = useState(false);
  const photo: Photo | null = d.cctv
    ? { id: d.nameEn, title: `กล้อง CCTV เขื่อน${d.name}`, caption: 'ภาพจากกล้องของ กฟผ.', url: d.cctv, thumb: d.cctv, time: null, source: 'กฟผ. (EGAT)' }
    : null;
  return (
    <div className="dam lv" data-level={lvl}>
      {photo && !broken ? (
        <button type="button" className="dam-photo" style={{ border: 0, padding: 0, cursor: 'zoom-in' }} onClick={() => onOpen(photo)}>
          <img src={photo.url} alt={`ภาพสดเขื่อน${d.name}`} loading="lazy" onError={() => setBroken(true)} />
          <span className="live">ภาพสด</span>
        </button>
      ) : (
        <div className="dam-photo noimg" aria-hidden="true">
          <svg viewBox="0 0 120 60" width="140">
            <path d="M10 50 L40 12 H80 L110 50Z" fill="#1f3a55" />
            <path d="M0 50 Q 15 44 30 50 T 60 50 T 90 50 T 120 50 V60 H0Z" fill="#2f8fd6" />
          </svg>
        </div>
      )}
      <div className="dam-body">
        <Donut pct={pct} color={`var(--l${lvl})`} />
        <div>
          <h4>เขื่อน{d.name}</h4>
          <div className="row"><span>น้ำในเขื่อน</span><span>{fmt(d.storage, 0)} / {fmt(d.maxStorage, 0)} ล้าน ลบ.ม.</span></div>
          <div className="row"><span>ไหลเข้า</span><span>{fmt(d.inflow, 1)} ล้าน ลบ.ม./วัน</span></div>
          <div className="row"><span>ระบายออก</span><span>{fmt(d.released, 1)} ล้าน ลบ.ม./วัน</span></div>
          <div className="row"><span>{pct >= 100 ? 'เกินความจุ ต้องระบายน้ำ' : pct >= 85 ? 'ค่อนข้างเต็ม' : 'ยังรับน้ำได้อีก'}</span><span>{thDate(`${d.date}T00:00:00+07:00`)}</span></div>
        </div>
      </div>
    </div>
  );
}

export function Dams({ dams, onOpen }: { dams: Dam[]; onOpen: (p: Photo) => void }) {
  if (!dams.length) return <p className="muted">ไม่สามารถโหลดข้อมูลเขื่อนได้</p>;
  return (
    <>
      <div className="dams">{dams.map(d => <DamCard key={d.name} d={d} onOpen={onOpen} />)}</div>
      <p className="hint">ภูมิพล สิริกิติ์ แควน้อย และป่าสัก คือเขื่อนหลักที่ช่วยเก็บน้ำเหนือไว้ ถ้ายังรับน้ำได้อีกมาก โอกาสเกิดน้ำท่วมใหญ่แบบปี 2554 จะต่ำลง (ศรีนครินทร์ และวชิราลงกรณ อยู่ลุ่มแม่กลอง)</p>
    </>
  );
}
