# Architecture

## System Overview
The project has two main parts:

- `Dataset/` for the data preparation pipeline
- `aqi-dashboard/` for the React + Vite frontend

## Data Layer
The data pipeline transforms raw Excel workbooks into static JSON files that the frontend can fetch on demand.

Flow:
1. Raw station files are cleaned and standardized.
2. Station names are aligned and merged into a master AQI table.
3. Stations are geocoded and linked to stable `station_id` values.
4. Coverage, road, bridge, trio-bridge, and trio-road geometry are generated as build-time artifacts.
5. Final per-station JSON files and static coverage/road/trio exports are written to `aqi-dashboard/public/data/`.
6. Live AQI comes from CPCB's real-time feed on data.gov.in, fetched server-side by `aqi-dashboard/shared/cpcbFeed.mjs` and served at `/api/cpcb` by the Vite dev server, Render (`server.mjs`) and Netlify. WAQI requests go through `/api/waqi` (Render) or a Netlify function. Either way, the keys stay on the server. See [Live Data Sources](./live-data-sources.md).

## Frontend Layer
The frontend is built with:

- React 19
- Vite
- TypeScript
- Tailwind CSS
- `react-leaflet` and `leaflet`
- `chart.js` and `react-chartjs-2`

## State Management
The dashboard uses a shared `StationContext` to hold:

- selected station
- live or historical mode
- coverage mode
- selected date range
- selected trio stations for the dedicated trio overlay

This keeps the map, sidebar, comparison table, chart, and summary stats in sync.

The live-data path uses dedicated hooks and helpers:

- `useLiveAqi` handles polling, caching and stale-state exposure, and picks the source in order: CPCB station → WAQI station → nearest live WAQI sensor → newest stale official reading.
- `src/utils/cpcb.ts` loads `/api/cpcb`, matches stations by name and computes AQI as the highest CPCB sub-index.
- `useWaqiLiveStation` adapts the live payload (from any source) for station UI components.
- `usePrefetchWaqiLiveStations` warms the live cache before the user opens the station details.
- `aqi-dashboard/src/data/waqiStationUids.ts` stores the station-to-WAQI UID mapping.
- `AqiMap` keeps the last known live summary locally so the map can continue to color cells when fresh data drops out.
- `AqiMap` also passes the shared station color map into the trio bridge and trio road layers so those overlays stay aligned with live or historical station colors.
- `StationContext` stores the selected trio stations as an independent set so the trio selector stays separate from the main coverage toggle state.
- `CoverageLayer` and `RoadLayer` read the shared stale flag so freshness styling stays consistent across overlays.

## Performance Notes

- Leaflet and chart code are split into separate chunks.
- The coverage, road, and trio overlay layers are lazy-loaded.
- The historical chart panel is lazy-loaded.
- Station JSON is fetched only when needed.
- Live readings are cached in memory and IndexedDB. The CPCB feed is cached for 5 minutes on the server and 2 minutes in the browser, and is shared by all stations.
- Historical filtering is done client-side on the fetched JSON.

