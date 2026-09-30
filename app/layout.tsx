import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export const metadata: Metadata = {
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
    <html lang="th" className={plexThai.variable}>
      <body>{children}</body>
    </html>
  );
}
