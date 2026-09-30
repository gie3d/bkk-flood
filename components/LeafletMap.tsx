'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import { STATUS, stationStatus } from '@/lib/assess';
import { fmt, fmtInt, thShort } from '@/lib/format';
import type { Place, Station, StationStatus } from '@/lib/types';

interface Props {
  stations?: Station[];
  place?: Place | null;
  onPick?: (lat: number, lng: number) => void;
  onStation?: (id: number) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  label?: string;
}

const ORDER: Record<StationStatus, number> = { stale: 0, ok: 1, high: 2, near: 3, over: 4 };

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function popupHtml(s: Station) {
  const st = stationStatus(s);
  const trend = s.wl !== null && s.prev !== null ? s.wl - s.prev : null;
  return `<b>${esc(s.name)}</b> <small>${esc(s.code)}</small><br>
    ${esc(s.river)}${s.river ? ' · ' : ''}อ.${esc(s.amphoe)} จ.${esc(s.prov)}<br>
    ระดับน้ำ <b>${fmt(s.wl)}</b> ม.รทก. · ตลิ่ง ${fmt(s.bank)} ม.<br>
    <span style="color:${STATUS[st].color};font-weight:600">${STATUS[st].label}${s.pct !== null ? ` (${Math.round(s.pct)}%)` : ''}</span>
    ${trend !== null && Math.abs(trend) >= 0.01 && Math.abs(trend) < 1 ? ` · ${trend > 0 ? '▲' : '▼'} ${Math.abs(trend * 100).toFixed(0)} ซม.` : ''}
    ${s.discharge !== null ? `<br>ปริมาณน้ำ ${fmtInt(s.discharge)} ลบ.ม./วินาที` : ''}
    <br><small>${esc(thShort(s.time))} · ${esc(s.agency)}</small>
    <br><button type="button" class="popup-more" data-station="${s.id}">ดูข้อมูลย้อนหลัง →</button>`;
}

export default function LeafletMap({ stations, place, onPick, onStation, center = [13.85, 100.55], zoom = 9, className = 'mapbox', label = 'แผนที่' }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const pin = useRef<Leaflet.Marker | null>(null);
  const pickRef = useRef(onPick);
  const stationRef = useRef(onStation);
  useEffect(() => {
    pickRef.current = onPick;
    stationRef.current = onStation;
  }, [onPick, onStation]);

  // ปุ่ม "ดูข้อมูลย้อนหลัง" อยู่ใน popup ของ Leaflet (HTML ธรรมดา) จึงดักคลิกที่กล่องแผนที่
  useEffect(() => {
    const node = el.current;
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-station]');
      if (btn) stationRef.current?.(Number(btn.dataset.station));
    };
    node?.addEventListener('click', onClick);
    return () => node?.removeEventListener('click', onClick);
  }, []);
  const initial = useRef({ center, zoom });

  // สร้างแผนที่ครั้งเดียว (Leaflet ใช้ window จึงโหลดเฉพาะฝั่งเบราว์เซอร์)
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(mod => {
      if (cancelled || !el.current || map.current) return;
      const lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);
      L.current = lf;
      const m = lf.map(el.current, { scrollWheelZoom: false }).setView(initial.current.center, initial.current.zoom);
      lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap · ข้อมูลน้ำ &copy; ThaiWater',
      }).addTo(m);
      layer.current = lf.layerGroup().addTo(m);
      m.on('click', e => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      // แจ้งให้ effect อื่นวาดใหม่
      el.current.dispatchEvent(new Event('mapready'));
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      pin.current = null;
    };
  }, []);

  // วาดจุดสถานี
  useEffect(() => {
    const draw = () => {
      const lf = L.current;
      if (!lf || !layer.current) return;
      layer.current.clearLayers();
      (stations ?? [])
        .slice()
        .sort((a, b) => ORDER[stationStatus(a)] - ORDER[stationStatus(b)])
        .forEach(s => {
          const st = stationStatus(s);
          lf.circleMarker([s.lat, s.lng], {
            radius: st === 'over' ? 8 : st === 'near' ? 7 : 6,
            color: '#fff',
            weight: 1.5,
            fillColor: STATUS[st].color,
            fillOpacity: st === 'stale' ? 0.55 : 0.95,
          })
            .bindPopup(popupHtml(s))
            .addTo(layer.current!);
        });
    };
    draw();
    const node = el.current;
    node?.addEventListener('mapready', draw);
    return () => node?.removeEventListener('mapready', draw);
  }, [stations]);

  // หมุดบ้าน
  useEffect(() => {
    const drawPin = () => {
      const lf = L.current;
      const m = map.current;
      if (!lf || !m) return;
      pin.current?.remove();
      pin.current = null;
      if (!place) return;
      const icon = lf.divIcon({ className: '', html: '<div class="home-pin" style="width:26px;height:26px"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });
      pin.current = lf.marker([place.lat, place.lng], { icon, zIndexOffset: 1000, title: place.name }).addTo(m).bindTooltip(place.name, { direction: 'top', offset: [0, -24] });
      m.setView([place.lat, place.lng], Math.max(m.getZoom(), 11), { animate: true });
    };
    drawPin();
    const node = el.current;
    node?.addEventListener('mapready', drawPin);
    return () => node?.removeEventListener('mapready', drawPin);
  }, [place]);

  return <div ref={el} className={className} role="region" aria-label={label} />;
}
