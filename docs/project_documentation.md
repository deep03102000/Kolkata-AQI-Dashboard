# Project Documentation

## Overview
Kolkata AQI Dashboard is a lightweight, static-first air quality project for six Kolkata monitoring stations. The repository combines a one-time data preparation pipeline with a React + Vite frontend that loads compact station JSON on demand and presents the data in an interactive map-and-chart experience.

The project was built to stay simple to run and easy to inspect. Instead of introducing a database or a custom backend for the historical data, the station records are prepared ahead of time, exported as static files, and consumed directly by the frontend. Live AQI comes from CPCB's official real-time station feed on data.gov.in through a small server route (`/api/cpcb`), with WAQI as a fallback, so API keys never reach the browser.

## What The Project Does

The project takes raw station workbooks and turns them into a usable dashboard that shows:

- a Kolkata-centered Leaflet map
- six station markers and 1 km AQI circles
- coverage overlays and station-colored road overlays
- dedicated trio bridge and trio road overlays with a sidebar trio selector
- popups with live or historical AQI values
- a selected-station sidebar with summary values
- a lazy-loaded historical chart panel
- a comparison table for the six stations
- date-range filtering for historical views
- filtered AQI summary stats above the chart
- live AQI from official CPCB station readings, falling back to WAQI and then the nearest live sensor
- visible stale-data cues when live values fall back to the last known reading

## Repository Structure

- `Dataset/` contains the data cleaning, validation, and export notes plus the generated CSV/JSON artifacts.
- `aqi-dashboard/` contains the React + Vite frontend.
- `docs/` contains project-wide documentation, architecture notes, references, and research material.
- `README.md` gives the top-level overview and quick start instructions.

## Data Preparation Pipeline

The data pipeline is organized into a sequence of phases:

1. Raw Excel files are inspected for headers, dates, units, and missing values.
2. Missing values are cleaned using interpolation and related fill strategies where appropriate.
3. The cleaned data is standardized to the dashboard schema: `date, pm25, pm10, no2, so2, co, o3, nh3`.
4. A `station_name` column is added and the six station tables are merged into a master long-format table.
5. The stations are geocoded and combined into a station master table with stable IDs.
6. The AQI rows are linked to station IDs and coordinates.
7. Voronoi coverage, road network, and trio overlay artifacts are generated as build-time geometry outputs.
8. Final station payloads, coverage files, road files, and trio overlay files are exported as static JSON/GeoJSON files under `aqi-dashboard/public/data/`.
9. Live AQI is layered on top: CPCB's real-time feed first (via `/api/cpcb`), then WAQI by station UID, then the nearest live WAQI sensor. See [Live Data Sources](./live-data-sources.md).

This means the frontend can work entirely from static data files without a live API, while still leaving room for a live-data layer when it is available.

## Frontend Architecture

The frontend is a React 19 application scaffolded with Vite and TypeScript. Tailwind CSS handles the styling and keeps the component code compact.

Core frontend dependencies:

- `react`
- `react-dom`
- `leaflet`
- `react-leaflet`
- `chart.js`
- `react-chartjs-2`

The app is organized around a small number of focused modules:

- `StationContext` stores the selected station, mode, coverage mode, trio station set, and date range.
- `AqiMap` renders the map, markers, circles, coverage layer, road layer, trio overlays, and popups.
- `StationSidebar` renders the selected station summary, filters, mode controls, and trio selector.
- `ComparisonTable` compares all six stations in live or historical mode.
- `SelectedStationChartPanel` and `ChartPanel` render the historical chart experience.
- `useStationHistory` fetches and caches station JSON on demand.
- `useLiveAqi` resolves live values (CPCB first, then WAQI, then the nearest sensor), caches them locally, and exposes stale state.
- `useWaqiLiveStation` adapts the live payload from any source for station UI components.
- `usePrefetchWaqiLiveStations` primes the live station cache for the map and sidebar.
- `ControlBar` is the sticky top bar with the Live/Historical toggle, station picker, date inputs and range presets.
- `SummaryStats` computes average, max, and min AQI for the filtered range.

## State Flow

The dashboard uses shared React context so the map, sidebar, comparison table, and chart always agree on the current selection.

- Clicking a marker updates `selectedStationId`.
- The sidebar loads the matching station payload.
- The trio selector updates an independent trio-station set without affecting the main coverage toggle.
- The historical chart reads the same payload and filters it by date range.
- The comparison table recomputes AQI values for all stations when the mode changes.
- The summary stats use the same filtered records as the chart.
- Live mode shows the official CPCB reading for each station and names the source when a fallback is used.
- When live data falls back to a cached reading, the map and popup styling keep it visible but mark it as stale.

This keeps the UI consistent without introducing a heavier global state library.

## Performance Choices

Several small design choices keep the dashboard light:

- Leaflet and chart code are split into separate bundles.
- The coverage, road, and trio overlay layers are lazy-loaded.
- The chart panel is loaded with `React.lazy` and `Suspense`.
- Station history is cached in memory once fetched.
- Live readings are cached in memory and IndexedDB. The CPCB feed is cached for 5 minutes on the server.
- Historical filtering is done client-side with array filtering.
- The chart uses one multi-series line plot instead of several separate chart instances.

## How To Run

```bash
cd aqi-dashboard
npm install
npm run dev
```

Useful companion commands:

```bash
cd aqi-dashboard
npm run build
cd aqi-dashboard
npm run preview
```

## Current Feature Set

The dashboard currently supports:

- station selection on the map
- live and historical AQI summaries
- AQI circles colored by category
- Voronoi coverage overlays
- station-colored road overlays
- dedicated trio bridge and road overlays
- a trio selector with live AQI swatches
- a persistent legend
- a comparison table across all stations
- a date range picker built with native date inputs
- toggleable pollutant series in the historical chart
- filtered summary stats for the selected range
- official CPCB live readings with WAQI and nearest-sensor fallbacks
- cached-live freshness badges and muted stale styling in coverage, roads, trio overlays, and popups

## Documentation Style

The `docs/` folder is meant to be a working reference for the project, not a marketing site. It should stay close to the implemented behavior and track the actual codebase as it evolves.

## Live Data

Phase 5 introduced the WAQI live-data path (token handling, response shape, station UID mapping and the proxy). Live AQI now comes first from CPCB's official feed, and WAQI is the fallback. See [Live Data Sources](./live-data-sources.md).

