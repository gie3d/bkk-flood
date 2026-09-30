#!/usr/bin/env node
/**
 * หาทิศของตลิ่งซ้าย/ขวา ของแต่ละสถานีวัดน้ำ แล้วบันทึกเป็น lib/bank-sides.json
 *
 * ThaiWater ให้ค่า left_bank / right_bank ตามหลักอุทกวิทยา คือ "หันหน้าไปทางที่น้ำไหล"
 * ส่วนทิศการไหลของลำน้ำ ดึงจาก OpenStreetMap ซึ่งวาดเส้นทางน้ำ (waterway) ตามทิศที่น้ำไหลเสมอ
 * จากนั้น ตลิ่งซ้าย = ทิศการไหล − 90°, ตลิ่งขวา = ทิศการไหล + 90°
 *
 * รันใหม่เมื่อมีสถานีเพิ่ม:  node scripts/compute-bank-sides.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'lib', 'bank-sides.json');
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const BATCH = 10;
const RADIUS = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const toRad = d => (d * Math.PI) / 180;

function bearing(a, b) {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** ระยะจากจุดถึงส่วนของเส้น (เมตร โดยประมาณแบบระนาบ) */
function segDist(p, a, b) {
  const kx = 111320 * Math.cos(toRad(p.lat)), ky = 110540;
  const ax = (a.lon - p.lon) * kx, ay = (a.lat - p.lat) * ky, bx = (b.lon - p.lon) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

const norm = s => (s || '').replace(/^(แม่น้ำ|คลอง|ลำน้ำ|ลำ|ห้วย|น้ำ)/, '').replace(/\s+/g, '');

function side(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d >= 315 || d < 45) return 'เหนือ';
  if (d < 135) return 'ตะวันออก';
  if (d < 225) return 'ใต้';
  return 'ตะวันตก';
}

async function overpass(query) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = OVERPASS[attempt % OVERPASS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'bkk-flood (bank side precompute)' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(120000),
      });
      if (res.ok) return res.json();
      console.warn(`  overpass ${res.status}, retry`);
    } catch (e) {
      console.warn(`  overpass error ${e.message}, retry`);
    }
    await sleep(5000 * (attempt + 1));
  }
  throw new Error('overpass failed');
}

const wl = await (await fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load')).json();
const stations = wl.waterlevel_data.data
  .map(r => ({ code: r.station.tele_station_oldcode, lat: r.station.tele_station_lat, lon: r.station.tele_station_long, river: r.river_name || '', L: r.station.left_bank, R: r.station.right_bank }))
  .filter(s => s.code && s.lat && s.lon && s.L != null && s.R != null && Math.abs(s.L - s.R) >= 0.05);

const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// ทำสถานีใกล้กรุงเทพฯ ก่อน (ผู้ใช้ส่วนใหญ่อยู่ที่นี่) และหยุดกลางทางได้โดยไม่เสียงานที่ทำแล้ว
const bkkDist = s => Math.hypot(s.lat - 13.76, (s.lon - 100.5) * Math.cos(toRad(13.76)));
const todo = stations.filter(s => !existing[s.code]).sort((a, b) => bkkDist(a) - bkkDist(b));
console.log(`${stations.length} สถานีมีตลิ่งสองฝั่งต่างกัน, ต้องคำนวณ ${todo.length}`);

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const q = `[out:json][timeout:90];(${batch.map(s => `way(around:${RADIUS},${s.lat},${s.lon})[waterway~"^(river|canal|stream|drain)$"];`).join('')});out geom tags;`;
  const j = await overpass(q);
  const ways = j.elements.filter(w => w.geometry?.length > 1);
  for (const s of batch) {
    const p = { lat: s.lat, lon: s.lon };
    let best = null;
    for (const w of ways) {
      const named = s.river && norm(w.tags?.name) && (norm(w.tags.name).includes(norm(s.river)) || norm(s.river).includes(norm(w.tags.name)));
      for (let k = 0; k < w.geometry.length - 1; k++) {
        const d = segDist(p, w.geometry[k], w.geometry[k + 1]);
        if (d > RADIUS) continue;
        // ลำน้ำชื่อตรงกันได้เปรียบ 250 ม.
        const score = d - (named ? 250 : 0);
        if (!best || score < best.score) best = { score, d, w, k, named };
      }
    }
    if (!best) continue;
    const g = best.w.geometry;
    // ใช้ช่วงยาวขึ้นเล็กน้อยรอบจุดใกล้สุดเพื่อลดผลจากโค้งเล็ก ๆ
    const a = g[Math.max(0, best.k - 2)], b = g[Math.min(g.length - 1, best.k + 3)];
    const flow = Math.round(bearing(a, b));
    existing[s.code] = {
      flow,
      left: side(flow - 90),
      right: side(flow + 90),
      match: best.named ? 'name' : 'nearest',
      way: best.w.tags?.name || best.w.tags?.waterway,
      distM: Math.round(best.d),
    };
  }
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 1) + '\n');
  console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  await sleep(3000);
}

console.log(`บันทึก ${Object.keys(existing).length} สถานีที่ ${OUT}`);
