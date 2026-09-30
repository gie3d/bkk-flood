'use client';

import { useState } from 'react';
import LeafletMap from './LeafletMap';
import { DISTRICTS, districtPlace, nearestDistrict } from '@/lib/districts';
import type { HouseOpts, Place } from '@/lib/types';
import { IconPin, IconTarget } from './icons';

interface Props {
  opts: HouseOpts;
  onOpts: (o: HouseOpts) => void;
  onPlace: (p: Place) => void;
  onSkip?: () => void;
  onCancel?: () => void;
}

export function placeFromLatLng(lat: number, lng: number, fallback: string): Place {
  const nd = nearestDistrict(lat, lng);
  return { name: nd && nd.d < 8 ? `ใกล้${nd.name}` : fallback, lat, lng };
}

export default function LocationGate({ opts, onOpts, onPlace, onSkip, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const useGps = () => {
    if (!navigator.geolocation) {
      setErr('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง กรุณาเลือกเขตจากรายการ');
      return;
    }
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBusy(false);
        onPlace(placeFromLatLng(pos.coords.latitude, pos.coords.longitude, 'ตำแหน่งปัจจุบันของคุณ'));
      },
      e => {
        setBusy(false);
        setErr(e.code === e.PERMISSION_DENIED
          ? 'คุณไม่ได้อนุญาตให้เข้าถึงตำแหน่ง กรุณาเลือกเขตจากรายการ หรือแตะบนแผนที่แทน'
          : 'ไม่สามารถระบุตำแหน่งได้ กรุณาเลือกเขตจากรายการแทน');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  return (
    <section className="gate" id="top">
      <svg className="gate-waves" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C 150 20 300 100 450 60 S 750 20 900 60 S 1100 100 1200 60 V120 H0Z" fill="currentColor" />
        <path d="M0 85 C 200 55 350 115 600 85 S 1000 55 1200 85 V120 H0Z" fill="currentColor" />
      </svg>
      <div className="wrap gate-grid">
        <div className="gate-card">
          <div>
            <span className="kicker"><IconPin size={14} /> ขั้นแรก บอกเราว่าบ้านคุณอยู่ที่ไหน</span>
            <h1>น้ำจะท่วมบ้านคุณไหม?</h1>
            <p className="muted" style={{ margin: 0 }}>
              เราจะดูระดับน้ำจากสถานีวัดน้ำที่ใกล้บ้านคุณที่สุด ฝนที่ตกรอบบ้าน และน้ำเหนือที่กำลังไหลลงมา
              แล้วบอกว่าคุณควร <b>ใช้ชีวิตตามปกติ</b> หรือ <b>ต้องเริ่มเตรียมตัว</b>
            </p>
          </div>

          <button type="button" className="btn btn-primary" onClick={useGps} disabled={busy}>
            <IconTarget size={18} /> {busy ? 'กำลังระบุตำแหน่ง…' : 'ใช้ตำแหน่งปัจจุบันของฉัน'}
          </button>
          {err && <p className="banner" role="alert" style={{ margin: 0 }}>{err}</p>}

          <div className="or"><span>หรือเลือกเขต / อำเภอ</span></div>
          <label className="field">
            <span className="sr-only">เขต / อำเภอ</span>
            <select
              defaultValue=""
              onChange={e => {
                const p = e.target.value && districtPlace(e.target.value);
                if (p) onPlace(p);
              }}
            >
              <option value="">— เลือกพื้นที่ —</option>
              {DISTRICTS.map((g, gi) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((d, di) => <option key={d[0]} value={`${gi}:${di}`}>{d[0]}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <fieldset className="field">
            <legend>บ้านของคุณเป็นแบบไหน (ไม่บังคับ)</legend>
            <label className="check"><input type="checkbox" checked={opts.river} onChange={e => onOpts({ ...opts, river: e.target.checked })} /> อยู่ริมแม่น้ำ/คลอง หรือนอกแนวคันกั้นน้ำ</label>
            <label className="check"><input type="checkbox" checked={opts.low} onChange={e => onOpts({ ...opts, low: e.target.checked })} /> พื้นที่ต่ำ เคยมีน้ำท่วมขังบ่อยเวลาฝนตก</label>
            <label className="check"><input type="checkbox" checked={opts.oneFloor} onChange={e => onOpts({ ...opts, oneFloor: e.target.checked })} /> เป็นบ้านชั้นเดียว / อยู่ชั้นล่าง</label>
          </fieldset>

          <p className="hint" style={{ margin: 0 }}>
            ตำแหน่งของคุณใช้คำนวณในเครื่องนี้เท่านั้น ไม่ถูกส่งหรือบันทึกไว้ที่อื่น
            {onSkip && <> · <button type="button" className="btn-link" onClick={onSkip}>ข้ามไปดูภาพรวมกรุงเทพฯ</button></>}
            {onCancel && <> · <button type="button" className="btn-link" onClick={onCancel}>ยกเลิก</button></>}
          </p>
        </div>

        <div className="gate-map">
          <span className="map-hint">แตะบนแผนที่เพื่อเลือกตำแหน่งบ้าน</span>
          <LeafletMap
            className="mapbox"
            zoom={10}
            center={[13.78, 100.55]}
            label="แผนที่สำหรับเลือกตำแหน่งบ้าน"
            onPick={(lat, lng) => onPlace(placeFromLatLng(lat, lng, 'ตำแหน่งที่เลือกบนแผนที่'))}
          />
        </div>
      </div>
      <ol className="wrap gate-steps" style={{ position: 'relative' }}>
        <li><b>1</b>บอกตำแหน่งบ้าน</li>
        <li><b>2</b>เราดูสถานีวัดน้ำ ฝน และน้ำเหนือใกล้คุณ</li>
        <li><b>3</b>ได้คำแนะนำว่าควรทำอะไร</li>
      </ol>
    </section>
  );
}
