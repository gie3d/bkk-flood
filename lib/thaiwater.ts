import 'server-only';
import { assessOverall, KEY, METRO, STALE_HOURS } from './assess';
import { num, thaiTimeToIso } from './format';
import type { Dam, Graph, GraphPoint, GraphStats, Photo, RainStation, Situation, Station } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- ThaiWater ส่ง JSON ที่ไม่มี schema */

const API = 'https://api-v3.thaiwater.net/api/v1/thaiwater30';
const IMG = `${API}/shared/image?image=`;
const TTL_MS = 10 * 60 * 1000;

async function getJSON(path: string, timeoutMs = 20000): Promise<any> {
  const res = await fetch(`${API}/${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`ThaiWater ${res.status}: ${path}`);
  return res.json();
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

const th = (o: any) => (o && (o.th || o.en)) || '';

function normalizeStation(r: any): Station | null {
  const s = r.station || {};
  const g = r.geocode || {};
  const lat = num(s.tele_station_lat);
  const lng = num(s.tele_station_long);
  if (lat === null || lng === null) return null;
  const time = thaiTimeToIso(r.waterlevel_datetime);
  const wl = num(r.waterlevel_msl);
  const bank = num(s.min_bank);
  const ground = num(s.ground_level);
  let pct = num(r.storage_percent);
  if (pct === null && wl !== null && bank !== null && ground !== null && bank > ground) pct = ((wl - ground) / (bank - ground)) * 100;
  const stale = !time || Date.now() - new Date(time).getTime() > STALE_HOURS * 3600e3;
  const diff = num(r.diff_wl_bank);
  return {
    id: s.id,
    code: s.tele_station_oldcode || '',
    name: th(s.tele_station_name),
    lat,
    lng,
    provCode: g.province_code || '',
    prov: th(g.province_name),
    amphoe: th(g.amphoe_name),
    areaCode: g.area_code || '',
    river: r.river_name || '',
    wl,
    prev: num(r.waterlevel_msl_previous),
    bank,
    ground,
    pct: pct === null ? null : Math.round(pct * 10) / 10,
    over: pct !== null && pct > 100 && diff !== null ? diff : 0,
    discharge: num(r.discharge),
    qmax: num(s.qmax),
    time,
    stale,
    agency: th(r.agency?.agency_shortname),
  };
}

function normalizeRain(rows: any[]): RainStation[] {
  const dayAgo = Date.now() - 24 * 3600e3;
  const out: RainStation[] = [];
  for (const r of rows) {
    const mm = num(r.rain_24h);
    const time = thaiTimeToIso(r.rainfall_datetime);
    const lat = num(r.station?.tele_station_lat);
    const lng = num(r.station?.tele_station_long);
    if (mm === null || !time || lat === null || lng === null || new Date(time).getTime() < dayAgo) continue;
    const areaCode = r.geocode?.area_code;
    // ส่งภาคกลางทั้งหมด ส่วนภาคอื่นเฉพาะจุดที่ฝนตกหนัก เพื่อให้ข้อมูลเบา
    if (areaCode !== '2' && mm < 10) continue;
    out.push({
      name: th(r.station?.tele_station_name),
      prov: th(r.geocode?.province_name),
      provCode: r.geocode?.province_code || '',
      amphoe: th(r.geocode?.amphoe_name),
      lat: round(lat, 4),
      lng: round(lng, 4),
      mm,
      time,
    });
  }
  return out;
}

const photo = (p: any, id: string, title: string, caption: string, source: string, tz: 'th' | 'utc'): Photo | null =>
  p?.media_path
    ? {
        id,
        title,
        caption,
        url: IMG + p.media_path,
        thumb: IMG + (p.media_path_thumb || p.media_path),
        time: thaiTimeToIso(p.media_datetime, tz),
        source,
      }
    : null;

function extractPhotos(main: any): Situation['photos'] {
  const radars: any[] = main?.radar?.data?.data || [];
  const byType = new Map(radars.map(r => [r.radar_type, r]));
  const radarDefs: [string, string, string, string][] = [
    ['njk', 'เรดาร์หนองจอก (กทม.)', 'เรดาร์ของสำนักการระบายน้ำ กทม. ครอบคลุมกรุงเทพฯ และปริมณฑล', 'สำนักการระบายน้ำ กทม.'],
    ['nkm', 'เรดาร์หนองแขม (กทม.)', 'เรดาร์ของสำนักการระบายน้ำ กทม. ฝั่งตะวันตก', 'สำนักการระบายน้ำ กทม.'],
    ['svp120', 'เรดาร์สุวรรณภูมิ', 'เรดาร์กรมอุตุนิยมวิทยา รัศมี 120 กม.', 'กรมอุตุนิยมวิทยา'],
    ['skm240', 'เรดาร์สมุทรสงคราม', 'เรดาร์กรมอุตุนิยมวิทยา รัศมี 240 กม.', 'กรมอุตุนิยมวิทยา'],
    ['takhli', 'เรดาร์ตาคลี (นครสวรรค์)', 'ฝนเหนือลุ่มเจ้าพระยาตอนบน', 'กรมฝนหลวงและการบินเกษตร'],
  ];
  const twoDays = Date.now() - 48 * 3600e3;
  const radar = radarDefs
    .map(([k, t, c, src]) => photo(byType.get(k), k, t, c, src, 'utc'))
    .filter((p): p is Photo => !!p && !!p.time && new Date(p.time).getTime() > twoDays);

  const forecastRows: any[] = main?.pre_rain?.data?.data || [];
  const forecast = forecastRows
    .map((p, i) => photo(p, `rain-d${i + 1}`, `คาดการณ์ฝนวันที่ ${i + 1}`, 'ปริมาณฝนสะสม 24 ชม. (07:00–07:00) แบบจำลอง WRF-ROMS ละเอียด 3 กม.', 'สสน. (HII)', 'th'))
    .filter((p): p is Photo => !!p);

  const regionRows: any[] = main?.pre_rain_sea?.data?.data || [];
  const forecastRegion = regionRows
    .map((p, i) => photo(p, `sea-d${i + 1}`, `คาดการณ์ฝนภูมิภาค วันที่ ${i + 1}`, 'คาดการณ์ฝนล่วงหน้า 7 วัน ครอบคลุมเอเชียตะวันออกเฉียงใต้', 'สสน. (HII)', 'th'))
    .filter((p): p is Photo => !!p);

  const st = main?.storm?.data?.data || {};
  const storm = [
    photo(st.us?.[0], 'storm-us', 'แผนที่พายุ (JTWC)', 'เส้นทางพายุในมหาสมุทรแปซิฟิกและทะเลจีนใต้', 'Joint Typhoon Warning Center', 'th'),
    photo(st.college?.[0], 'storm-ucl', 'แผนที่พายุ (TSR)', 'เส้นทางพายุโซนร้อนจาก Tropical Storm Risk', 'Tropical Storm Risk (UCL)', 'th'),
    photo(st.kochi?.[0], 'storm-kochi', 'ภาพดาวเทียม (Kochi)', 'ภาพเมฆจากดาวเทียมเหนือเอเชีย', 'Kochi University', 'th'),
  ].filter((p): p is Photo => !!p);

  return { radar, forecast, forecastRegion, storm };
}

const DAM_NAMES = ['ภูมิพล', 'สิริกิติ์', 'แควน้อยบำรุงแดน', 'ป่าสักชลสิทธิ์', 'ศรีนครินทร์', 'วชิราลงกรณ'];

function extractDams(main: any): Dam[] {
  const rows: any[] = main?.dam?.data?.data || [];
  return DAM_NAMES.map(n => rows.find(r => th(r.dam?.dam_name) === n))
    .filter(Boolean)
    .map(r => {
      const cctv: string | null = r.cctv?.url || null;
      return {
        name: th(r.dam.dam_name),
        nameEn: r.dam.dam_name?.en || '',
        storagePct: num(r.dam_storage_percent),
        storage: num(r.dam_storage),
        maxStorage: num(r.dam?.max_storage),
        inflow: num(r.dam_inflow),
        released: num(r.dam_released),
        date: r.dam_date,
        // กล้องบางตัวเป็น http/mjpeg ซึ่งเบราว์เซอร์บล็อกบนเว็บ https จึงใช้เฉพาะภาพนิ่ง https
        cctv: cctv && cctv.startsWith('https://') && /\.(jpe?g|png)$/i.test(cctv) ? cctv : null,
      };
    });
}

/** บางสถานีส่งข้อมูลทุก 10 นาที เก็บไว้ชั่วโมงละจุด (จุดสุดท้ายของชั่วโมง) */
function hourly(points: GraphPoint[]): GraphPoint[] {
  const byHour = new Map<string, GraphPoint>();
  for (const p of points) byHour.set(p.t.slice(0, 13), p);
  return [...byHour.values()];
}

/** ตัดค่าที่เซนเซอร์กระโดดผิดปกติ (ต่างจากจุดข้างเคียงทั้งสองฝั่งเกิน 1.5 ม. ไปทางเดียวกัน) */
function despike(points: GraphPoint[]): GraphPoint[] {
  // หาค่าก่อนหน้า/ถัดไปที่ไม่ว่าง แบบ O(n)
  const n = points.length;
  const prev: (number | null)[] = new Array(n);
  const next: (number | null)[] = new Array(n);
  let last: number | null = null;
  for (let i = 0; i < n; i++) { prev[i] = last; if (points[i].v !== null) last = points[i].v; }
  last = null;
  for (let i = n - 1; i >= 0; i--) { next[i] = last; if (points[i].v !== null) last = points[i].v; }
  return points.map((p, i) => {
    const a = prev[i], b = next[i];
    if (p.v === null || a === null || b === null) return p;
    const spike = Math.abs(p.v - a) > 1.5 && Math.abs(p.v - b) > 1.5 && Math.sign(p.v - a) === Math.sign(p.v - b);
    return spike ? { ...p, v: null } : p;
  });
}

function computeStats(points: GraphPoint[], bank: number | null): GraphStats {
  const vs = points.filter(p => p.v !== null) as { t: string; v: number }[];
  const qs = points.filter(p => p.q !== null) as { t: string; q: number }[];
  const pick = (arr: { t: string; v: number }[], better: (a: number, b: number) => boolean) =>
    arr.reduce<{ t: string; v: number } | null>((m, p) => (!m || better(p.v, m.v) ? { t: p.t, v: p.v } : m), null);
  return {
    hours: vs.length,
    first: vs.length ? { t: vs[0].t, v: vs[0].v } : null,
    last: vs.length ? { t: vs[vs.length - 1].t, v: vs[vs.length - 1].v } : null,
    max: pick(vs, (a, b) => a > b),
    min: pick(vs, (a, b) => a < b),
    avg: vs.length ? Math.round((vs.reduce((s, p) => s + p.v, 0) / vs.length) * 100) / 100 : null,
    hoursOverBank: bank === null ? 0 : vs.filter(p => p.v > bank).length,
    qMax: pick(qs.map(p => ({ t: p.t, v: p.q })), (a, b) => a > b),
  };
}

/** ย่อจุดให้เหลือไม่เกิน ~400 จุด โดยเก็บค่าสูงสุดของแต่ละช่วง (สำคัญที่สุดสำหรับเรื่องน้ำท่วม) */
function downsample(points: GraphPoint[], maxPoints = 400): { step: number; points: GraphPoint[] } {
  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  if (step === 1) return { step, points };
  const out: GraphPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    const chunk = points.slice(i, i + step);
    const vs = chunk.map(p => p.v).filter((x): x is number => x !== null);
    const qs = chunk.map(p => p.q).filter((x): x is number => x !== null);
    out.push({ t: chunk[chunk.length - 1].t, v: vs.length ? Math.max(...vs) : null, q: qs.length ? Math.max(...qs) : null });
  }
  return { step, points: out };
}

export const GRAPH_DAYS = [1, 7, 30, 90, 365] as const;

export async function fetchGraph(stationId: number, code: string, name: string, days = 7): Promise<Graph> {
  const ymd = (d: Date) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
  const end = new Date();
  const since = Date.now() - days * 864e5;
  const res = await getJSON(
    `public/waterlevel_graph?station_type=tele_waterlevel&station_id=${stationId}&start_date=${ymd(new Date(since))}&end_date=${ymd(end)}`,
    days >= 30 ? 55000 : 20000, // ThaiWater ตอบช่วงยาวช้า (บางครั้ง 15–45 วินาที)
  );
  const d = res?.data || {};
  const bank = num(d.min_bank);
  const all = despike(
    hourly(
      (d.graph_data || [])
        .map((p: any) => ({ t: thaiTimeToIso(p.datetime), v: num(p.value), q: num(p.discharge) }))
        .filter((p: any) => p.t && (p.v !== null || p.q !== null) && new Date(p.t).getTime() >= since),
    ),
  );
  const ds = downsample(all);
  return { code, name, bank, qmax: num(d.qmax), days, step: ds.step, points: ds.points, stats: computeStats(all, bank) };
}

async function build(): Promise<Situation> {
  const errors: string[] = [];
  const [wl, rain, main] = await Promise.allSettled([
    getJSON('public/waterlevel_load'),
    getJSON('public/rain_24h'),
    getJSON('public/thailand_main', 30000),
  ]);
  if (wl.status !== 'fulfilled') throw wl.reason;
  if (rain.status !== 'fulfilled') errors.push('rain');
  if (main.status !== 'fulfilled') errors.push('main');

  const stations = ((wl.value?.waterlevel_data?.data || []) as any[]).map(normalizeStation).filter((s): s is Station => !!s);
  const rainRows = rain.status === 'fulfilled' ? normalizeRain(rain.value?.data || []) : [];
  const mainVal = main.status === 'fulfilled' ? main.value : null;

  const by = new Map(stations.map(s => [s.code, s]));
  const graphCodes = [KEY.nakhonSawan, KEY.chaoPhrayaDam, KEY.samSen, KEY.nonthaburi];
  const graphResults = await Promise.allSettled(
    graphCodes.map(c => {
      const s = by.get(c);
      return s ? fetchGraph(s.id, s.code, s.name) : Promise.resolve(null);
    }),
  );
  const graphs: Record<string, Graph | null> = {};
  graphCodes.forEach((c, i) => {
    const r = graphResults[i];
    graphs[c] = r.status === 'fulfilled' ? r.value : null;
    if (r.status !== 'fulfilled') errors.push(`graph ${c}`);
  });

  const metroTimes = stations.filter(s => METRO.includes(s.provCode) && s.time && !s.stale).map(s => new Date(s.time!).getTime());

  return {
    fetchedAt: new Date().toISOString(),
    latest: metroTimes.length ? new Date(Math.max(...metroTimes)).toISOString() : null,
    stations,
    rain: rainRows,
    dams: mainVal ? extractDams(mainVal) : [],
    photos: mainVal ? extractPhotos(mainVal) : { radar: [], forecast: [], forecastRegion: [], storm: [] },
    graphs,
    overall: assessOverall(stations, rainRows, graphs),
    errors,
  };
}

// แคชในหน่วยความจำ 10 นาที (ThaiWater อัปเดตทุก 10 นาที) และรวมคำขอที่เข้ามาพร้อมกัน
let cache: { at: number; data: Situation } | null = null;
let inflight: Promise<Situation> | null = null;

export async function getSituation(): Promise<Situation> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!inflight) {
    inflight = build()
      .then(data => {
        cache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (e) {
    if (cache) return cache.data; // ใช้ข้อมูลเก่าถ้า ThaiWater ล่ม
    throw e;
  }
}
