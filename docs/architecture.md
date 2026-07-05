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
4. Coverage and road geometry are generated as build-time artifacts.
5. Final per-station JSON files and static coverage/road exports are written to `aqi-dashboard/public/data/`.
6. Live WAQI requests can be routed through a Netlify function that injects the secret token server-side.

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

This keeps the map, sidebar, comparison table, chart, and summary stats in sync.

The live-data path uses dedicated hooks and helpers:

- `useLiveAqi` handles polling, caching, fallback behavior, and stale-state exposure.
- `useWaqiLiveStation` adapts the WAQI payload for station UI components.
- `usePrefetchWaqiLiveStations` warms the live cache before the user opens the station details.
- `aqi-dashboard/src/data/waqiStationUids.ts` stores the station-to-WAQI UID mapping.
- `AqiMap` keeps the last known live summary locally so the map can continue to color cells when fresh data drops out.
- `CoverageLayer` and `RoadLayer` read the shared stale flag so freshness styling stays consistent across overlays.

## Performance Notes

- Leaflet and chart code are split into separate chunks.
- The coverage and road layers are lazy-loaded.
- The historical chart panel is lazy-loaded.
- Station JSON is fetched only when needed.
- Live WAQI responses are cached in memory and IndexedDB.
- Historical filtering is done client-side on the fetched JSON.
