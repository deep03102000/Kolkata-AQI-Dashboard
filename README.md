# Kolkata AQI Dashboard

A lightweight React + Vite dashboard for six Kolkata air-quality stations. The repository combines a static data-prep pipeline, a map-first frontend, Voronoi coverage and road overlays, a dedicated trio bridge-and-road overlay for Jadavpur, Rabindra Sarobar, and Ballygunge, a comparison table, and live AQI from CPCB's official station feed (with WAQI as a fallback), served through same-origin server routes so API keys stay off the browser.

## What It Does

- Prepares cleaned, standardized station CSV and JSON artifacts from the raw workbooks.
- Builds build-time geometry artifacts for pairwise distances, Voronoi coverage, and road assignment.
- Renders a Leaflet map with station markers, AQI circles, coverage cells, road overlays, trio-specific bridge/road overlays, and popups.
- Shows a selected-station sidebar with live or historical AQI summaries plus a trio selector for the dedicated three-station overlay.
- Loads historical charts, comparison views, and summary stats on demand.
- Shows live AQI from the six stations' official CPCB readings (data.gov.in, hourly), falling back to WAQI and then the nearest live sensor, and always naming the source.
- Surfaces live-data freshness with cached-live badges and muted styling when values fall back to the last known reading.

## Project Layout

- `Dataset/` contains the cleaning, geocoding, and export notes plus generated data files.
- `aqi-dashboard/` contains the React + Vite frontend.
- `docs/` contains the architecture notes, config examples, research notes, and phase documentation.
- `aqi-dashboard/scripts/` is reserved for build-time-only geometry and preprocessing tools.

## Quick Start

The frontend lives in `aqi-dashboard/`.

```bash
cd aqi-dashboard
npm install
npm run dev
```

Build the production bundle:

```bash
cd aqi-dashboard
npm run build
```

Preview the built app:

```bash
cd aqi-dashboard
npm run preview
```

## Data Flow

1. Raw station workbooks are cleaned and normalized.
2. Station names are aligned, geocoded, and linked to stable station IDs.
3. Pairwise distance and Voronoi geometry artifacts are generated under `aqi-dashboard/scripts/output/`.
4. Final coverage, road, and trio overlay GeoJSON files are exported into `aqi-dashboard/public/data/`.
5. The frontend reads those JSON files on demand for map summaries, coverage, roads, and charts.
6. Live AQI comes from CPCB's real-time feed via `/api/cpcb`. If a station's reading is more than 6 hours old, the app falls back to WAQI's station feed, then the nearest live WAQI sensor.
7. Stale readings stay visible, but the map and popup styles mark them as stale so they do not look fresh.

## Live AQI Setup

See [docs/live-data-sources.md](docs/live-data-sources.md) for the full source order and data format.

- `DATA_GOV_IN_API_KEY` (server only): a free key from data.gov.in → My Account. It enables official CPCB readings. Put it in `aqi-dashboard/.env.local` for local development and in the Render or Netlify environment for deployment.
- `WAQI_API_TOKEN` (server only) and `VITE_WAQI_PROXY_URL=/api/waqi` on Render: these enable the WAQI fallback.
- Local development can call WAQI directly with `VITE_WAQI_API_TOKEN` if the proxy is not configured.
- Station-to-WAQI UID mappings live in `aqi-dashboard/src/data/waqiStationUids.ts`.

## Current Features

- Station selection on the map and in the sidebar
- Live and historical AQI summaries
- AQI circles colored by category
- Voronoi coverage overlays
- Station-colored road overlays
- Dedicated trio bridge and road overlays with a sidebar selector
- A comparison table for all six stations
- Lazy-loaded historical charting
- Sticky control bar with Live/Historical toggle, station picker, date range and presets
- Comparison table, sidebar and popups that show date-range averages in Historical mode
- Toggleable pollutant series in the chart
- Filtered summary stats for the selected range
- Official CPCB live readings with WAQI and nearest-sensor fallbacks
- Cached-live freshness badges and muted stale styling in coverage, roads, trio overlays, and popups

## Notes

- The map, sidebar, chart, coverage layer, road layer, trio overlay layers, and comparison table share the same React context so selection stays in sync.
- Leaflet and chart code are split into separate chunks to keep the initial load smaller.
- Historical chart data is filtered client-side from the already fetched JSON.




