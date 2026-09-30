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
  page.tsx                 main page (renders FloodApp)
  api/situation/route.ts   fetches and trims all the data, cached 10 min
  api/graph/route.ts       7-day graph for one station (/api/graph?id=…)
components/
  FloodApp.tsx             main state: location, data, 10-minute refresh
  LocationGate.tsx         first step: ask for location (GPS / district / tap on map)
  PersonalHero.tsx         status for the user's area + gauges + graph + rain + radar
  Overview.tsx             Bangkok overview: indicators, water path, river profile, graphs
  Media.tsx                radar images, rain forecasts, storms, live dam cameras
  Stations.tsx             map + station table
  Prepare.tsx              checklists for each level
  charts.tsx               SVG charts (line with tooltip, water gauge, river profile, donut)
lib/
  thaiwater.ts             fetches and normalizes ThaiWater data (server only)
  assess.ts                risk assessment rules (overall and per area)
  districts.ts             approximate centre coordinates for districts
```

## Data used

| ThaiWater endpoint | Used for |
|---|---|
| `public/waterlevel_load` | Water level at about 800 stations nationwide, bank height, % of bank, discharge |
| `public/rain_24h` | 24-hour rainfall |
| `public/thailand_main` | Rain radar, rain forecast maps, storm maps, large-dam data + EGAT dam cameras |
| `public/waterlevel_graph` | 7-day history per station |

## How the rating works (`lib/assess.ts`)

**For the user's area** (`assessPlace`): uses water-level stations within 8 km (or the nearest ones within 25 km), rain within 15 km, and the upstream-water indicators.
- Each nearby station is scored by its level relative to the bank: over the bank = level 3, more than 0.5 m over = level 4, 90–100% = level 2. Stations more than 4 km away count one level lower.
- Homes inside the Bangkok area get at most level 2 from upstream water, unless the user ticks "riverside / outside the flood wall". In that case the river's current level is used directly.
- "Low-lying area" adds one level when there is rain or a canal is nearly full.

**For Bangkok as a whole** (`assessOverall`): the highest level among these indicators:
- C.13 Chao Phraya Dam release: <1,500 / <2,500 / <3,000 / more (m³/s)
- C.2 Nakhon Sawan: % of channel capacity: <60 / <80 / <95 / more
- Chao Phraya at Sam Sen / Bangkok Bridge: 24-hour peak compared with the ≈ +2.80 m MSL flood wall
- Nonthaburi (CPY014): % of bank
- Bangkok canals (capped at level 2, because they are local problems)
- Rain 24 h: <35 / <90 / more (mm)

> These thresholds are simple rules made for this site. They are not official government announcements. Adjust them to match guidance from the Royal Irrigation Department (RID) and the Bangkok Drainage and Sewerage Department.
