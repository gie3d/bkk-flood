import { fetchThaiWaterImage } from '@/lib/thaiwater';

export const dynamic = 'force-dynamic';

// แคชในหน่วยความจำเล็ก ๆ ช่วยตอนหลายคนขอภาพเดียวกันพร้อมกันก่อน CDN จะมีสำเนา
const MAX_ITEMS = 60;
const memory = new Map<string, Promise<{ body: ArrayBuffer; type: string }>>();

/** ภาพจาก ThaiWater ผ่านเซิร์ฟเวอร์ของเรา — /api/image?p=<media_path> */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams.get('p') ?? '';
  // media_path ของ ThaiWater เป็นรหัส base64url ล้วน ปฏิเสธอย่างอื่นทั้งหมด
  if (!/^[A-Za-z0-9_\-=]{20,400}$/.test(p)) return new Response('bad request', { status: 400 });

  try {
    let job = memory.get(p);
    if (!job) {
      job = fetchThaiWaterImage(p);
      memory.set(p, job);
      job.catch(() => memory.delete(p));
      if (memory.size > MAX_ITEMS) memory.delete(memory.keys().next().value!);
    }
    const { body, type } = await job;
    return new Response(body, {
      headers: {
        'Content-Type': type,
        // media_path มีเวลาของภาพอยู่ในตัว เนื้อหาไม่เปลี่ยน จึงแคชได้นาน
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    });
  } catch (err) {
    console.error('image failed', err);
    return new Response('upstream error', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
