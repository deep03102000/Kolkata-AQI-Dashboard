# Architecture

## System Overview
The project has three parts:

- `Dataset/`: the data preparation pipeline (Python scripts and notes)
- `aqi-dashboard/`: the React + Vite frontend, its build-time geometry scripts and a small server layer
- `docs/`: project documentation

Historical data is static: it is prepared once and served as files. Live data is fetched at runtime from three external sources, two of them through same-origin server routes so API keys stay off the browser.

```
                ┌────────────── browser ──────────────┐
static files ──▶│ station JSON, coverage, roads, trio │
                │                                     │
/api/cpcb ─────▶│ live AQI (primary)                  │◀── server route ── data.gov.in (CPCB)
/api/waqi ─────▶│ live AQI (fallback)                 │◀── server route ── api.waqi.info
                │ temperature & humidity              │◀── direct ──────── api.open-meteo.com
                └─────────────────────────────────────┘
```

## Data Layer
1. Raw station files are cleaned and standardized.
2. Station names are aligned and merged into a master AQI table.
3. Stations are geocoded and linked to stable `station_id` values (CPCB's own site IDs, such as `site_5238`).
4. Coverage, road, bridge, trio-bridge and trio-road geometry are generated as build-time artifacts in `aqi-dashboard/scripts/`.
5. Per-station JSON (15-minute readings, 2024-01-01 to 2025-12-31) and static overlay exports are written to `aqi-dashboard/public/data/`.

## Live Data Layer
See [Live Data Sources](./live-data-sources.md) for the full reference.

| Source | Route | Role |
|---|---|---|
| CPCB real-time feed (data.gov.in) | `/api/cpcb` via `shared/cpcbFeed.mjs` | Primary live AQI, hourly |
| WAQI station feed | `/api/waqi` | Fallback when CPCB is more than 6 h old |
| Nearest live WAQI sensor (≤ 5 km) | `/api/waqi` | Second fallback, named in the UI |
| Open-Meteo current weather | direct from the browser | Temperature and humidity estimates |

`shared/cpcbFeed.mjs` is used in three places so behaviour matches everywhere:

- the Vite dev and preview servers (`vite.config.js`)
- Render (`server.mjs`)
- Netlify (`netlify/functions/cpcb.mjs`, through a redirect in `netlify.toml`)

## Frontend Layer
React 19, Vite, TypeScript and Tailwind CSS 4, with `react-leaflet`/`leaflet` for the map and `chart.js`/`react-chartjs-2` for the chart. No animation or date-picker libraries: motion is CSS, and dates use native inputs.

### Layout
- **`ControlBar`:** stays at the top of the screen. It holds the Live/Historical toggle, station picker, date inputs and range presets.
- **`AqiMap`:** the map with markers, popups and overlay layers.
- **`StationSidebar`:** the station list with AQI chips, the selected-station card (`LiveStationCard`, or the date-range average) and the map-layer controls (`TrioStationSelector`).
- **`SelectedStationChartPanel` → `ChartPanel` (lazy):** the pollutant trend and `SummaryStats`.
- **`ComparisonTable`:** all six stations with an AQI bar and a short source line.
- **`Legend`:** colour bands and data-source notes.

On phones the order is controls → map → station panel → chart → table → legend; on desktop the station panel takes the right-hand column.

### State
`StationContext` holds the shared state:

- the selected station
- Live/Historical mode
- the date range
- the coverage mode
- the overlay toggles
- the selected trio stations

The map, sidebar, table and chart all read it, so they stay in sync.

### Live data hooks
- **`useLiveAqi`:** picks the source per station (CPCB → WAQI station → nearest sensor → newest stale official reading). It polls every 15 s against in-memory caches, persists readings to IndexedDB and exposes a `stale` flag (older than 6 h).
- **`src/utils/cpcb.ts`:** loads `/api/cpcb` (asking for fresh data on the first request after a page load), matches stations by name and computes AQI as the highest CPCB sub-index.
- **`useWaqiLiveStation` / `usePrefetchWaqiLiveStations`:** adapt live readings for UI components and warm the cache at startup.
- **`useStationWeather` / `src/utils/weather.ts`:** one Open-Meteo request for all stations, refreshed every 10 minutes.
- **`useStationHistory`:** fetches and caches a station's history file on demand (Historical mode, chart, or a missing live pollutant).

### Historical calculations
`getHistoricalRangeAqi` in `src/utils/aqi.ts` averages AQI over every reading in the selected range. The comparison table, sidebar, popups and map colours all use it, so they always agree.

## Performance Notes
- **Bundles:** Leaflet and chart code are separate chunks, and the chart panel is lazy-loaded.
- **Optional layers:** the road, 3 km circle, bridge and trio layers mount only after first being switched on. The road network is about 16 MB raw.
- **History files:** about 8 MB raw each. They load only for Historical mode, the selected station's chart, or a live reading that lacks a pollutant.
- **First open:** about 7 MB in development mode, down from 70 MB.
- **CPCB feed caching:**
  - the server caches it for 5 minutes, or 1 minute once a new hourly reading is due;
  - a page reload answers from cache unless a newer reading could exist;
  - the browser re-asks the server every minute.
- **Animations:** CSS only, and disabled under `prefers-reduced-motion`.
