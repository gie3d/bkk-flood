import type { Metadata, Viewport } from 'next';
import { Playpen_Sans_Thai } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const playpenThai = Playpen_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-thai',
  display: 'swap',
});

// ลิงก์ภาพตัวอย่าง (og:image) ต้องเป็น URL เต็ม บน Vercel ใช้โดเมนจริงของโปรเจกต์
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'น้ำจะท่วมบ้านไหม? — เช็กสถานการณ์น้ำใกล้บ้านคุณ',
  description:
    'เช็กสถานการณ์น้ำกรุงเทพฯ และปริมณฑลแบบเรียลไทม์ตามตำแหน่งบ้านของคุณ พร้อมคำแนะนำว่าควรทำอะไร ข้อมูลจากคลังข้อมูลน้ำแห่งชาติ (ThaiWater)',
  openGraph: {
    title: 'น้ำจะท่วมบ้านไหม?',
    description: 'เช็กสถานการณ์น้ำใกล้บ้านคุณ พร้อมคำแนะนำว่าควรเตรียมตัวอย่างไร',
    locale: 'th_TH',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1319' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={playpenThai.variable}>
      <body>{children}</body>
    </html>
  );
}
