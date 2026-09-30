'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessPlace } from '@/lib/assess';
import type { HouseOpts, Photo, Place, Situation } from '@/lib/types';
import LocationGate from './LocationGate';
import PersonalHero from './PersonalHero';
import Overview from './Overview';
import { Dams, Lightbox, PhotoGallery } from './Media';
import { StationMap, StationTable } from './Stations';
import Prepare from './Prepare';
import { IconDrop, IconPin } from './icons';

const REFRESH_MS = 10 * 60 * 1000;
const LS_PLACE = 'bkkflood.place';
const LS_OPTS = 'bkkflood.opts';
const LS_SKIP = 'bkkflood.skip';

type Mode = 'loading' | 'gate' | 'personal' | 'skipped';

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch { /* storage ถูกปิด */ }
}

export default function FloodApp() {
  const [data, setData] = useState<Situation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [place, setPlace] = useState<Place | null>(null);
  const [opts, setOpts] = useState<HouseOpts>({ river: false, low: false, oneFloor: false });
  const [photo, setPhoto] = useState<Photo | null>(null);

  // อ่านตำแหน่งที่บันทึกไว้ (ทำหลัง mount เพราะ localStorage มีเฉพาะฝั่งเบราว์เซอร์)
  useEffect(() => {
    const p = read<Place>(LS_PLACE);
    const o = read<HouseOpts>(LS_OPTS);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (o) setOpts(o);
    if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
      setPlace(p);
      setMode('personal');
    } else {
      setMode(read<boolean>(LS_SKIP) ? 'skipped' : 'gate');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/situation');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(null);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลล่าสุดได้ จะลองใหม่อัตโนมัติ');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลครั้งแรกและตั้งเวลาอัปเดต
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const choosePlace = (p: Place) => {
    setPlace(p);
    write(LS_PLACE, p);
    write(LS_SKIP, null);
    setMode('personal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const changeOpts = (o: HouseOpts) => {
    setOpts(o);
    write(LS_OPTS, o);
  };
  const skip = () => {
    write(LS_SKIP, true);
    setMode('skipped');
  };
  const openGate = () => {
    setMode('gate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePhoto = useCallback(() => setPhoto(null), []);

  const personalLevel = data && place ? assessPlace(place, opts, data.stations, data.rain, data.overall).level : data?.overall.level ?? 0;

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href="#top"><span className="brand-mark"><IconDrop /></span>น้ำจะท่วมบ้านไหม?</a>
          <nav className="topnav" aria-label="เมนู">
            <a href="#overview">ภาพรวม</a>
            <a href="#photos">ภาพเรดาร์</a>
            <a href="#map">แผนที่</a>
            <a href="#dams">เขื่อน</a>
            <a href="#prepare">เตรียมตัว</a>
          </nav>
          {mode !== 'gate' && mode !== 'loading' && (
            <button type="button" className="place-chip" onClick={openGate} title="เปลี่ยนพื้นที่">
              <IconPin size={14} /> {place ? place.name : 'เลือกพื้นที่ของฉัน'}
            </button>
          )}
        </div>
      </header>

      <main>
        {error && <div className="wrap" style={{ paddingTop: 12 }}><p className="banner" role="status">{error}</p></div>}

        {mode === 'loading' && <div className="wrap hero"><div className="skeleton" style={{ minHeight: 320 }} /></div>}

        {mode === 'gate' && (
          <LocationGate
            opts={opts}
            onOpts={changeOpts}
            onPlace={choosePlace}
            onSkip={place ? undefined : skip}
            onCancel={place ? () => setMode('personal') : undefined}
          />
        )}

        {mode === 'personal' && place && (
          data ? (
            <PersonalHero data={data} place={place} opts={opts} onOpts={changeOpts} onChangePlace={openGate} onPhoto={setPhoto} />
          ) : (
            <div className="wrap hero">
              <p className="eyebrow">กำลังดึงข้อมูลระดับน้ำล่าสุดสำหรับ {place.name}…</p>
              <div className="skeleton" style={{ minHeight: 320 }} />
            </div>
          )
        )}

        {mode === 'skipped' && (
          <section className="hero">
            <div className="wrap">
              <div className="panel" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '1.4rem', marginBottom: 2 }}>อยากรู้ว่าบ้านคุณเสี่ยงไหม?</h1>
                  <p className="muted" style={{ margin: 0 }}>บอกตำแหน่งบ้าน แล้วเราจะประเมินจากสถานีวัดน้ำที่ใกล้คุณที่สุด</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openGate}><IconPin size={18} /> เลือกพื้นที่ของฉัน</button>
              </div>
            </div>
          </section>
        )}

        {data ? (
          <>
            <Overview data={data} place={place} />

            <section className="section" id="photos">
              <div className="wrap">
                <h2>ภาพเรดาร์และคาดการณ์ฝน</h2>
                <p className="lead">ดูว่าตอนนี้ฝนตกตรงไหน และจะตกอีกไหมในวันข้างหน้า</p>
                <PhotoGallery data={data} onOpen={setPhoto} />
              </div>
            </section>

            <section className="section alt" id="map">
              <div className="wrap">
                <h2>แผนที่สถานีวัดระดับน้ำ</h2>
                <p className="lead">สีแสดงระดับน้ำเทียบกับตลิ่ง แตะที่จุดเพื่อดูรายละเอียด</p>
                <StationMap stations={data.stations} place={place} />
                <h3 className="subhead">ระดับน้ำรายสถานี</h3>
                <StationTable stations={data.stations} place={place} />
              </div>
            </section>

            <section className="section" id="dams">
              <div className="wrap">
                <h2>เขื่อนใหญ่ต้นน้ำ</h2>
                <p className="lead">ปริมาณน้ำในเขื่อนและภาพสดจากกล้องของการไฟฟ้าฝ่ายผลิตแห่งประเทศไทย</p>
                <Dams dams={data.dams} onOpen={setPhoto} />
              </div>
            </section>
          </>
        ) : !error ? (
          <div className="wrap section"><div className="skeleton" /></div>
        ) : null}

        <section className="section alt" id="prepare">
          <div className="wrap">
            <h2>เตรียมตัวอย่างไรดี</h2>
            <p className="lead">ทำตามระดับสถานการณ์ ไม่ต้องตื่นตระหนก แต่ไม่ควรประมาท ติ๊กรายการที่ทำแล้ว (บันทึกไว้ในเครื่องของคุณ)</p>
            <Prepare level={personalLevel} />
          </div>
        </section>

        <section className="section" id="contacts">
          <div className="wrap">
            <h2>เบอร์โทรฉุกเฉิน</h2>
            <div className="contacts">
              {[['1784', 'ปภ. สายด่วนนิรภัย'], ['1555', 'ศูนย์รับแจ้งเหตุ กทม.'], ['1460', 'กรมชลประทาน'], ['1669', 'เจ็บป่วยฉุกเฉิน'], ['191', 'เหตุด่วนเหตุร้าย'], ['1130', 'การไฟฟ้านครหลวง']].map(([n, l]) => (
                <a key={n} className="contact" href={`tel:${n}`}><b>{n}</b><span>{l}</span></a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <p><b>ที่มาข้อมูล:</b> <a href="https://www.thaiwater.net/" target="_blank" rel="noopener noreferrer">คลังข้อมูลน้ำแห่งชาติ (ThaiWater)</a> โดยสถาบันสารสนเทศทรัพยากรน้ำ (สสน.) ร่วมกับกรมชลประทาน กรมทรัพยากรน้ำ กรมอุตุนิยมวิทยา สำนักการระบายน้ำ กทม. และ กฟผ.</p>
          <p><b>ข้อควรทราบ:</b> ระดับสถานการณ์บนเว็บนี้คำนวณด้วยเกณฑ์อย่างง่ายเพื่อช่วยตัดสินใจเบื้องต้น <u>ไม่ใช่ประกาศทางราชการ</u> โปรดติดตามประกาศจาก{' '}
            <a href="https://www.disaster.go.th/" target="_blank" rel="noopener noreferrer">ปภ.</a>,{' '}
            <a href="https://www.rid.go.th/" target="_blank" rel="noopener noreferrer">กรมชลประทาน</a> และ{' '}
            <a href="https://weather.bangkok.go.th/" target="_blank" rel="noopener noreferrer">สำนักการระบายน้ำ กทม.</a> ประกอบเสมอ</p>
        </div>
      </footer>

      <Lightbox photo={photo} onClose={closePhoto} />
    </>
  );
}
