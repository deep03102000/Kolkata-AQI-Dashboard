# Project Documentation

## Overview
Kolkata AQI Dashboard is a lightweight, static-first air quality dashboard for six CPCB monitoring stations in Kolkata. A one-time data pipeline turns raw station workbooks into compact files, and a React + Vite frontend presents them on an interactive map with charts and comparisons.

Historical data (2024–2025, 15-minute readings) is served as static files, with no database. Live AQI comes from CPCB's official real-time station feed on data.gov.in through a small server route (`/api/cpcb`), with WAQI as a fallback, so API keys never reach the browser. Current temperature and humidity come from Open-Meteo.

## What The Dashboard Shows
- A Kolkata map with the six stations, nearest-station coverage zones and optional overlays: roads, 3 km circles, station-pair bridges, and three-station bridges and roads.
- **Live mode:**
  - each station's official CPCB AQI, updated hourly, with the category and the pollutant sub-indices;
  - temperature and humidity estimates for each station's location;
  - the source of every reading, with a clearly labelled fallback if a station's feed goes offline.
- **Historical mode:**
  - the average AQI for any date range between 2024-01-01 and 2025-12-31;
  - a pollutant trend chart and average, maximum and minimum AQI.
- A comparison table ranking all six stations, live or historical.
- A legend with the CPCB colour bands and notes on each data source.

## Repository Structure
- `Dataset/` contains the data cleaning, validation and export scripts and notes, plus the generated CSV/JSON artifacts.
- `aqi-dashboard/` is the frontend:
  - `src/` is the React app;
  - `public/data/` holds the static data;
  - `scripts/` holds the build-time geometry tooling;
  - `shared/` holds server-side code for `/api/cpcb`;
  - `server.mjs` is the Render server, and `netlify/functions/` holds the Netlify functions.
- `docs/` contains project documentation, architecture notes, phase notes and the seminar report source.
- `README.md` gives the overview and quick start, and `DEPLOYMENT.md` covers hosting.

## Data Preparation Pipeline
1. Raw Excel files are inspected for headers, dates, units and missing values.
2. Missing values are cleaned using interpolation and related fill strategies where appropriate.
3. The cleaned data is standardized to the dashboard schema: `date, pm25, pm10, no2, so2, co, o3, nh3`.
4. A `station_name` column is added and the six station tables are merged into a master long-format table.
5. The stations are geocoded and combined into a station master table with stable IDs.
6. The AQI rows are linked to station IDs and coordinates.
7. Voronoi coverage, road network and bridge/trio overlay artifacts are generated as build-time geometry outputs.
8. Station payloads and overlay files are exported as static JSON/GeoJSON under `aqi-dashboard/public/data/`.

## Live Data
Live AQI is layered on top of the static data, in this order:

1. **CPCB's real-time feed** on data.gov.in (via `/api/cpcb`). It is official and hourly, published about 30–40 minutes after each hour.
2. **WAQI's copy of the station**, if CPCB's reading is more than 6 hours old.
3. **The nearest live WAQI sensor** within 5 km, named in the UI.
4. **The newest stale official reading**, marked "Stale".

The CPCB values are AQI sub-indices, so a station's AQI is its highest one. Full details are in [Live Data Sources](./live-data-sources.md) and [Phase 13](./phase-13-cpcb-live-data.md). Weather is described in [Phase 15](./phase-15-station-weather.md).

## Frontend Architecture
React 19 with Vite, TypeScript and Tailwind CSS 4. Core libraries: `leaflet`, `react-leaflet`, `chart.js`, `react-chartjs-2`. Motion is CSS-only.

Main modules:

- **Shared state:** `StationContext` stores the selected station, mode, date range, coverage mode, overlay toggles and trio selection.
- **Controls:** `ControlBar` is the bar at the top of the screen with the Live/Historical toggle, station picker, dates and range presets.
- **Map:** `AqiMap` renders the map, markers, popups (`StationPopupContent`) and overlay layers. Optional layers mount only once switched on.
- **Station panel:** `StationSidebar` shows the station list with AQI chips, the selected-station card (`LiveStationCard` with `LivePollutantGrid`, or the date-range average) and the map-layer controls (`TrioStationSelector`).
- **Chart:** `SelectedStationChartPanel` and the lazy `ChartPanel` render the pollutant trend; `SummaryStats` shows average, maximum and minimum AQI.
- **Table:** `ComparisonTable` ranks all six stations.
- **Shared visuals:** `Legend` explains the colours and sources; `AnimatedNumber` counts values up to new readings.
- **Data hooks:**
  - `useLiveAqi`, `useWaqiLiveStation` and `usePrefetchWaqiLiveStations` for live AQI;
  - `useStationHistory` for history files;
  - `useStationWeather` for weather.

## State Flow
- Selecting a station on the map, in the list, in the table or in the picker updates `selectedStationId`, and every view follows.
- Switching to Historical selects the last 30 days of data if no dates are set. The table, station list, sidebar card and popups then show date-range averages, and live polling pauses.
- The chart reads the selected station's history and filters it by date range. In Live mode it shows the last recorded day.
- The trio selector updates an independent set, so it never changes the main coverage settings.
- Stale live readings stay visible but are marked, and map colours keep the last known value.

## Performance Choices
- **Bundles:** Leaflet and chart code are split into separate bundles, and the chart panel is lazy-loaded.
- **Optional layers:** they mount only after first being switched on, so the road network (about 16 MB raw) loads on demand.
- **History files:** they load only when needed. The live view no longer downloads them, which took first open from about 70 MB to 7 MB in development mode.
- **CPCB data:** the server caches it (5 minutes, or 1 minute when a new reading is due), and reloads answer from cache when no newer reading can exist yet.
- **Caching and filtering:** live readings are cached in memory and IndexedDB, and Historical filtering runs client-side.

## How To Run
```bash
cd aqi-dashboard
npm install
npm run dev
```

For official live AQI, put a free data.gov.in key in `aqi-dashboard/.env.local` as `DATA_GOV_IN_API_KEY=...`. Without it the dashboard still works, using the WAQI fallbacks. See [Config Examples](./config_examples.md).

Other commands:

```bash
cd aqi-dashboard
npm run build     # type-check and production build
npm run preview   # serve the production build locally
```

## Documentation Style
The `docs/` folder is a working reference for the project. It should stay close to the implemented behaviour and track the codebase as it changes. Phase notes record each step as it was built; the guides (this file, the architecture and the reference) describe the current state.
