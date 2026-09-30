import { fetchGraph, getSituation, GRAPH_DAYS } from '@/lib/thaiwater';
import type { Graph } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ช่วงสั้นเปลี่ยนทุก 10 นาที ช่วงยาว (30 วันขึ้นไป) แทบไม่เปลี่ยน จึงแคชนานกว่า
const ttlMs = (days: number) => (days >= 30 ? 60 : 10) * 60 * 1000;
const cache = new Map<string, { at: number; data: Graph }>();

/** ข้อมูลย้อนหลังของสถานีเดียว — /api/graph?id=2599&days=7 (days: 1, 7, 30, 90, 365) */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = Number(params.get('id'));
  const days = Number(params.get('days') ?? 7);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'invalid id' }, { status: 400 });
  if (!(GRAPH_DAYS as readonly number[]).includes(days)) return Response.json({ error: 'invalid days' }, { status: 400 });

  const key = `${id}:${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs(days)) return ok(hit.data);

  try {
    // รับเฉพาะสถานีที่มีอยู่จริงใน ThaiWater เพื่อไม่ให้ถูกใช้เป็น proxy ทั่วไป
    const { stations } = await getSituation();
    const s = stations.find(x => x.id === id);
    if (!s) return Response.json({ error: 'not found' }, { status: 404 });
    const data = await fetchGraph(s.id, s.code, s.name, days);
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), data });
    return ok(data);
  } catch (err) {
    console.error('graph failed', err);
    return Response.json({ error: 'upstream error' }, { status: 502 });
  }
}

const ok = (data: Graph) =>
  Response.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${ttlMs(data.days) / 1000}, stale-while-revalidate=${(ttlMs(data.days) / 1000) * 3}` },
  });
