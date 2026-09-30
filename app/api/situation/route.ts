import { getSituation } from '@/lib/thaiwater';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await getSituation();
    return Response.json(data, {
      headers: {
        // ให้ CDN (เช่น Vercel) แคช 10 นาที และเสิร์ฟของเก่าระหว่างรีเฟรช
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    console.error('situation failed', err);
    return Response.json({ error: 'ไม่สามารถเชื่อมต่อคลังข้อมูลน้ำแห่งชาติได้' }, { status: 502 });
  }
}
