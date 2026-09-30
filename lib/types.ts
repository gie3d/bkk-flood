export type Level = 0 | 1 | 2 | 3 | 4;

export type StationStatus = 'over' | 'near' | 'high' | 'ok' | 'stale';

export interface Station {
  id: number;
  code: string;
  name: string;
  lat: number;
  lng: number;
  provCode: string;
  prov: string;
  amphoe: string;
  areaCode: string;
  river: string;
  wl: number | null;
  prev: number | null;
  /** ตลิ่งด้านต่ำ (min_bank) */
  bank: number | null;
  leftBank: number | null;
  rightBank: number | null;
  /** ระดับวิกฤตที่กรมชลประทานกำหนด (ม.รทก.) ถ้ามี */
  critical: number | null;
  ground: number | null;
  pct: number | null;
  /** เมตรที่น้ำสูงกว่าตลิ่ง (0 ถ้ายังไม่ล้น) */
  over: number;
  discharge: number | null;
  qmax: number | null;
  /** ISO time */
  time: string | null;
  stale: boolean;
  agency: string;
}

export interface RainStation {
  name: string;
  prov: string;
  provCode: string;
  amphoe: string;
  lat: number;
  lng: number;
  mm: number;
  time: string;
}

export interface Dam {
  name: string;
  nameEn: string;
  storagePct: number | null;
  storage: number | null;
  maxStorage: number | null;
  inflow: number | null;
  released: number | null;
  date: string;
  cctv: string | null;
}

export interface Photo {
  id: string;
  title: string;
  caption: string;
  url: string;
  thumb: string;
  time: string | null;
  source: string;
}

export interface GraphPoint {
  t: string;
  v: number | null;
  q: number | null;
}

export interface GraphStats {
  /** จำนวนชั่วโมงที่มีข้อมูล */
  hours: number;
  first: { t: string; v: number } | null;
  last: { t: string; v: number } | null;
  max: { t: string; v: number } | null;
  min: { t: string; v: number } | null;
  avg: number | null;
  /** จำนวนชั่วโมงที่น้ำสูงกว่าตลิ่ง */
  hoursOverBank: number;
  qMax: { t: string; v: number } | null;
}

export interface Graph {
  code: string;
  name: string;
  bank: number | null;
  qmax: number | null;
  days: number;
  /** จำนวนชั่วโมงต่อหนึ่งจุดในกราฟ (1 = รายชั่วโมง) ถ้ามากกว่า 1 แต่ละจุดคือค่าสูงสุดของช่วงนั้น */
  step: number;
  points: GraphPoint[];
  stats: GraphStats;
}

export interface Indicator {
  key: 'c13' | 'c2' | 'bkk' | 'non' | 'canal' | 'rain';
  level: Level;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  meter?: number;
  note: string;
  reason: string;
  trend?: { delta: number; hours: number } | null;
}

export interface Situation {
  fetchedAt: string;
  latest: string | null;
  stations: Station[];
  rain: RainStation[];
  dams: Dam[];
  photos: {
    radar: Photo[];
    forecast: Photo[];
    forecastRegion: Photo[];
    storm: Photo[];
  };
  graphs: Record<string, Graph | null>;
  overall: { level: Level; indicators: Indicator[] };
  errors: string[];
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
  key?: string;
}

export interface HouseOpts {
  river: boolean;
  low: boolean;
  oneFloor: boolean;
}
