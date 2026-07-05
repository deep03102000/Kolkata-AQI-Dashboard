# Project Documentation

## Overview
Kolkata AQI Dashboard is a lightweight, static-first air quality project for six Kolkata monitoring stations. The repository combines a one-time data preparation pipeline with a React + Vite frontend that loads compact station JSON on demand and presents the data in an interactive map-and-chart experience.

The project was built to stay simple to run and easy to inspect. Instead of introducing a database or a custom backend for the historical data, the station records are prepared ahead of time, exported as static files, and consumed directly by the frontend. A small WAQI proxy layer is available for live AQI lookups when the deployment is configured for it.

## What The Project Does

The project takes raw station workbooks and turns them into a usable dashboard that shows:

- a Kolkata-centered Leaflet map
- six station markers and 1 km AQI circles
- coverage overlays and station-colored road overlays
- popups with live or historical AQI values
- a selected-station sidebar with summary values
- a lazy-loaded historical chart panel
- a comparison table for the six stations
- date-range filtering for historical views
- filtered AQI summary stats above the chart
- optional live WAQI data with cached station UID mapping
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
7. Voronoi coverage and road network artifacts are generated as build-time geometry outputs.
8. Final station payloads, coverage files, and road files are exported as static JSON/GeoJSON files under `aqi-dashboard/public/data/`.
9. Live WAQI support is layered on top using station UID mapping plus a proxy-based token flow for production.

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

- `StationContext` stores the selected station, mode, coverage mode, and date range.
- `AqiMap` renders the map, markers, circles, coverage layer, road layer, and popups.
- `StationSidebar` renders the selected station summary, filters, and mode controls.
- `ComparisonTable` compares all six stations in live or historical mode.
- `SelectedStationChartPanel` and `ChartPanel` render the historical chart experience.
- `useStationHistory` fetches and caches station JSON on demand.
- `useLiveAqi` resolves live WAQI values, caches them locally, and exposes stale state.
- `useWaqiLiveStation` adapts the live WAQI payload for station UI components.
- `usePrefetchWaqiLiveStations` primes the live station cache for the map and sidebar.
- `DateRangePicker` manages the Live/Historical toggle and date inputs.
- `SummaryStats` computes average, max, and min AQI for the filtered range.

## State Flow

The dashboard uses shared React context so the map, sidebar, comparison table, and chart always agree on the current selection.

- Clicking a marker updates `selectedStationId`.
- The sidebar loads the matching station payload.
- The historical chart reads the same payload and filters it by date range.
- The comparison table recomputes AQI values for all stations when the mode changes.
- The summary stats use the same filtered records as the chart.
- Live mode can resolve WAQI data for the selected station through the live hook path.
- When live data falls back to a cached reading, the map and popup styling keep it visible but mark it as stale.

This keeps the UI consistent without introducing a heavier global state library.

## Performance Choices

Several small design choices keep the dashboard light:

- Leaflet and chart code are split into separate bundles.
- The coverage and road layers are lazy-loaded.
- The chart panel is loaded with `React.lazy` and `Suspense`.
- Station history is cached in memory once fetched.
- Live WAQI responses are cached in memory and IndexedDB.
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
- a persistent legend
- a comparison table across all stations
- a date range picker built with native date inputs
- toggleable pollutant series in the historical chart
- filtered summary stats for the selected range
- live WAQI lookup through either a token or a proxy
- cached-live freshness badges and muted stale styling in coverage, roads, and popups

## Documentation Style

The `docs/` folder is meant to be a working reference for the project, not a marketing site. It should stay close to the implemented behavior and track the actual codebase as it evolves.

## Live Data

Phase 5 introduces the WAQI live-data path. The current notes cover token handling, the response shape, station UID mapping, and the proxy-based deployment flow.
