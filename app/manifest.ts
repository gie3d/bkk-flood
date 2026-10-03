import type { MetadataRoute } from 'next';

/** ให้ "เพิ่มไปยังหน้าจอโฮม" ได้ไอคอนคลื่นน้ำ ฟ้า และพระอาทิตย์ และเปิดแบบแอป (ไม่มีแถบเบราว์เซอร์) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'น้ำจะท่วมบ้านไหม? — เช็กสถานการณ์น้ำใกล้บ้านคุณ',
    short_name: 'น้ำจะท่วมไหม',
    description: 'เช็กสถานการณ์น้ำกรุงเทพฯ และปริมณฑลตามตำแหน่งบ้านของคุณ พร้อมคำแนะนำว่าควรทำอะไร',
    lang: 'th',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#0f5fa8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // ภาพเต็มกรอบ จึงใช้เป็น maskable ได้ (Android ตัดเป็นวงกลม/สี่เหลี่ยมมนเอง) พระอาทิตย์อยู่ในเขตปลอดภัย 80%
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
