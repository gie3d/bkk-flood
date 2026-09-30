'use client';

import { useEffect, useState } from 'react';
import type { Level } from '@/lib/types';
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
    'เตรียมกระสอบทราย/แผ่นกั้นน้ำหน้าประตู',
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

const KEY = 'bkkflood.prep';

export default function Prepare({ level }: { level: Level }) {
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
                {p.items.map((it, i) => {
                  const id = `p${p.level}-${i}`;
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
      <h3 className="subhead">ถุงยังชีพที่ควรมีติดบ้าน</h3>
      <div className="kit">
        {KIT.map(([icon, label]) => <div className="kit-item" key={label}>{icon}{label}</div>)}
      </div>
    </>
  );
}
