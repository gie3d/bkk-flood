'use client';

import { useMemo } from 'react';
import { DRAIN_MM_PER_HR, FLOW, KEY, LEVEL_NAME, METRO, RID_HYDRO_URL, STATUS, stationStatus, THREAT_NAME } from '@/lib/assess';
import { distKm, fmt, fmtInt, thShort } from '@/lib/format';
import { floodwallAt } from '@/lib/floodwall';
import type { Indicator, Level, Place, Situation, Station, StationStatus, Threat } from '@/lib/types';
import { LineChart, RiverProfile } from './charts';
import Share from './Share';
import MslNote from './MslNote';
import { FloodwallSource } from './Sources';
import { overallShareText } from '@/lib/share';

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
  // ค่าที่วัดก่อนเวลาดึงข้อมูลเกิน 2 ชม. ให้เห็นว่าเก่ากว่าจุดอื่น
  const old = (t: string) => new Date(data.fetchedAt).getTime() - new Date(t).getTime() > 2 * 3600e3;

  const nodes: { name: string; sub: string; value: string; unit: string; level: Level; time: string; href?: string; asOf?: string | null }[] = [
    { name: 'นครสวรรค์', sub: 'ปิง วัง ยม น่าน รวมกัน', value: c2?.discharge != null ? fmtInt(c2.discharge) : '–', unit: 'ลบ.ม./วิ', level: ind('c2')?.level ?? 0, time: 'ต้นทาง', asOf: c2?.time },
    { name: 'เขื่อนเจ้าพระยา', sub: 'ชัยนาท ควบคุมน้ำลงใต้', value: c13?.discharge != null ? fmtInt(c13.discharge) : '–', unit: 'ลบ.ม./วิ', level: ind('c13')?.level ?? 0, time: '~1 วัน', asOf: c13?.time },
    { name: 'อยุธยา', sub: ay ? ay.name : 'บ้านป้อม', value: ay?.pct != null ? `${Math.round(ay.pct)}%` : '–', unit: 'ของตลิ่ง', level: pctLevel(ay?.pct ?? null), time: '~2 วัน', asOf: ay?.time },
    { name: 'บางปะอิน', sub: bp ? bp.name : '', value: bp?.pct != null ? `${Math.round(bp.pct)}%` : '–', unit: 'ของตลิ่ง', level: pctLevel(bp?.pct ?? null), time: '~2–3 วัน', asOf: bp?.time },
    // C.29A ไม่มีใน ThaiWater ลิงก์ไปหน้าข้อมูลของกรมชลประทาน
    { name: 'บางไทร → ปทุมฯ', sub: 'C.29A น้ำที่จะเข้า กทม. จริง ๆ', value: 'ดูที่', unit: 'กรมชลฯ', level: 0, time: '~2–3 วัน', href: RID_HYDRO_URL },
    { name: 'นนทบุรี', sub: non ? non.name : '', value: non?.pct != null ? `${Math.round(non.pct)}%` : '–', unit: 'ของตลิ่ง', level: ind('non')?.level ?? 0, time: '~3 วัน', asOf: non?.time },
    { name: 'กรุงเทพฯ', sub: 'สามเสน เทียบคันกั้นน้ำ', value: ss?.wl != null ? fmt(ss.wl) : '–', unit: ss ? `/ ${floodwallAt(ss.lat).v.toFixed(2)} ม.` : '', level: ind('bkk')?.level ?? 0, time: '~3–5 วัน', asOf: ss?.time },
    { name: 'อ่าวไทย', sub: 'น้ำทะเลหนุนสูง ต.ค.–พ.ย. ทำให้น้ำระบายช้า', value: '≈', unit: 'ทะเล', level: 0, time: 'ปลายทาง' },
  ];

  return (
    <div className="journey" role="list" aria-label="เส้นทางน้ำเหนือไหลสู่กรุงเทพฯ">
      {nodes.map(n => {
        const body = (
          <>
            <div className="jn-dot" style={n.level === 0 ? { borderColor: 'var(--water)', color: 'var(--water)' } : undefined}>
              <div>{n.value}<small>{n.unit}</small></div>
            </div>
            <div className="jn-text">
              <span className="jn-name">{n.name}</span>
              <span className="jn-sub">{n.sub}</span>
              <span className="jn-time">{n.time}</span>
              {n.asOf && <span className={`jn-asof${old(n.asOf) ? ' old' : ''}`}>วัด {thShort(n.asOf)}</span>}
            </div>
          </>
        );
        return n.href ? (
          <a className="jn lv jn-link" data-level={n.level} key={n.name} role="listitem" href={n.href} target="_blank" rel="noopener noreferrer" title="เปิดข้อมูลสถานี C.29A ที่เว็บกรมชลประทาน">{body}</a>
        ) : (
          <div className="jn lv" data-level={n.level} key={n.name} role="listitem">{body}</div>
        );
      })}
    </div>
  );
}

function Kpi({ i }: { i: Indicator }) {
  return (
    <div className="kpi lv" data-level={i.level}>
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
      {i.asOf && (
        <div className="kpi-src">
          วัดจริงเมื่อ {thShort(i.asOf)} · {i.source}
          {i.refs?.map(r => <span key={r.url}> · <a href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a></span>)}
        </div>
      )}
    </div>
  );
}

/** ตัวเลขที่ต้องจำ: ปริมาณน้ำที่ C.2 / C.13 เทียบ 2,000 และ 3,000 ลบ.ม./วินาที */
function MagicNumbers({ indicators }: { indicators: Indicator[] }) {
  const rows = (['c2', 'c13'] as const).map(k => indicators.find(i => i.key === k)).filter((i): i is Indicator => !!i);
  const max = FLOW.severe + 500;
  const pos = (v: number) => `${Math.min(v / max, 1) * 100}%`;
  return (
    <div className="panel magic">
      <h3>ตัวเลขที่ต้องจำ: น้ำเหนือ 3,000</h3>
      <p className="sub">
        ดูแค่ 2 สถานี คือ <b>C.2 นครสวรรค์</b> (น้ำเหนือรวมกัน) และ <b>C.13 เขื่อนเจ้าพระยา</b> (น้ำที่ปล่อยลงมา) หน่วยเป็นลูกบาศก์เมตรต่อวินาที
      </p>
      <ul className="magic-rules">
        <li className="lv" data-level={1}><b>ต่ำกว่า {fmtInt(FLOW.riverside)}</b> ปกติ</li>
        <li className="lv" data-level={2}><b>{fmtInt(FLOW.riverside)}+</b> บ้านริมน้ำ/นอกคันกั้นน้ำ (กทม. 11 ชุมชน ปทุมฯ นนท์ อยุธยา) ขนของ</li>
        <li className="lv" data-level={4}><b>{fmtInt(FLOW.bkk)}+</b> กรุงเทพฯ ทั้งเมืองควรยกของขึ้นที่สูง</li>
      </ul>
      {rows.map(i => (
        <div className="magic-row" key={i.key}>
          <div className="magic-name">{i.key === 'c2' ? 'C.2 นครสวรรค์' : 'C.13 เขื่อนเจ้าพระยา'} <b>{fmtInt(i.value)}</b></div>
          <div className="magic-track" role="img" aria-label={`${fmtInt(i.value)} จาก ${fmtInt(FLOW.bkk)} ลบ.ม./วินาที`}>
            <i className="lv" data-level={i.level} style={{ width: pos(i.value) }} />
            <span className="mark" style={{ left: pos(FLOW.riverside) }}>{fmtInt(FLOW.riverside)}</span>
            <span className="mark bkk" style={{ left: pos(FLOW.bkk) }}>{fmtInt(FLOW.bkk)}</span>
          </div>
        </div>
      ))}
      <p className="hint">
        ข่าวหรือโพสต์อาจให้ตัวเลขไม่ตรงกัน (เช่น “จะปล่อย 2,800”) ตัวเลขบนเว็บนี้คือค่าที่สถานีวัดได้จริง พร้อมเวลาที่วัด
        ส่วนสถานี C.29A บางไทร (น้ำที่จะเข้าปทุมฯ และ กทม.) ยังไม่มีใน ThaiWater <a href={RID_HYDRO_URL} target="_blank" rel="noopener noreferrer">ดูที่กรมชลประทาน</a>
      </p>
    </div>
  );
}

const THREAT_TEXT: Record<Threat, Record<Exclude<Level, 0>, string>> = {
  north: {
    1: 'ยังไม่มา แม่น้ำเจ้าพระยายังรับได้',
    2: 'มีน้ำเหนือมากขึ้น บ้านริมน้ำนอกคันกั้นน้ำควรระวัง กทม. โดยรวมยังไม่ท่วม',
    3: 'น้ำเหนือใกล้ระดับที่จะกระทบ กทม. ควรยกของขึ้นที่สูง',
    4: 'น้ำเหนือเกินระดับที่ กทม. รับได้',
  },
  rain: {
    1: 'ไม่มีฝนหนักหรือคลองล้น',
    2: 'มีฝนหนักหรือคลองล้นบางจุด อาจมีน้ำรอระบาย',
    3: 'ฝนหนักมาก น้ำท่วมขังหลายพื้นที่',
    4: 'น้ำท่วมขังหนัก',
  },
};

/** ช่วงเวลาที่วัดของแท่งในกราฟแม่น้ำ และสถานีที่ข้อมูลเก่า */
function ProfileTimes({ stations }: { stations: Station[] }) {
  const fresh = stations.filter(s => !s.stale && s.time).map(s => s.time!).sort();
  const stale = stations.filter(s => s.stale);
  if (!fresh.length) return null;
  const first = fresh[0], last = fresh[fresh.length - 1];
  return (
    <p className="hint">
      วัดเมื่อ {first === last ? thShort(last) : `${thShort(first)} – ${thShort(last)}`} (ชี้ที่แท่งเพื่อดูเวลาของแต่ละสถานี)
      {stale.length > 0 && <> · แท่งสีเทาคือสถานีที่ไม่อัปเดตเกิน 6 ชม.: {stale.map(s => `${s.name} (${s.time ? thShort(s.time) : 'ไม่มีเวลา'})`).join(', ')}</>}
    </p>
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
  const g = data.graphs;
  const samSenSt = data.stations.find(s => s.code === KEY.samSen);
  const samSenWall = samSenSt ? floodwallAt(samSenSt.lat).v : null;
  const flowRefs = [
    { v: FLOW.riverside, label: `บ้านริมน้ำขนของ ${fmtInt(FLOW.riverside)}`, color: 'var(--l2)' },
    { v: FLOW.bkk, label: `กระทบ กทม. ${fmtInt(FLOW.bkk)}`, color: 'var(--l4)' },
  ];

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
  const rainMax = Math.max(DRAIN_MM_PER_HR * 1.25, ...rainTop.map(r => r.mm));

  return (
    <section className="section alt" id="overview">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>ภาพรวมกรุงเทพฯ และปริมณฑล</h2>
            <p className="lead">น้ำท่วมกรุงเทพฯ มี 2 แบบที่ต่างกันมาก คือ <b>น้ำเหนือ</b> ที่ไหลลงแม่น้ำเจ้าพระยา (แบบปี 2554) กับ <b>น้ำฝน/น้ำรอระบาย</b> ที่ตกหนักเกินท่อระบายรับไหว ต้องรับมือคนละแบบ</p>
          </div>
        </div>

        <div className="threats">
          {(['north', 'rain'] as const).map(t => {
            const lv = o[t];
            return (
              <a className="threat lv" data-level={lv} key={t} href={`#ov-${t}`}>
                <span className="pill">{THREAT_NAME[t]} · {LEVEL_NAME[lv]}</span>
                <span>{lv ? THREAT_TEXT[t][lv as 1 | 2 | 3 | 4] : 'ไม่มีข้อมูล'}</span>
              </a>
            );
          })}
        </div>

        <Share text={overallShareText(o)} label="แชร์ตัวเลขนี้" />

        <h3 className="subhead" id="ov-north">น้ำเหนือ: จะมาไหม?</h3>
        <div className="magic-wrap">
          <MagicNumbers indicators={o.indicators} />
          <div className="kpis">
            {o.indicators.filter(i => i.group === 'north').map(i => <Kpi i={i} key={i.key} />)}
          </div>
        </div>

        <h3 className="subhead">เส้นทางน้ำเหนือสู่กรุงเทพฯ</h3>
        <p className="lead" style={{ marginBottom: 14 }}>ตัวเลขคือปริมาณน้ำไหลผ่าน หรือระดับน้ำเทียบตลิ่ง ณ ตอนนี้ และเวลาโดยประมาณที่น้ำเดินทางจากนครสวรรค์</p>
        <div className="panel"><Journey data={data} /></div>

        <h3 className="subhead">ระดับน้ำตลอดแม่น้ำเจ้าพระยา</h3>
        <p className="lead" style={{ marginBottom: 14 }}>แต่ละแท่งคือสถานีวัดน้ำ เรียงจากเหนือลงใต้ ถ้าแท่งสูงเกินเส้นประสีแดง แปลว่าน้ำล้นตลิ่ง{nearIds ? ' · จุดสีน้ำเงินคือสถานีที่ใกล้บ้านคุณ' : ''}</p>
        <div className="panel profile-wrap">
          <RiverProfile stations={profile} highlight={nearIds} />
          <ProfileTimes stations={profile} />
        </div>

        <h3 className="subhead">ระดับน้ำย้อนหลัง 7 วัน</h3>
        <MslNote example={samSenSt?.wl != null && samSenWall ? { name: 'สามเสน', wall: samSenWall, water: samSenSt.wl } : undefined} />
        <div className="charts">
          {g[KEY.nakhonSawan] && (
            <div className="chart-card">
              <h4>น้ำเหนือที่นครสวรรค์ (C.2)</h4>
              <p>ปริมาณน้ำไหลผ่าน (ลบ.ม./วินาที)</p>
              <LineChart points={g[KEY.nakhonSawan]!.points} field="q" unit="ลบ.ม./วิ" decimals={0} refs={flowRefs} />
            </div>
          )}
          {g[KEY.chaoPhrayaDam] && (
            <div className="chart-card">
              <h4>ท้ายเขื่อนเจ้าพระยา ชัยนาท (C.13)</h4>
              <p>ปริมาณน้ำที่ระบาย (ลบ.ม./วินาที)</p>
              <LineChart points={g[KEY.chaoPhrayaDam]!.points} field="q" unit="ลบ.ม./วิ" decimals={0} refs={flowRefs} />
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
              <p>ระดับน้ำ (ม.รทก.) ขึ้นลงวันละ 2 ครั้งตามน้ำทะเล · คันกั้นน้ำช่วงนี้ (เหนือสะพานกรุงธน) +3.50 ม. <FloodwallSource /></p>
              <LineChart points={g[KEY.samSen]!.points} field="v" unit="ม.รทก."
                refs={[...(samSenWall ? [{ v: samSenWall, label: `คันกั้นน้ำ ${samSenWall.toFixed(2)}`, color: 'var(--l4)' }] : []),
                  ...(g[KEY.samSen]!.bank ? [{ v: g[KEY.samSen]!.bank!, label: `ตลิ่ง ${fmt(g[KEY.samSen]!.bank)}`, color: 'var(--l3)' }] : [])]} />
            </div>
          )}
        </div>

        <h3 className="subhead" id="ov-rain">น้ำฝน/น้ำรอระบาย: ทำไมฝนหยุดแล้วน้ำยังไม่ลด?</h3>
        <div className="kpis">
          {o.indicators.filter(i => i.group === 'rain').map(i => <Kpi i={i} key={i.key} />)}
        </div>
        <div className="panel drain-path">
          <p className="sub" style={{ marginBottom: 8 }}>น้ำฝนในกรุงเทพฯ ซึมลงดินไม่ได้ ต้องไหลตามเส้นทางนี้ ถ้าช่วงไหนเต็ม น้ำทั้งหมดก่อนหน้าจะลดช้าตาม</p>
          <ol className="drain-steps">
            <li><b>ท่อระบายน้ำ</b><span>รับฝนได้ราว {DRAIN_MM_PER_HR} มม./ชม.</span></li>
            <li><b>คลองย่อย</b><span>ฝั่งตะวันออกคลองเล็กและยาว</span></li>
            <li><b>คลองหลัก</b><span>เช่น แสนแสบ ประเวศบุรีรมย์</span></li>
            <li><b>แม่น้ำเจ้าพระยา</b><span>สถานีสูบน้ำและอุโมงค์ยักษ์เป็นทางลัด</span></li>
            <li><b>อ่าวไทย</b><span>น้ำทะเลหนุนทำให้ระบายช้า</span></li>
          </ol>
          <p className="hint">เมื่อคลองหลักยังเต็ม น้ำในซอยอาจลดเพียงวันละ 0.5–1 ซม. มองด้วยตาแทบไม่เห็น แต่กำลังลด · ฝั่งตะวันออก (ลาดกระบัง มีนบุรี หนองจอก คลองจั่น) พื้นที่ต่ำกว่าฝั่งตะวันตกและเคยเป็นพื้นที่รับน้ำ จึงท่วมนานกว่า</p>
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
            <p className="sub">กรุงเทพฯ ปริมณฑล และอยุธยา · เส้นประคือ {DRAIN_MM_PER_HR} มม. ที่ท่อระบาย กทม. รับได้ใน 1 ชม.</p>
            {rainTop.length && rainTop[0].mm > 0 ? (
              <div className="rainbars">
                {rainTop.map(r => (
                  <div className="rainbar" key={`${r.name}-${r.lat}`}>
                    <span className="nm" title={`${r.name} ${r.prov}`}>{r.name} <small className="muted">{r.prov.replace('กรุงเทพมหานคร', 'กทม.')}</small></span>
                    <span className="track"><i style={{ width: `${Math.max(1, (r.mm / rainMax) * 100)}%` }} /><em className="drain-mark" style={{ left: `${(DRAIN_MM_PER_HR / rainMax) * 100}%` }} /></span>
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

