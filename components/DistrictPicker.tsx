'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { DISTRICTS, districtPlace } from '@/lib/districts';
import type { Place } from '@/lib/types';

interface Option {
  key: string;
  name: string;
  group: string;
}

const ALL: Option[] = DISTRICTS.flatMap((g, gi) => g.items.map(([name], di) => ({ key: `${gi}:${di}`, name, group: g.group })));

/** ตัดคำนำหน้าและช่องว่าง เพื่อให้พิมพ์ "เขตบางซื่อ" หรือ "อ. ปากเกร็ด" ก็เจอ */
const normalize = (s: string) =>
  s.trim().replace(/^(เขต|อำเภอ|อ\.)\s*/, '').replace(/\s+/g, '').toLowerCase();

function search(q: string): Option[] {
  const n = normalize(q);
  if (!n) return ALL;
  const starts: Option[] = [];
  const contains: Option[] = [];
  const byGroup: Option[] = [];
  for (const o of ALL) {
    const name = normalize(o.name);
    if (name.startsWith(n)) starts.push(o);
    else if (name.includes(n)) contains.push(o);
    else if (normalize(o.group).includes(n)) byGroup.push(o);
  }
  return [...starts, ...contains, ...byGroup];
}

export default function DistrictPicker({ onPick }: { onPick: (p: Place) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => search(q), [q]);

  const choose = (o: Option) => {
    const p = districtPlace(o.key);
    if (!p) return;
    setQ(o.name);
    setOpen(false);
    onPick(p);
  };

  const move = (next: number) => {
    const i = Math.max(0, Math.min(results.length - 1, next));
    setActive(i);
    listRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else move(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(active - 1);
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // แสดงหัวกลุ่ม (จังหวัด) เฉพาะตอนยังไม่ได้พิมพ์ค้นหา
  const showGroups = !normalize(q);

  return (
    <div className="picker">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
        aria-label="ค้นหาเขตหรืออำเภอ"
        placeholder="พิมพ์ชื่อเขต/อำเภอ เช่น บางซื่อ, ปากเกร็ด"
        value={q}
        autoComplete="off"
        onChange={e => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKey}
      />
      {open && (
        <ul className="picker-list" id={listId} role="listbox" ref={listRef}>
          {results.length ? (
            results.map((o, i) => (
              <li key={o.key} role="presentation">
                {showGroups && (i === 0 || results[i - 1].group !== o.group) && <div className="picker-group">{o.group}</div>}
                <div
                  id={`${id}-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  className="picker-opt"
                  // ใช้ mousedown เพื่อให้เลือกได้ก่อนที่ช่องค้นหาจะเสีย focus
                  onMouseDown={e => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span>{o.group === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.'}{o.name}</span>
                  {!showGroups && <small>{o.group}</small>}
                </div>
              </li>
            ))
          ) : (
            <li className="picker-empty" role="presentation">
              ไม่พบ &ldquo;{q}&rdquo; ลองใช้ตำแหน่งปัจจุบัน หรือแตะบนแผนที่แทน
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
