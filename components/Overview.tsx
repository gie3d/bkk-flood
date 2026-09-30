'use client';

import { useMemo } from 'react';
import { BKK_FLOODWALL_MSL, KEY, LEVEL_NAME, LEVEL_TEXT, METRO, STATUS, stationStatus } from '@/lib/assess';
import { distKm, fmt, fmtInt } from '@/lib/format';
import type { Level, Place, Situation, Station, StationStatus } from '@/lib/types';
import { LineChart, RiverProfile } from './charts';

function pctLevel(p: number | null): Level {
  if (p === null) return 0;
  return p > 100 ? 4 : p >= 90 ? 3 : p >= 70 ? 2 : 1;
}

/** เส้นทางน้ำเหนือ → กรุงเทพฯ */
function Journey({ data }: { data: Situation }) {
  const by = new Map(data.stations.map(s => [s.code, s]));
  const get = (c: string) => {
    const s = by.get(c);
    return s && !s.stale ? s : undefined;
  };
  const c2 = get(KEY.nakhonSawan), c13 = get(KEY.chaoPhrayaDam), ay = get(KEY.ayutthaya), bp = get(KEY.bangPaIn), non = get(KEY.nonthaburi), ss = get(KEY.samSen);
  const ind = (k: string) => data.overall.indicators.find(i => i.key === k);

  const nodes: { name: string; sub: string; value: string; unit: string; level: Level; time: string }[] = [
    { name: 'นครสวรรค์', sub: 'ปิง วัง ยม น่าน รวมกัน', value: c2?.discharge != null ? fmtInt(c2.discharge) : '–', unit: 'ลบ.ม./วิ', level: ind('c2')?.level ?? 0, time: 'ต้นทาง' },
    { name: 'เขื่อนเจ้าพระยา', sub: 'ชัยนาท ควบคุมน้ำลงใต้', value: c13?.discharge != null ? fmtInt(c13.discharge) : '–', unit: 'ลบ.ม./วิ', level: ind('c13')?.level ?? 0, time: '~1 วัน' },
    { name: 'อยุธยา', sub: ay ? ay.name : 'บ้านป้อม', value: ay?.pct != null ? `${Math.round(ay.pct)}%` : '–', unit: 'ของตลิ่ง', level: pctLevel(ay?.pct ?? null), time: '~2 วัน' },
    { name: 'บางปะอิน', sub: bp ? bp.name : '', value: bp?.pct != null ? `${Math.round(bp.pct)}%` : '–', unit: 'ของตลิ่ง', level: pctLevel(bp?.pct ?? null), time: '~2–3 วัน' },
    { name: 'นนทบุรี', sub: non ? non.name : '', value: non?.pct != null ? `${Math.round(non.pct)}%` : '–', unit: 'ของตลิ่ง', level: ind('non')?.level ?? 0, time: '~3 วัน' },
    { name: 'กรุงเทพฯ', sub: 'สามเสน เทียบคันกั้นน้ำ', value: ss?.wl != null ? fmt(ss.wl) : '–', unit: `/ ${BKK_FLOODWALL_MSL.toFixed(2)} ม.`, level: ind('bkk')?.level ?? 0, time: '~3–5 วัน' },
    { name: 'อ่าวไทย', sub: 'น้ำทะเลหนุนสูง ต.ค.–พ.ย. ทำให้น้ำระบายช้า', value: '≈', unit: 'ทะเล', level: 0, time: 'ปลายทาง' },
  ];

  return (
    <div className="journey" role="list" aria-label="เส้นทางน้ำเหนือไหลสู่กรุงเทพฯ">
      {nodes.map(n => (
        <div className="jn lv" data-level={n.level} key={n.name} role="listitem">
          <div className="jn-dot" style={n.level === 0 ? { borderColor: 'var(--water)', color: 'var(--water)' } : undefined}>
            <div>{n.value}<small>{n.unit}</small></div>
          </div>
          <div className="jn-text">
            <span className="jn-name">{n.name}</span>
            <span className="jn-sub">{n.sub}</span>
            <span className="jn-time">{n.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Distribution({ stations, title }: { stations: Station[]; title: string }) {
  const keys: StationStatus[] = ['over', 'near', 'high', 'ok', 'stale'];
  const counts = keys.map(k => ({ k, n: stations.filter(s => stationStatus(s) === k).length }));
  const total = stations.length || 1;
  return (
    <div>
      <h4 style={{ fontSize: '.95rem', marginBottom: 6 }}>{title} <span className="muted" style={{ fontWeight: 400 }}>({stations.length} สถานี)</span></h4>
      <div className="dist" role="img" aria-label={counts.map(c => `${STATUS[c.k].label} ${c.n}`).join(', ')}>
        {counts.filter(c => c.n).map(c => <i key={c.k} style={{ width: `${(c.n / total) * 100}%`, background: STATUS[c.k].color }} title={`${STATUS[c.k].label} ${c.n}`} />)}
      </div>
      <div className="dist-legend">
        {counts.map(c => <span key={c.k}><i className="dot" style={{ background: STATUS[c.k].color }} />{STATUS[c.k].label} <b>{c.n}</b></span>)}
      </div>
    </div>
  );
}

export default function Overview({ data, place }: { data: Situation; place: Place | null }) {
  const o = data.overall;
  const txt = o.level ? LEVEL_TEXT[o.level as 1 | 2 | 3 | 4] : null;
  const g = data.graphs;

  const profile = useMemo(() => {
    const list = data.stations.filter(s => /เจ้าพระยา/.test(s.river) && s.lat < 16 && s.pct !== null).sort((a, b) => b.lat - a.lat);
    // ตัดสถานีซ้ำที่อยู่ใกล้กันมาก (<1.5 กม.)
    const out: Station[] = [];
    for (const s of list) if (!out.some(x => distKm(x.lat, x.lng, s.lat, s.lng) < 1.5)) out.push(s);
    return out;
  }, [data.stations]);
  const nearIds = useMemo(() => {
    if (!place) return undefined;
    const near = profile.map(s => ({ s, d: distKm(place.lat, place.lng, s.lat, s.lng) })).sort((a, b) => a.d - b.d)[0];
    return near && near.d < 15 ? new Set([near.s.id]) : undefined;
  }, [profile, place]);

  const metro = data.stations.filter(s => METRO.includes(s.provCode));
  const central = data.stations.filter(s => s.areaCode === '2');

  const rainTop = useMemo(() => data.rain.filter(r => METRO.includes(r.provCode) || r.provCode === '14').sort((a, b) => b.mm - a.mm).slice(0, 10), [data.rain]);
  const rainMax = Math.max(35, ...rainTop.map(r => r.mm));

  return (
    <section className="section alt" id="overview">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>ภาพรวมกรุงเทพฯ และปริมณฑล</h2>
            <p className="lead">น้ำที่จะท่วมกรุงเทพฯ มาจาก 3 ทาง คือ <b>น้ำเหนือ</b> ที่ไหลลงแม่น้ำเจ้าพระยา <b>น้ำทะเลหนุน</b> และ <b>ฝนตกหนักในเมือง</b></p>
          </div>
        </div>

        <div className="ov-head lv" data-level={o.level}>
          <span className="pill">ระดับ {o.level} · {LEVEL_NAME[o.level]}</span>
          <b>{txt?.title}</b>
        </div>

        <div className="kpis">
          {o.indicators.map(i => (
            <div className="kpi lv" data-level={i.level} key={i.key}>
              <div className="kpi-top">
                <span className="kpi-label">{i.label}</span>
                <span className="tag">{LEVEL_NAME[i.level]}</span>
              </div>
              <div className="kpi-value">{i.decimals ? fmt(i.value, i.decimals) : fmtInt(i.value)}<small>{i.unit}</small></div>
              {i.meter !== undefined && <div className="meter" aria-hidden="true"><i style={{ width: `${Math.round(Math.min(i.meter, 1) * 100)}%` }} /></div>}
              <div className="kpi-note">
                {i.trend && i.trend.hours >= 6 && Math.abs(i.trend.delta) >= 1 && (
                  <><span className={i.trend.delta > 0 ? 'trend-up' : 'trend-down'}>{i.trend.delta > 0 ? '▲' : '▼'} {fmtInt(Math.abs(i.trend.delta))} ใน {i.trend.hours} ชม.</span> · </>
                )}
                {i.note}
              </div>
            </div>
          ))}
        </div>

        <h3 className="subhead">เส้นทางน้ำเหนือสู่กรุงเทพฯ</h3>
        <p className="lead" style={{ marginBottom: 14 }}>ตัวเลขคือปริมาณน้ำไหลผ่าน หรือระดับน้ำเทียบตลิ่ง ณ ตอนนี้ และเวลาโดยประมาณที่น้ำเดินทางจากนครสวรรค์</p>
        <div className="panel"><Journey data={data} /></div>

        <h3 className="subhead">ระดับน้ำตลอดแม่น้ำเจ้าพระยา</h3>
        <p className="lead" style={{ marginBottom: 14 }}>แต่ละแท่งคือสถานีวัดน้ำ เรียงจากเหนือลงใต้ ถ้าแท่งสูงเกินเส้นประสีแดง แปลว่าน้ำล้นตลิ่ง{nearIds ? ' · จุดสีน้ำเงินคือสถานีที่ใกล้บ้านคุณ' : ''}</p>
        <div className="panel profile-wrap"><RiverProfile stations={profile} highlight={nearIds} /></div>

        <h3 className="subhead">ระดับน้ำย้อนหลัง 7 วัน</h3>
        <div className="charts">
          {g[KEY.nakhonSawan] && (
            <div className="chart-card">
              <h4>น้ำเหนือที่นครสวรรค์ (C.2)</h4>
              <p>ปริมาณน้ำไหลผ่าน (ลบ.ม./วินาที)</p>
              <LineChart points={g[KEY.nakhonSawan]!.points} field="q" unit="ลบ.ม./วิ" decimals={0}
                refs={g[KEY.nakhonSawan]!.qmax ? [{ v: g[KEY.nakhonSawan]!.qmax!, label: `ความจุลำน้ำ ${fmtInt(g[KEY.nakhonSawan]!.qmax)}`, color: 'var(--l4)' }] : []} />
            </div>
          )}
          {g[KEY.chaoPhrayaDam] && (
            <div className="chart-card">
              <h4>ท้ายเขื่อนเจ้าพระยา ชัยนาท (C.13)</h4>
              <p>ปริมาณน้ำที่ระบาย (ลบ.ม./วินาที)</p>
              <LineChart points={g[KEY.chaoPhrayaDam]!.points} field="q" unit="ลบ.ม./วิ" decimals={0}
                refs={[{ v: 2500, label: 'นอกคันกั้นน้ำเริ่มท่วม ~2,500', color: 'var(--l3)' }]} />
            </div>
          )}
          {g[KEY.nonthaburi] && (
            <div className="chart-card">
              <h4>เจ้าพระยา นนทบุรี (สะพานนวลฉวี)</h4>
              <p>ระดับน้ำ (ม.รทก.)</p>
              <LineChart points={g[KEY.nonthaburi]!.points} field="v" unit="ม.รทก."
                refs={g[KEY.nonthaburi]!.bank ? [{ v: g[KEY.nonthaburi]!.bank!, label: `ตลิ่ง ${fmt(g[KEY.nonthaburi]!.bank)}`, color: 'var(--l4)' }] : []} />
            </div>
          )}
          {g[KEY.samSen] && (
            <div className="chart-card">
              <h4>เจ้าพระยา สามเสน กรุงเทพฯ (C.12)</h4>
              <p>ระดับน้ำ (ม.รทก.) ขึ้นลงวันละ 2 ครั้งตามน้ำทะเล</p>
              <LineChart points={g[KEY.samSen]!.points} field="v" unit="ม.รทก."
                refs={[{ v: BKK_FLOODWALL_MSL, label: `คันกั้นน้ำ ≈ ${BKK_FLOODWALL_MSL.toFixed(2)}`, color: 'var(--l4)' },
                  ...(g[KEY.samSen]!.bank ? [{ v: g[KEY.samSen]!.bank!, label: `ตลิ่ง ${fmt(g[KEY.samSen]!.bank)}`, color: 'var(--l3)' }] : [])]} />
            </div>
          )}
        </div>

        <div className="grid-2" style={{ marginTop: 28 }}>
          <div className="panel">
            <h3>สถานะสถานีวัดน้ำ</h3>
            <p className="sub">สัดส่วนสถานีตามระดับน้ำเทียบตลิ่ง</p>
            <Distribution stations={metro} title="กรุงเทพฯ และปริมณฑล" />
            <div style={{ height: 16 }} />
            <Distribution stations={central} title="ภาคกลางทั้งหมด" />
          </div>
          <div className="panel">
            <h3>ฝนสะสม 24 ชม. สูงสุด</h3>
            <p className="sub">กรุงเทพฯ ปริมณฑล และอยุธยา</p>
            {rainTop.length && rainTop[0].mm > 0 ? (
              <div className="rainbars">
                {rainTop.map(r => (
                  <div className="rainbar" key={`${r.name}-${r.lat}`}>
                    <span className="nm" title={`${r.name} ${r.prov}`}>{r.name} <small className="muted">{r.prov.replace('กรุงเทพมหานคร', 'กทม.')}</small></span>
                    <span className="track"><i style={{ width: `${Math.max(1, (r.mm / rainMax) * 100)}%` }} /></span>
                    <b>{fmt(r.mm, 1)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">ไม่มีฝนตกในพื้นที่ช่วง 24 ชม. ที่ผ่านมา</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

