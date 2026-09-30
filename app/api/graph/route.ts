import { fetchGraph, getSituation } from '@/lib/thaiwater';
import type { Graph } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<number, { at: number; data: Graph }>();

/** กราฟย้อนหลัง 7 วันของสถานีเดียว — /api/graph?id=2599 */
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'invalid id' }, { status: 400 });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return ok(hit.data);

  try {
    // รับเฉพาะสถานีที่มีอยู่จริงใน ThaiWater เพื่อไม่ให้ถูกใช้เป็น proxy ทั่วไป
    const { stations } = await getSituation();
    const s = stations.find(x => x.id === id);
    if (!s) return Response.json({ error: 'not found' }, { status: 404 });
    const data = await fetchGraph(s.id, s.code, s.name);
    if (cache.size > 500) cache.clear();
    cache.set(id, { at: Date.now(), data });
    return ok(data);
  } catch (err) {
    console.error('graph failed', err);
    return Response.json({ error: 'upstream error' }, { status: 502 });
  }
}

const ok = (data: Graph) =>
  Response.json(data, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } });
