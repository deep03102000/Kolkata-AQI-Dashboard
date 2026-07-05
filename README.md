# Kolkata AQI Dashboard

A lightweight React + Vite dashboard for six Kolkata air-quality stations. The repository combines a static data-prep pipeline, a map-first frontend, Voronoi coverage and road overlays, a comparison table, and an optional live WAQI integration that runs through a same-origin proxy on Render.

## What It Does

- Prepares cleaned, standardized station CSV and JSON artifacts from the raw workbooks.
- Builds build-time geometry artifacts for pairwise distances, Voronoi coverage, and road assignment.
- Renders a Leaflet map with station markers, AQI circles, coverage cells, road overlays, and popups.
- Shows a selected-station sidebar with live or historical AQI summaries.
- Loads historical charts, comparison views, and summary stats on demand.
- Supports a live WAQI path with a server-side token and a local fallback for development.
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
4. Final coverage and road GeoJSON files are exported into `aqi-dashboard/public/data/`.
5. The frontend reads those JSON files on demand for map summaries, coverage, roads, and charts.
6. Live AQI can be resolved through WAQI by station UID when the proxy or token is configured.
7. Cached live fallbacks stay visible, but the map and popup styles mark them as stale so they do not look fresh.

## Live AQI Setup

- Render deployments should use `VITE_WAQI_PROXY_URL=/api/waqi`.
- The proxy reads `WAQI_API_TOKEN` from the deployment environment.
- Local development can fall back to `VITE_WAQI_API_TOKEN` if the proxy is not configured.
- Station-to-WAQI UID mappings live in `aqi-dashboard/src/data/waqiStationUids.ts`.

## Current Features

- Station selection on the map and in the sidebar
- Live and historical AQI summaries
- AQI circles colored by category
- Voronoi coverage overlays
- Station-colored road overlays
- A comparison table for all six stations
- Lazy-loaded historical charting
- Native date-range filtering
- Toggleable pollutant series in the chart
- Filtered summary stats for the selected range
- Live WAQI lookup through either a token or a proxy
- Cached-live freshness badges and muted stale styling in coverage, roads, and popups

## Notes

- The map, sidebar, chart, coverage layer, road layer, and comparison table share the same React context so selection stays in sync.
- Leaflet and chart code are split into separate chunks to keep the initial load smaller.
- Historical chart data is filtered client-side from the already fetched JSON.
