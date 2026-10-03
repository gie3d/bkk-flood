import { clamp, distKm, fmt, fmtInt } from './format';
import type { Graph, HouseOpts, Indicator, Level, Overall, Place, RainStation, Station, StationStatus, Threat } from './types';

export const STALE_HOURS = 6;

/**
 * ตัวเลขที่คนติดตามข่าวน้ำใช้กัน (ลบ.ม./วินาที ที่ C.2 นครสวรรค์ และ C.13 เขื่อนเจ้าพระยา)
 * เกิน 2,000 บ้านริมน้ำ/นอกคันกั้นน้ำเริ่มท่วม · เกิน 3,000 กระทบกรุงเทพฯ
 */
export const FLOW = { riverside: 2000, bkk: 3000, severe: 3500 } as const;
/** ท่อระบายน้ำ กทม. รับฝนได้ราว 60 มม./ชม. (เป้าหมายเพิ่มเป็น 80) */
export const DRAIN_MM_PER_HR = 60;
/** สถานี C.29A บางไทร ไม่มีใน ThaiWater จึงลิงก์ไปหน้าข้อมูลของกรมชลประทาน */
export const RID_HYDRO_URL = 'https://hyd-app-db.rid.go.th/hydro1d.html';

export const THREAT_NAME: Record<Threat, string> = { north: 'น้ำเหนือ', rain: 'น้ำฝน/น้ำรอระบาย' };
/** ระดับสันแนวคันกั้นน้ำริมเจ้าพระยาของ กทม. ส่วนใหญ่ราว +2.80 ถึง +3.50 ม.รทก. ใช้ค่าต่ำสุดเพื่อความปลอดภัย */
export const BKK_FLOODWALL_MSL = 2.8;
export const METRO = ['10', '11', '12', '13'];

export const KEY = {
  nakhonSawan: 'C.2',
  chaoPhrayaDam: 'C.13',
  ayutthaya: 'C.35',
  bangPaIn: 'CPY012',
  nonthaburi: 'CPY014',
  samSen: 'C.12',
  bkkBridge: 'CPY015',
} as const;

export const LEVEL_NAME: Record<Level, string> = {
  0: 'ไม่มีข้อมูล',
  1: 'ปกติ',
  2: 'เฝ้าระวัง',
  3: 'เตรียมพร้อม',
  4: 'อันตราย',
};

export const LEVEL_TEXT: Record<Exclude<Level, 0>, { title: string; summary: string; todo: string[] }> = {
  1: {
    title: 'ใช้ชีวิตตามปกติได้ ยังไม่ต้องขนของ',
    summary: 'ระดับน้ำรอบบ้านคุณยังต่ำกว่าตลิ่งมาก ไม่มีสัญญาณน้ำท่วมในระยะนี้',
    todo: ['ติดตามข่าวสัปดาห์ละครั้งก็พอ', 'หากฝนตกหนัก อาจมีน้ำรอการระบายบนถนนบางจุด ให้เลี่ยงเส้นทาง'],
  },
  2: {
    title: 'ยังไม่ต้องขนของ แต่ควรติดตามทุกวัน',
    summary: 'มีน้ำเหนือไหลลงมามากขึ้น หรือน้ำบางจุดใกล้ตลิ่ง แต่ยังไม่ถึงขั้นต้องย้ายของ',
    todo: ['เช็กสถานการณ์วันละครั้ง', 'ทำรายการของมีค่า/เอกสารสำคัญที่ต้องย้าย เผื่อไว้', 'ตรวจท่อระบายน้ำรอบบ้านไม่ให้อุดตัน'],
  },
  3: {
    title: 'ควรเตรียมพร้อม ยกของขึ้นที่สูง',
    summary: 'น้ำในแม่น้ำหรือคลองใกล้บ้านล้นตลิ่งหรือใกล้ล้น มีโอกาสท่วมในพื้นที่ต่ำและริมน้ำ',
    todo: ['ยกเอกสาร เครื่องใช้ไฟฟ้า ของมีค่าขึ้นที่สูงหรือชั้น 2', 'ย้ายรถไปจอดที่สูง เช่น อาคารจอดรถ', 'เตรียมถุงยังชีพ น้ำดื่ม ยา ไฟฉาย สำหรับ 3–7 วัน', 'ติดตามประกาศจากเขต/อำเภอทุกวัน'],
  },
  4: {
    title: 'อันตราย! ขนของขึ้นชั้นบนและเตรียมอพยพ',
    summary: 'ระดับน้ำใกล้บ้านสูงเกินตลิ่งมาก มีโอกาสสูงที่น้ำจะเข้าบ้านเรือน',
    todo: ['ขนของทั้งหมดขึ้นชั้นบน', 'ตัดไฟชั้นล่างเมื่อน้ำเริ่มเข้าบ้าน', 'เตรียมอพยพเด็ก ผู้สูงอายุ ผู้ป่วยก่อน', 'โทร 1784 หรือ 1555 เมื่อต้องการความช่วยเหลือ'],
  },
};

export const STATUS: Record<StationStatus, { label: string; color: string; range: string }> = {
  over: { label: 'ล้นตลิ่ง', color: '#d42a2a', range: '>100%' },
  near: { label: 'ใกล้ตลิ่ง', color: '#f08a24', range: '90–100%' },
  high: { label: 'น้ำมาก', color: '#2f6fd6', range: '70–90%' },
  ok: { label: 'ปกติ', color: '#22a35a', range: '<70%' },
  stale: { label: 'ไม่อัปเดต', color: '#a3adb8', range: '' },
};

/** ระยะห่างระหว่างผิวน้ำกับตลิ่ง เช่น "ต่ำกว่าตลิ่ง 0.28 ม." (% ของตลิ่งวัดจากท้องน้ำ แม่น้ำลึกจึงขึ้นใกล้ 100% เสมอ) */
export function bankGapText(s: Station): string | null {
  if (s.wl === null || s.bank === null) return null;
  const d = s.wl - s.bank;
  return d > 0 ? `สูงกว่าตลิ่ง ${fmt(d)} ม.` : `ต่ำกว่าตลิ่ง ${fmt(-d)} ม.`;
}

export function stationStatus(s: Station): StationStatus {
  if (s.stale || s.pct === null) return 'stale';
  if (s.pct > 100) return 'over';
  if (s.pct >= 90) return 'near';
  if (s.pct >= 70) return 'high';
  return 'ok';
}

export function trendOf(graph: Graph | null | undefined, field: 'v' | 'q', hours: number) {
  if (!graph) return null;
  const pts = graph.points.filter(p => p[field] !== null);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const lastT = new Date(last.t).getTime();
  let base = pts[0];
  for (const p of pts) {
    if (new Date(p.t).getTime() <= lastT - hours * 3600e3) base = p;
    else break;
  }
  if (base === last) return null;
  return { delta: (last[field] as number) - (base[field] as number), hours: Math.round((lastT - new Date(base.t).getTime()) / 3600e3) };
}

function trendText(tr: { delta: number; hours: number } | null, unit: string) {
  if (!tr || tr.hours < 6) return '';
  if (Math.abs(tr.delta) < 1) return ' ทรงตัว';
  return ` ${tr.delta > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${fmtInt(Math.abs(tr.delta))} ${unit} ใน ${tr.hours} ชม.`;
}

const isFresh = (s: Station | undefined): s is Station => !!s && !s.stale;

const srcOf = (s: Station) => s.agency ? `${s.agency} ผ่าน ThaiWater` : 'ThaiWater';

/** ระดับจากปริมาณน้ำไหลผ่าน C.2 / C.13 */
export const flowLevel = (q: number): Exclude<Level, 0> =>
  q < FLOW.riverside ? 1 : q < FLOW.bkk ? 2 : q < FLOW.severe ? 3 : 4;

/** ประโยคสั้น ๆ ว่าตัวเลขนี้แปลว่าอะไร */
export function flowMeaning(q: number) {
  if (q < FLOW.riverside) return `ยังไม่ถึง ${fmtInt(FLOW.riverside)} ที่บ้านริมน้ำต้องขนของ และห่างจาก ${fmtInt(FLOW.bkk)} ที่จะกระทบ กทม. อีก ${fmtInt(FLOW.bkk - q)}`;
  if (q < FLOW.bkk) return `เกิน ${fmtInt(FLOW.riverside)} แล้ว บ้านริมน้ำ/นอกคันกั้นน้ำ (กทม. ปทุมฯ นนทบุรี อยุธยา) ควรขนของ · ยังต่ำกว่า ${fmtInt(FLOW.bkk)} ที่จะกระทบ กทม. อีก ${fmtInt(FLOW.bkk - q)}`;
  return `เกิน ${fmtInt(FLOW.bkk)} แล้ว กรุงเทพฯ ควรยกของขึ้นที่สูง`;
}

const maxLevel = (ind: Indicator[], g: Threat) => {
  const ls = ind.filter(i => i.group === g).map(i => i.level);
  return (ls.length ? Math.max(...ls) : 0) as Level;
};

export function assessOverall(stations: Station[], rain: RainStation[], graphs: Record<string, Graph | null>): Overall {
  const by = new Map(stations.map(s => [s.code, s]));
  const ind: Indicator[] = [];

  const c13 = by.get(KEY.chaoPhrayaDam);
  if (isFresh(c13) && c13.discharge !== null) {
    const q = c13.discharge;
    const tr = trendOf(graphs[KEY.chaoPhrayaDam], 'q', 24);
    ind.push({
      key: 'c13', group: 'north', level: flowLevel(q), label: 'น้ำปล่อยจากเขื่อนเจ้าพระยา (C.13)', value: q, unit: 'ลบ.ม./วินาที', decimals: 0, trend: tr,
      meter: clamp(q / FLOW.severe, 0, 1),
      note: `${flowMeaning(q)} · ถึง กทม. ใน 2–3 วัน`,
      reason: `เขื่อนเจ้าพระยาปล่อยน้ำ ${fmtInt(q)} ลบ.ม./วินาที${trendText(tr, 'ลบ.ม./วิ')}`,
      asOf: c13.time, source: srcOf(c13),
    });
  }

  const c2 = by.get(KEY.nakhonSawan);
  if (isFresh(c2) && c2.discharge !== null) {
    const q = c2.discharge;
    const cap = c2.qmax || 3735;
    const tr = trendOf(graphs[KEY.nakhonSawan], 'q', 24);
    ind.push({
      key: 'c2', group: 'north', level: flowLevel(q), label: 'น้ำเหนือไหลผ่านนครสวรรค์ (C.2)', value: q, unit: 'ลบ.ม./วินาที', decimals: 0, trend: tr,
      meter: clamp(q / FLOW.severe, 0, 1),
      note: `${flowMeaning(q)} · ${Math.round((q / cap) * 100)}% ของความจุลำน้ำ · ถึง กทม. ใน 3–5 วัน`,
      reason: `น้ำเหนือที่นครสวรรค์ ${fmtInt(q)} ลบ.ม./วินาที${trendText(tr, 'ลบ.ม./วิ')}`,
      asOf: c2.time, source: srcOf(c2),
    });
  }

  const bkkRiver = [by.get(KEY.samSen), by.get(KEY.bkkBridge)].filter(isFresh);
  if (bkkRiver.length) {
    const vals = bkkRiver.map(s => s.wl).filter((v): v is number => v !== null);
    const g = graphs[KEY.samSen];
    const dayAgo = Date.now() - 24 * 3600e3;
    if (g) for (const p of g.points) if (p.v !== null && new Date(p.t).getTime() > dayAgo) vals.push(p.v);
    if (vals.length) {
      const peak = Math.max(...vals);
      const gap = BKK_FLOODWALL_MSL - peak;
      const level: Level = gap > 1.0 ? 1 : gap > 0.5 ? 2 : gap > 0.2 ? 3 : 4;
      ind.push({
        key: 'bkk', group: 'north', level, label: 'แม่น้ำเจ้าพระยาในกรุงเทพฯ (สูงสุด 24 ชม.)', value: peak, unit: 'ม.รทก.', decimals: 2,
        meter: clamp(peak / BKK_FLOODWALL_MSL, 0, 1),
        note: `ต่ำกว่าคันกั้นน้ำ (≈ +${BKK_FLOODWALL_MSL.toFixed(2)} ม.) ${fmt(Math.max(gap, 0))} ม. · น้ำทะเลหนุนสูงช่วง ต.ค.–พ.ย.`,
        reason: gap > 0
          ? `เจ้าพระยาในกรุงเทพฯ สูงสุด ${fmt(peak)} ม.รทก. ต่ำกว่าคันกั้นน้ำ ${fmt(gap)} ม.`
          : `เจ้าพระยาในกรุงเทพฯ สูง ${fmt(peak)} ม.รทก. ถึงระดับคันกั้นน้ำแล้ว`,
        asOf: bkkRiver[0].time, source: srcOf(bkkRiver[0]),
      });
    }
  }

  const non = by.get(KEY.nonthaburi);
  if (isFresh(non) && non.pct !== null) {
    // ล้นตลิ่งที่นนทบุรีกระทบบ้านริมน้ำนอกคันกั้นน้ำ ไม่ใช่ทั้งเมือง จึงจำกัดผลต่อภาพรวมไม่เกิน "เฝ้าระวัง"
    const level: Level = non.pct < 90 ? 1 : 2;
    ind.push({
      key: 'non', group: 'north', level, label: 'เจ้าพระยาที่นนทบุรี (สะพานนวลฉวี)', value: non.wl ?? 0, unit: 'ม.รทก.', decimals: 2,
      meter: clamp(non.pct / 100, 0, 1),
      note: `${Math.round(non.pct)}% ของระดับตลิ่ง (${fmt(non.bank)} ม.)${non.pct > 100 ? ' · ล้นตลิ่งแล้ว บ้านริมน้ำนอกคันกั้นน้ำท่วม' : ''}`,
      reason: `เจ้าพระยาที่นนทบุรีอยู่ที่ ${Math.round(non.pct)}% ของตลิ่ง`,
      asOf: non.time, source: srcOf(non),
    });
  }

  // คลองล้นเป็นปัญหาเฉพาะจุด จึงจำกัดผลต่อภาพรวมไม่เกิน "เฝ้าระวัง"
  const canals = stations.filter(s => s.provCode === '10' && !s.stale && !/เจ้าพระยา/.test(s.river));
  if (canals.length) {
    const over = canals.filter(s => stationStatus(s) === 'over');
    const near = canals.filter(s => stationStatus(s) === 'near');
    const level: Level = over.length || near.length >= 2 ? 2 : 1;
    const names = over.map(s => s.river || s.name);
    const latest = canals.map(s => s.time).filter(Boolean).sort().pop();
    ind.push({
      key: 'canal', group: 'rain', level, label: 'คลองสายหลักในกรุงเทพฯ', value: over.length, unit: `จาก ${canals.length} สถานี ล้นตลิ่ง`, decimals: 0,
      meter: canals.length ? over.length / canals.length : 0,
      note: (over.length ? `ล้นตลิ่ง: ${names.join(', ')}` : near.length ? `${near.length} สถานีใกล้ตลิ่ง` : 'ทุกสถานียังต่ำกว่าตลิ่ง')
        + (over.length || near.length ? ' · คลองเต็มทำให้น้ำในซอยลดช้า แม้ฝนหยุดแล้ว' : ''),
      reason: over.length
        ? `คลองในกรุงเทพฯ ล้นตลิ่ง ${over.length} จุด (${names.slice(0, 3).join(', ')}) เป็นปัญหาเฉพาะพื้นที่`
        : 'คลองสายหลักในกรุงเทพฯ ยังต่ำกว่าตลิ่ง',
      asOf: latest ?? null, source: 'สถานีวัดน้ำในคลอง ผ่าน ThaiWater',
    });
  }

  const metroRain = rain.filter(r => METRO.includes(r.provCode)).sort((a, b) => b.mm - a.mm);
  {
    const top = metroRain[0];
    const mm = top ? top.mm : 0;
    const level: Level = mm < 35 ? 1 : mm < 90 ? 2 : 3;
    ind.push({
      key: 'rain', group: 'rain', level, label: 'ฝนสะสม 24 ชม. สูงสุดใน กทม.–ปริมณฑล', value: mm, unit: 'มม.', decimals: 1,
      meter: clamp(mm / 120, 0, 1),
      note: top
        ? `${top.name} ${top.prov} · ท่อระบายน้ำ กทม. รับได้ราว ${DRAIN_MM_PER_HR} มม./ชม. ฝนปริมาณนี้ถ้าตกภายใน 1 ชม. ${mm > DRAIN_MM_PER_HR ? `จะเกินกำลังระบาย ${fmt(mm / DRAIN_MM_PER_HR, 1)} เท่า` : 'ยังไม่เกินกำลังระบาย'}`
        : 'ไม่มีรายงานฝนในพื้นที่',
      reason: mm < 1 ? 'ไม่มีฝนตกหนักในกรุงเทพฯ และปริมณฑลช่วง 24 ชม.' : `ฝนสะสมสูงสุด ${fmt(mm, 1)} มม. ที่${top!.name} (${top!.prov})`,
      asOf: top?.time ?? null, source: 'สถานีวัดฝน ผ่าน ThaiWater',
    });
  }

  const level = (ind.length ? Math.max(...ind.map(i => i.level)) : 0) as Level;
  return { level, north: maxLevel(ind, 'north'), rain: maxLevel(ind, 'rain'), indicators: ind };
}

export interface ThreatAnswer {
  level: Exclude<Level, 0>;
  title: string;
  detail: string;
}

export interface PlaceAssessment {
  level: Exclude<Level, 0>;
  nearest: { s: Station; d: number }[];
  rainNear: { r: RainStation; d: number }[];
  reasons: string[];
  todo: string[];
  north: ThreatAnswer;
  rain: ThreatAnswer;
  /** ปัญหาหลักของพื้นที่นี้ตอนนี้ (none = ปกติทั้งคู่) */
  threat: Threat | 'none';
  /** ฝั่งตะวันออกของ กทม. พื้นที่ต่ำ คลองเล็กและยาว ระบายช้ากว่าฝั่งตะวันตก */
  east: boolean;
}

const isRiverStation = (s: Station) => /แม่น้ำ/.test(s.river);

/** ฝั่งตะวันออกของ กทม. (ลาดกระบัง มีนบุรี หนองจอก คลองสามวา ประเวศ บางกะปิ ฯลฯ) */
export const isEastBangkok = (p: { lat: number; lng: number }) => p.lng >= 100.635 && p.lat > 13.65 && p.lat < 13.95;

const NORTH_TITLE: Record<Exclude<Level, 0>, string> = {
  1: 'ยังไม่มา',
  2: 'เฝ้าระวัง ยังไม่ถึงบ้านคุณ',
  3: 'อาจถึงบ้านคุณ ควรยกของขึ้นที่สูง',
  4: 'น้ำเข้าแน่ ขนของขึ้นชั้นบน เตรียมอพยพ',
};
const RAIN_TITLE: Record<Exclude<Level, 0>, string> = {
  1: 'ไม่มีน้ำขัง',
  2: 'อาจมีน้ำรอระบายบนถนน',
  3: 'น้ำท่วมขังในพื้นที่ คลองใกล้บ้านเต็ม',
  4: 'น้ำท่วมขังหนัก',
};

export function assessPlace(
  place: Place,
  opts: HouseOpts,
  stations: Station[],
  rain: RainStation[],
  overall: Overall,
): PlaceAssessment {
  const withD = stations
    .filter(s => !s.stale && s.pct !== null)
    .map(s => ({ s, d: distKm(place.lat, place.lng, s.lat, s.lng) }))
    .sort((a, b) => a.d - b.d);
  const within = withD.filter(x => x.d <= 8).slice(0, 5);
  const nearest = within.length ? within : withD.slice(0, 3).filter(x => x.d <= 25);

  const rainNear = rain
    .map(r => ({ r, d: distKm(place.lat, place.lng, r.lat, r.lng) }))
    .filter(x => x.d <= 15)
    .sort((a, b) => b.r.mm - a.r.mm)
    .slice(0, 5);

  const reasons: string[] = [];
  const riverInd = overall.indicators.filter(i => i.group === 'north');
  const riverLevel = riverInd.length ? Math.max(...riverInd.map(i => i.level)) : 1;
  const inMetro = distKm(place.lat, place.lng, 13.76, 100.55) < 45;
  const c13 = overall.indicators.find(i => i.key === 'c13');

  // ฝนใกล้บ้าน
  const maxRain = rainNear.length ? rainNear[0].r.mm : 0;
  const rainLevel = maxRain < 35 ? 1 : maxRain < 90 ? 2 : 3;

  // แยกสถานีแม่น้ำ (น้ำเหนือ) กับคลอง (น้ำฝน/น้ำรอระบาย)
  let localRiver = 1, localCanal = 1;
  for (const { s, d } of nearest) {
    const st = stationStatus(s);
    let l = st === 'over' ? (s.over >= 0.5 ? 4 : 3) : st === 'near' ? 2 : 1;
    if (d > 4 && l > 2) l -= 1; // สถานีไกลออกไปมีผลน้อยลง
    if (isRiverStation(s)) localRiver = Math.max(localRiver, l);
    else localCanal = Math.max(localCanal, l);
  }
  if (nearest.length) {
    const top = nearest[0];
    reasons.push(`สถานีใกล้ที่สุด: ${top.s.name} (${top.s.river || top.s.amphoe}) ห่าง ${fmt(top.d, 1)} กม. ${STATUS[stationStatus(top.s)].label} ${Math.round(top.s.pct!)}% ของตลิ่ง`);
    const overNear = nearest.filter(x => stationStatus(x.s) === 'over');
    if (overNear.length && overNear[0] !== top)
      reasons.push(`${overNear[0].s.river || overNear[0].s.name} ห่าง ${fmt(overNear[0].d, 1)} กม. ล้นตลิ่ง ${fmt(overNear[0].s.over)} ม.`);
  } else {
    reasons.push('ไม่มีสถานีวัดน้ำที่อัปเดตในรัศมี 25 กม. จึงใช้ภาพรวมประเมินแทน');
  }

  // บ้านในแนวคันกั้นน้ำได้รับผลจากแม่น้ำน้อยกว่าบ้านริมน้ำ
  let north = Math.max(localRiver, inMetro ? Math.min(riverLevel, 2) : 1);
  let rainLv = Math.max(localCanal, Math.min(rainLevel, 2));
  if (inMetro && riverLevel >= 2) {
    const r = [...riverInd].sort((a, b) => b.level - a.level)[0];
    if (r) reasons.push(r.reason);
  }
  if (maxRain >= 1) reasons.push(`ฝน 24 ชม. ใกล้บ้านสูงสุด ${fmt(maxRain, 1)} มม. (${rainNear[0].r.name})`);
  else reasons.push('ไม่มีรายงานฝนตกหนักใกล้บ้านใน 24 ชม.');

  if (opts.river) {
    const riverSt = nearest.find(x => isRiverStation(x.s)) || nearest[0];
    if (riverSt && riverSt.s.pct !== null) {
      const p = riverSt.s.pct;
      north = Math.max(north, p > 100 ? 4 : p >= 95 ? 3 : p >= 85 ? 2 : 1);
      reasons.push(`บ้านริมน้ำ/นอกคันกั้นน้ำ: ${riverSt.s.river || riverSt.s.name} อยู่ที่ ${Math.round(p)}% ของตลิ่ง`);
    }
    if (inMetro) north = Math.max(north, riverLevel);
    // ใต้เขื่อนเจ้าพระยาลงมา: ปล่อยน้ำเกิน 2,000 บ้านริมน้ำนอกคันกั้นน้ำต้องขนของ
    if (c13 && c13.value >= FLOW.riverside && place.lat < 15.2) {
      north = Math.max(north, 3);
      reasons.push(`เขื่อนเจ้าพระยาปล่อยน้ำ ${fmtInt(c13.value)} ลบ.ม./วินาที เกิน ${fmtInt(FLOW.riverside)} บ้านริมน้ำนอกคันกั้นน้ำมักเริ่มท่วม`);
    }
  }
  if (opts.low && (rainLevel >= 2 || localCanal >= 2)) {
    rainLv = Math.min(Math.max(rainLv, Math.max(rainLevel, localCanal) + 1), 4);
    reasons.push('พื้นที่ต่ำ เสี่ยงน้ำท่วมขังมากกว่าทั่วไปเมื่อมีฝนหรือคลองเต็ม');
  }
  if (!nearest.length) {
    north = Math.max(north, Math.min(overall.north || 1, 2));
    rainLv = Math.max(rainLv, Math.min(overall.rain || 1, 2));
  }

  const nLv = clamp(north, 1, 4) as Exclude<Level, 0>;
  const rLv = clamp(rainLv, 1, 4) as Exclude<Level, 0>;
  const lv = Math.max(nLv, rLv) as Exclude<Level, 0>;
  const threat: PlaceAssessment['threat'] = lv === 1 ? 'none' : nLv >= rLv ? 'north' : 'rain';

  const riverNear = nearest.find(x => isRiverStation(x.s));
  const northDetail = c13 && place.lat < 15.2
    ? `เขื่อนเจ้าพระยาปล่อยน้ำ ${fmtInt(c13.value)} ลบ.ม./วินาที — ${flowMeaning(c13.value)}`
    : riverNear
      ? `${riverNear.s.river || riverNear.s.name} ${STATUS[stationStatus(riverNear.s)].label} ${Math.round(riverNear.s.pct!)}% ของตลิ่ง`
      : 'ไม่มีสถานีแม่น้ำใกล้บ้าน';

  const canalNear = nearest.filter(x => x.d <= 8 && !isRiverStation(x.s)).sort((a, b) => (b.s.pct ?? 0) - (a.s.pct ?? 0))[0];
  const canalText = canalNear
    ? `${canalNear.s.river || canalNear.s.name} ${STATUS[stationStatus(canalNear.s)].label} ${Math.round(canalNear.s.pct!)}% ของตลิ่ง`
    : '';
  const rainDetail = maxRain < 1 && localCanal >= 2
    ? `ฝนหยุดแล้ว แต่${canalText} น้ำจึงลดช้า`
    : [maxRain >= 1 ? `ฝน 24 ชม. ใกล้บ้าน ${fmt(maxRain, 1)} มม.` : 'ไม่มีฝนตกหนักใกล้บ้านใน 24 ชม.', canalText].filter(Boolean).join(' · ');

  const todo = LEVEL_TEXT[lv].todo.slice();
  if (threat === 'rain')
    todo.push('กระสอบทราย/แผ่นกั้นหน้าประตูช่วยกันน้ำฝนที่ไหลบนถนนและคลื่นจากรถได้');
  if (threat === 'north' && lv >= 3)
    todo.push('กระสอบทรายกันน้ำเหนือไม่อยู่ เพราะน้ำซึมขึ้นทางท่อและพื้น ให้ยกของขึ้นที่สูงแทน');
  if (opts.oneFloor && lv >= 2)
    todo.push(lv >= 3
      ? 'บ้านชั้นเดียว: ยกของขึ้นชั้นวาง/โต๊ะสูงอย่างน้อย 1 เมตร และติดต่อที่พักสำรองไว้ล่วงหน้า'
      : 'บ้านชั้นเดียว: เตรียมชั้นวางหรือที่สูงสำหรับวางของ และคิดเรื่องที่พักสำรองไว้');
  if (opts.river && lv >= 2) todo.push('ติดตามเวลาน้ำทะเลหนุนสูง (ช่วงเช้ามืดและค่ำ) โดยเฉพาะเดือน ต.ค.–พ.ย.');

  return {
    level: lv, nearest, rainNear, reasons, todo, threat,
    north: { level: nLv, title: NORTH_TITLE[nLv], detail: northDetail },
    rain: { level: rLv, title: RAIN_TITLE[rLv], detail: rainDetail },
    east: isEastBangkok(place),
  };
}
