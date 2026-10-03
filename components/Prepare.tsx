'use client';

import { useEffect, useState } from 'react';
import type { Level, Threat } from '@/lib/types';
import {
  IconAlert, IconBattery, IconBottle, IconBox, IconCar, IconDoc, IconEye, IconFood, IconPill, IconRadio, IconShield, IconTorch,
} from './icons';

const PREP: { level: 1 | 2 | 3 | 4; title: string; when: string; icon: React.ReactNode; items: string[] }[] = [
  { level: 1, title: 'ปกติ', when: 'ใช้ชีวิตตามปกติ', icon: <IconShield />, items: [
    'บันทึกเบอร์ฉุกเฉิน 1784, 1555 ไว้ในโทรศัพท์',
    'รู้ว่าบ้านอยู่ในหรือนอกแนวคันกั้นน้ำ',
    'สแกน/ถ่ายรูปเอกสารสำคัญเก็บในคลาวด์',
  ] },
  { level: 2, title: 'เฝ้าระวัง', when: 'ยังไม่ต้องขนของ ติดตามทุกวัน', icon: <IconEye />, items: [
    'ตรวจท่อระบายน้ำหน้าบ้านไม่ให้อุดตัน',
    'SANDBAG',
    'วางแผนว่าจะยกของอะไรขึ้นไว้ที่ไหน',
    'เช็กยารักษาโรคประจำตัวให้พอใช้ 2 สัปดาห์',
  ] },
  { level: 3, title: 'เตรียมพร้อม', when: 'ยกของขึ้นที่สูง', icon: <IconBox />, items: [
    'ยกเอกสาร ของมีค่า เครื่องใช้ไฟฟ้าขึ้นที่สูง/ชั้น 2',
    'ย้ายรถไปจอดที่สูง',
    'ตุนน้ำดื่ม อาหารแห้ง ไฟฉาย พาวเวอร์แบงก์ 3–7 วัน',
    'ใส่เอกสารสำคัญในถุงกันน้ำ',
    'หาที่พักสำรอง (ญาติ/เพื่อน/โรงแรม)',
  ] },
  { level: 4, title: 'อันตราย', when: 'ขนของขึ้นชั้นบน เตรียมอพยพ', icon: <IconAlert />, items: [
    'ขนของทั้งหมดขึ้นชั้นบน',
    'ตัดสะพานไฟชั้นล่าง ปิดแก๊ส',
    'อพยพเด็ก ผู้สูงอายุ ผู้ป่วย สัตว์เลี้ยงก่อน',
    'ระวังไฟดูด สัตว์มีพิษ ห้ามเดินลุยน้ำไหลแรง',
  ] },
];

const KIT: [React.ReactNode, string][] = [
  [<IconBottle key="b" />, 'น้ำดื่ม 3 ลิตร/คน/วัน'],
  [<IconFood key="f" />, 'อาหารแห้ง พร้อมทาน'],
  [<IconPill key="p" />, 'ยาประจำตัว ชุดปฐมพยาบาล'],
  [<IconTorch key="t" />, 'ไฟฉาย ถ่านสำรอง'],
  [<IconBattery key="bt" />, 'พาวเวอร์แบงก์'],
  [<IconDoc key="d" />, 'เอกสารในถุงกันน้ำ'],
  [<IconRadio key="r" />, 'วิทยุ นกหวีด'],
  [<IconCar key="c" />, 'ย้ายรถไปที่สูง'],
];

/** กระสอบทรายช่วยกับน้ำฝนบนถนน แต่กันน้ำเหนือที่ล้นทั้งระบบไม่ได้ */
const SANDBAG: Record<Threat | 'none', string> = {
  none: 'เตรียมกระสอบทราย/แผ่นกั้นน้ำหน้าประตู (ได้ผลกับน้ำฝนบนถนน)',
  rain: 'วางกระสอบทราย/แผ่นกั้นน้ำหน้าประตู กันน้ำฝนบนถนนและคลื่นจากรถ',
  north: 'ไม่ต้องเสียเวลากั้นกระสอบทราย น้ำเหนือซึมขึ้นทางท่อและพื้น วางแผนยกของขึ้นที่สูงแทน',
};

const KEY = 'bkkflood.prep';

export default function Prepare({ level, threat = 'none' }: { level: Level; threat?: Threat | 'none' }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้เฉพาะหลัง mount
      setDone(JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch { /* ไม่มีสิทธิ์เข้าถึง storage */ }
  }, []);
  const toggle = (id: string, v: boolean) => {
    const next = { ...done, [id]: v };
    setDone(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <>
      <div className="prep">
        {PREP.map(p => {
          const n = p.items.filter((_, i) => done[`p${p.level}-${i}`]).length;
          return (
            <div key={p.level} className={`prep-col lv${p.level === level ? ' current' : ''}`} data-level={p.level}>
              <h3><span className="icon">{p.icon}</span>ระดับ {p.level}: {p.title}{p.level === level && <span className="now">ตอนนี้</span>}</h3>
              <p className="when">{p.when} · ทำแล้ว {n}/{p.items.length}</p>
              <div className="progress"><i style={{ width: `${(n / p.items.length) * 100}%` }} /></div>
              <ul>
                {p.items.map((raw, i) => {
                  const id = `p${p.level}-${i}`;
                  const it = raw === 'SANDBAG' ? SANDBAG[threat] : raw;
                  return (
                    <li key={id}>
                      <label className="check"><input type="checkbox" checked={!!done[id]} onChange={e => toggle(id, e.target.checked)} /> {it}</label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="grid-2 threat-prep">
        <div className={`panel${threat === 'rain' ? ' current' : ''}`}>
          <h3>ถ้าเป็นน้ำฝน/น้ำรอระบาย{threat === 'rain' && <span className="now">ตอนนี้</span>}</h3>
          <p className="sub">ฝนตกเกินกว่าท่อระบายรับไหว (ราว 60 มม./ชม.) น้ำขังบนถนนและในซอย</p>
          <ul className="todo">
            <li>กระสอบทราย/แผ่นกั้นหน้าประตูช่วยได้จริง โดยเฉพาะบ้านติดถนนที่โดนคลื่นจากรถ</li>
            <li>เก็บขยะ ใบไม้ ที่อุดท่อระบายหน้าบ้าน</li>
            <li>ฝนหยุดแล้วน้ำอาจยังไม่ลด เพราะคลองใหญ่ยังเต็ม อาจลดเพียงวันละ 0.5–1 ซม. เตรียมของใช้ไว้หลายวัน</li>
          </ul>
        </div>
        <div className={`panel${threat === 'north' ? ' current' : ''}`}>
          <h3>ถ้าเป็นน้ำเหนือ{threat === 'north' && <span className="now">ตอนนี้</span>}</h3>
          <p className="sub">แม่น้ำเจ้าพระยาล้นตลิ่งหรือคันกั้นน้ำ แบบปี 2554</p>
          <ul className="todo">
            <li>กระสอบทรายแทบไม่ช่วย น้ำมาทุกทาง ล้นคลอง ย้อนท่อ ซึมขึ้นพื้น</li>
            <li>ยกของขึ้นที่สูง/ชั้น 2 ย้ายรถ และวางแผนที่พักสำรองแทน</li>
            <li>ดูตัวเลขที่ C.2 และ C.13: ต่ำกว่า 3,000 ลบ.ม./วินาที กรุงเทพฯ โดยรวมยังไม่ท่วม แต่เกิน 2,000 บ้านริมน้ำนอกคันกั้นน้ำควรขนของ</li>
          </ul>
        </div>
      </div>

      <h3 className="subhead">ถุงยังชีพที่ควรมีติดบ้าน</h3>
      <div className="kit">
        {KIT.map(([icon, label]) => <div className="kit-item" key={label}>{icon}{label}</div>)}
      </div>
    </>
  );
}
