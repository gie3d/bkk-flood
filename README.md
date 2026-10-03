# น้ำจะท่วมบ้านไหม? (Bangkok flood check)

A Next.js website in Thai. It asks where the user lives, then reads live data from the National Water Data Archive ([ThaiWater](https://www.thaiwater.net/)) and tells them whether they should carry on as normal or start preparing.

## Getting started

```sh
npm install
npm run dev        # http://localhost:3000
```

Other commands: `npm run build`, `npm start`, `npm run lint`

## Deploying to Vercel

Push the project to GitHub, then import it at <https://vercel.com/new>. It needs no environment variables and no extra settings.

- `app/api/situation` returns `Cache-Control: s-maxage=600`, so Vercel's CDN caches it for 10 minutes. ThaiWater is only called about 6 times per hour, however many visitors there are.
- The server also keeps an in-memory cache. If ThaiWater goes down, it keeps serving the last good data.

## Structure

```
app/
  opengraph-image.tsx      share preview image with live C.2 / C.13 numbers (regenerated every 10 min)
  page.tsx                 main page (renders FloodApp)
  api/situation/route.ts   fetches and trims all the data, cached 10 min
  api/graph/route.ts       history for one station (/api/graph?id=…&days=1|7|30|90|365)
components/
  FloodApp.tsx             main state: location, data, 10-minute refresh
  LocationGate.tsx         first step: ask for location (GPS / district / tap on map)
  PersonalHero.tsx         status for the user's area + gauges + graph + rain + radar
  Overview.tsx             Bangkok overview: indicators, water path, river profile, graphs
  Media.tsx                radar images, rain forecasts, storms, live dam cameras
  Stations.tsx             map + station table
  StationHistory.tsx       history + stats (24 h to 1 year) for one station
  StationModal.tsx         full-screen window when a station is tapped (gauge / table / map)
  Prepare.tsx              checklists for each level, sandbag advice by threat
  DrainRate.tsx            how fast the nearest full canal is falling (cm/day, days until below bank)
  Share.tsx                share a text summary (Web Share / copy / LINE)
  charts.tsx               SVG charts (line with tooltip, water gauge, river profile, donut)
lib/
  thaiwater.ts             fetches and normalizes ThaiWater data (server only)
  assess.ts                risk assessment rules (overall and per area, split into upstream vs rain)
  share.ts                 share-text helpers
  floodwall.ts             BMA flood wall height by Chao Phraya section
  districts.ts             approximate centre coordinates for districts
```

## Data used

| ThaiWater endpoint | Used for |
|---|---|
| `public/waterlevel_load` | Water level at about 800 stations nationwide, bank height, % of bank, discharge |
| `public/rain_24h` | 24-hour rainfall |
| `public/thailand_main` | Rain radar, rain forecast maps, storm maps, large-dam data + EGAT dam cameras |
| `public/waterlevel_graph` | Hourly history per station, up to 1 year (long ranges can take 3–45 s from ThaiWater, so they are cached for 1 hour) |

## How the rating works (`lib/assess.ts`)

Every indicator belongs to one of two threats, because they need different responses: **upstream water** (น้ำเหนือ, the Chao Phraya, like 2011) and **rain / waiting-to-drain** (น้ำฝน/น้ำรอระบาย). The page shows a separate answer for each.

**For the user's area** (`assessPlace`): uses water-level stations within 8 km (or the nearest ones within 25 km), rain within 15 km, and the upstream-water indicators.
- Each nearby station is scored by its level relative to the bank: over the bank = level 3, more than 0.5 m over = level 4, 90–100% = level 2. Stations more than 4 km away count one level lower. River stations count toward upstream water; canal stations count toward rain.
- Homes inside the Bangkok area get at most level 2 from upstream water, unless the user ticks "riverside / outside the flood wall". In that case the river's current level is used directly, and a C.13 release of 2,000+ m³/s raises them to at least level 3.
- "Low-lying area" adds one level to the rain threat when there is rain or a canal is nearly full.
- The overall level is the higher of the two threats. The Prepare checklist and sandbag advice follow whichever threat is higher.

**For Bangkok as a whole** (`assessOverall`), per threat, the highest level among:
- Upstream: C.2 Nakhon Sawan and C.13 Chao Phraya Dam flow: <2,000 / <3,000 / <3,500 / more (m³/s). 2,000+ means riverside homes outside the flood wall should move belongings; 3,000+ means Bangkok as a whole is affected (`FLOW` in `lib/assess.ts`).
- Upstream: Chao Phraya at Sam Sen / Bangkok Bridge: each station's 24-hour peak compared with the flood wall for its river section; the station closest to its wall decides. Section heights come from the BMA Drainage and Sewerage Department (`lib/floodwall.ts`): north of Krung Thon Bridge +3.50, Krung Thon–Pinklao +3.25, Pinklao–Memorial Bridge +3.00, Memorial Bridge–Bang Na +2.80 m MSL. These are design heights per section, not surveyed at each station.
- Upstream: Nonthaburi (CPY014): % of bank (capped at level 2, because it affects riverside homes only)
- Rain: Bangkok canals (capped at level 2, because they are local problems)
- Rain: 24 h rainfall: <35 / <90 / more (mm). The note compares it with the ~60 mm/hour Bangkok drains can handle; ThaiWater has no usable hourly rain for Bangkok stations.

RID station C.29A (Bang Sai, the flow entering Pathum Thani and Bangkok) is not published by ThaiWater, so the water path links to RID's site for it.

> These thresholds are simple rules made for this site. They are not official government announcements. Adjust them to match guidance from the Royal Irrigation Department (RID) and the Bangkok Drainage and Sewerage Department.
