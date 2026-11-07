# Reference

## Useful Commands
```bash
cd aqi-dashboard
npm install
npm run dev            # dev server at http://localhost:5173 (also serves /api/cpcb and the WAQI proxy)
npm run build          # type-check and production build
npm run preview        # serve the production build locally
node server.mjs        # Render-style server for the built app (PORT, default 10000)

npm run station:distance
npm run prep:geo
npm run road:export
```

`npm run dev`, `build` and `preview` first run `waqi:snapshot`, which refreshes `public/data/waqi_last_updated_stations.json`. That file is not committed.

## Frontend (`aqi-dashboard/src/`)

### Layout and views
- `App.tsx`: page layout
- `components/ControlBar.tsx`: the bar at the top of the screen with the Live/Historical toggle, station picker, dates and presets
- `components/AqiMap.tsx`: the map, markers and overlay layers (optional layers mount on first use)
- `components/StationPopupContent.tsx`: marker popups (live reading, or the date-range average)
- `components/StationSidebar.tsx`: station list with AQI chips, selected-station card and map-layer controls
- `components/LiveStationCard.tsx`, `components/LivePollutantGrid.tsx`: live AQI, scale, weather and pollutants
- `components/TrioStationSelector.tsx`: three-station bridge controls
- `components/SelectedStationChartPanel.tsx`, `components/ChartPanel.tsx`, `components/SummaryStats.tsx`: pollutant trend and statistics
- `components/ComparisonTable.tsx`: all six stations, live or date-range averages
- `components/Legend.tsx`: CPCB colour bands and data-source notes
- `components/AnimatedNumber.tsx`: counts numbers up to new values

### Map layers
- `components/CoverageLayer.tsx`, `components/RoadLayer.tsx`
- `components/Circle3kmLayer.tsx`, `components/BridgeLayer.tsx`, `components/ThreeStationBridgeLayer.tsx`
- `components/ClosestTrioBridgeLayer.tsx`, `components/ClosestTrioRoadLayer.tsx`
- `components/bridgeLayerStyle.ts`, `components/roadLayerStyle.ts`

### State, hooks and utilities
- `context/StationContext.ts`: shared selection, mode, date range and layer state
- `hooks/useLiveAqi.ts`: live AQI source order, polling, caching and the stale flag
- `hooks/useWaqiLiveStation.ts`, `hooks/usePrefetchWaqiLiveStations.ts`: adapt and prefetch live readings
- `hooks/useStationHistory.ts`, `hooks/useStationPayload.ts`, `hooks/useRoadNetworkPayload.ts`: static data loading
- `hooks/useStationWeather.ts`: temperature and humidity
- `utils/aqi.ts`: CPCB breakpoints, categories and date-range averages
- `utils/cpcb.ts`: the `/api/cpcb` client, station matching, AQI from sub-indices and the next-reading time
- `utils/waqi.ts`: WAQI request building, types and summaries
- `utils/weather.ts`: the Open-Meteo client
- `utils/appUrl.ts`: resolves app-relative URLs
- `data/waqiStationUids.ts`: WAQI UID for each station
- `style.css`: Tailwind, the `.card` style, animations and reduced-motion rules

## Server Side (`aqi-dashboard/`)
- `shared/cpcbFeed.mjs`: fetches, parses and caches the CPCB feed (shared by all three hosts)
- `vite.config.js`: dev and preview server routes `/api/cpcb` and `/.netlify/functions/waqi`
- `server.mjs`: Render server for the static build, `/api/cpcb` and `/api/waqi`
- `netlify/functions/cpcb.mjs`, `netlify/functions/waqi.js`: Netlify functions (`/api/cpcb` is redirected in `netlify.toml`)
- `scripts/fetch-waqi-snapshot.mjs`: WAQI snapshot run before dev and build
- `scripts/geometry/`: build-time coverage, road and bridge tooling (see `scripts/README.md`)

## Data Files (`aqi-dashboard/public/data/`)
- `station_master.json`: the six stations, CPCB site IDs and coordinates
- `station_site_296.json`, `station_site_5110.json`, `station_site_5111.json`, `station_site_5126.json`, `station_site_5129.json`, `station_site_5238.json`: 2024–2025 history, 15-minute readings, about 8 MB each
- `voronoi_cells.json`, `voronoi-cells.geojson`: nearest-station coverage zones
- `kolkata_roads.json`, `road_network_linestrings_simplified.geojson`: road network
- `circles_3km.json`, `bridge_polygons.json`, `closest_trio_bridge_polygons.json`: overlay geometry

## External Services
| Service | Used for | Key |
|---|---|---|
| data.gov.in, CPCB resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` | Live AQI (primary) | `DATA_GOV_IN_API_KEY`, server only |
| api.waqi.info | Live AQI fallback | `WAQI_API_TOKEN`, server only |
| api.open-meteo.com | Temperature and humidity | none |
| OpenStreetMap tiles | Base map | none |

## Notes
- The historical data path is static and needs no API key.
- Live data sources and freshness rules are in [Live Data Sources](./live-data-sources.md).
- Phase notes [13](./phase-13-cpcb-live-data.md), [14](./phase-14-ui-and-performance.md) and [15](./phase-15-station-weather.md) describe the most recent changes.
