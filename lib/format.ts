export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? '–' : v.toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined ? '–' : Math.round(v).toLocaleString('th-TH');

/** "2026-09-30 19:50" (เวลาไทย) → ISO */
export function thaiTimeToIso(s: string | null | undefined, tz: 'th' | 'utc' = 'th'): string | null {
  if (!s) return null;
  const base = s.trim().replace(' ', 'T');
  const withSec = base.length <= 16 ? `${base}:00` : base.slice(0, 19);
  const d = new Date(withSec + (tz === 'utc' ? 'Z' : '+07:00'));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const TZ = 'Asia/Bangkok';

export const thDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ' น.'
    : '–';

export const thShort = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ' น.' : '–';

export const thDay = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }) : '–';

export const thDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '–';

export function ago(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '–';
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function distKm(a: number, b: number, c: number, d: number) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(c - a);
  const dLng = toR(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
