# Kolkata AQI Dashboard

A lightweight React + Vite dashboard for six Kolkata air-quality stations. The repository combines a static data-prep pipeline, a map-first frontend, Voronoi coverage and road overlays, a dedicated trio bridge-and-road overlay for Jadavpur, Rabindra Sarobar, and Ballygunge, a comparison table, and live AQI from CPCB's official station feed (with WAQI as a fallback), served through same-origin server routes so API keys stay off the browser.

## What It Does

- Prepares cleaned, standardized station CSV and JSON artifacts from the raw workbooks.
- Builds build-time geometry artifacts for pairwise distances, Voronoi coverage, and road assignment.
- Renders a Leaflet map with station markers, AQI circles, coverage cells, road overlays, trio-specific bridge/road overlays, and popups.
- Shows a station panel with every station's AQI, the selected station's live reading (AQI scale, pollutants, temperature and humidity) or date-range average, and map-layer controls.
- Compares all six stations live or as averages over any date range in 2024–2025, with a pollutant chart and summary stats.
- Keeps the first load light: history files and optional map layers download only when needed.
- Shows live AQI from the six stations' official CPCB readings (data.gov.in, hourly), falling back to WAQI and then the nearest live sensor, and always naming the source.
- Marks stale readings clearly instead of presenting them as fresh.

## Project Layout

- `Dataset/` contains the cleaning, geocoding, and export notes plus generated data files.
- `aqi-dashboard/` contains the React + Vite frontend (`src/`), static data (`public/data/`), the server code for `/api/cpcb` (`shared/`, `server.mjs`, `netlify/functions/`) and build-time geometry tools (`scripts/`).
- `docs/` contains the architecture notes, config examples, research notes, phase documentation and the seminar report source.

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

See [docs/live-data-sources.md](docs/live-data-sources.md) for the full source order and data format. Temperature and humidity come from Open-Meteo and need no configuration.

- `DATA_GOV_IN_API_KEY` (server only): a free key from data.gov.in → My Account. It enables official CPCB readings. Put it in `aqi-dashboard/.env.local` for local development and in the Render or Netlify environment for deployment.
- `WAQI_API_TOKEN` (server only) and `VITE_WAQI_PROXY_URL=/api/waqi` on Render: these enable the WAQI fallback.
- Local development can call WAQI directly with `VITE_WAQI_API_TOKEN` if the proxy is not configured.
- Station-to-WAQI UID mappings live in `aqi-dashboard/src/data/waqiStationUids.ts`.

## Deploy

The repository is ready for either **Render** or **Netlify**. Both serve the built site and the `/api/cpcb` route, and both keep API keys on the server.

| | Render | Netlify |
|---|---|---|
| Config file | `render.yaml` (Blueprint) | `netlify.toml` (repo root) |
| Live AQI route | `server.mjs` | `netlify/functions/cpcb.mjs` |
| WAQI proxy URL | `VITE_WAQI_PROXY_URL=/api/waqi` (already in `render.yaml`) | `VITE_WAQI_PROXY_URL=/.netlify/functions/waqi` |
| Free tier | Free instances sleep when idle (slow first load); `render.yaml` uses the paid **starter** plan | Free tier fits this project (static site + 2 functions) |

### Render
1. Push the code to GitHub and merge it into `main`.
2. In Render: **New → Blueprint**, then pick this repository. Render reads `render.yaml`. If it is already connected, it redeploys on every push to `main`.
3. Under the service's **Environment**, set:
   - `DATA_GOV_IN_API_KEY`: your data.gov.in key (official CPCB live AQI)
   - `WAQI_API_TOKEN`: your WAQI token (fallback)
4. Deploy, then open `https://<your-service>.onrender.com/api/cpcb`. It should list the Kolkata stations.

To use Render's free plan, change `plan: starter` to `plan: free` in `render.yaml` before creating the Blueprint.

### Netlify
1. In Netlify: **Add new site → Import an existing project**, then pick this repository. `netlify.toml` sets the base directory (`aqi-dashboard`), build command, publish folder and functions.
2. Under **Site configuration → Environment variables**, set:
   - `DATA_GOV_IN_API_KEY`: your data.gov.in key
   - `WAQI_API_TOKEN`: your WAQI token
   - `VITE_WAQI_PROXY_URL` = `/.netlify/functions/waqi`
3. Deploy, then open `https://<your-site>.netlify.app/api/cpcb` to check live data.

Or deploy from your computer with the Netlify CLI: run `netlify login`, then `netlify init` (or `netlify link`) and `netlify deploy --build --prod` from the repository root.

### After deploying
- **Without `DATA_GOV_IN_API_KEY`:** the site still works, but live AQI falls back to WAQI and the nearest sensor.
- **No setup needed for weather:** temperature and humidity come from Open-Meteo in the browser.
- **More detail:** see [DEPLOYMENT.md](DEPLOYMENT.md).

## Current Features

- Control bar at the top of the screen with Live/Historical toggle, station picker, date range and presets
- Station selection from the map, station list, comparison table or picker
- Official CPCB live readings with WAQI and nearest-sensor fallbacks, and the next expected update time
- Temperature and humidity estimates for each station (Open-Meteo, no key needed)
- Historical date-range averages in the comparison table, station list, sidebar and popups
- Lazy-loaded pollutant chart with toggleable series and average/max/min AQI
- Nearest-station coverage zones, station-coloured roads, 3 km circles, station-pair bridges and the three-station bridge overlay
- A comparison table ranking all six stations
- Minimal, phone-friendly design with subtle CSS motion that respects reduced-motion settings
- Clear stale-data styling in coverage, roads, overlays and popups

## Documentation

- [Docs index](docs/index.md)
- [Architecture](docs/architecture.md) and [project documentation](docs/project_documentation.md)
- [Live data sources](docs/live-data-sources.md)
- [Reference](docs/reference.md): files, commands and external services
- [Deployment](DEPLOYMENT.md)

## Notes

- The map, station panel, chart, overlays and comparison table share one React context, so selection stays in sync.
- Leaflet and chart code are split into separate chunks, and optional map layers and history files load only when needed.
- Historical data is filtered client-side from the fetched JSON.




