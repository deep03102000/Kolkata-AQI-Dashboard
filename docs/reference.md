# Reference

## Important Paths
- `README.md`
- `Dataset/`
- `Dataset/phase-index.md`
- `aqi-dashboard/src/`
- `aqi-dashboard/src/components/AqiMap.tsx`
- `aqi-dashboard/src/components/CoverageLayer.tsx`
- `aqi-dashboard/src/components/RoadLayer.tsx`
- `aqi-dashboard/src/components/ComparisonTable.tsx`
- `aqi-dashboard/src/components/StationSidebar.tsx`
- `aqi-dashboard/src/components/SelectedStationChartPanel.tsx`
- `aqi-dashboard/src/components/StationPopupContent.tsx`
- `aqi-dashboard/src/hooks/useLiveAqi.ts`
- `aqi-dashboard/src/hooks/useWaqiLiveStation.ts`
- `aqi-dashboard/src/hooks/usePrefetchWaqiLiveStations.ts`
- `aqi-dashboard/src/utils/waqi.ts`
- `aqi-dashboard/src/data/waqiStationUids.ts`
- `aqi-dashboard/netlify/functions/waqi.js`
- `aqi-dashboard/public/data/`
- `aqi-dashboard/scripts/`
- `aqi-dashboard/scripts/README.md`

## Useful Commands

```bash
cd aqi-dashboard
npm install
npm run dev
npm run build
npm run preview
npm run station:distance
npm run prep:geo
npm run road:export
```

## Key Files
- `aqi-dashboard/src/context/StationContext.ts`
- `aqi-dashboard/src/components/AqiMap.tsx`
- `aqi-dashboard/src/components/CoverageLayer.tsx`
- `aqi-dashboard/src/components/RoadLayer.tsx`
- `aqi-dashboard/src/components/StationSidebar.tsx`
- `aqi-dashboard/src/components/ComparisonTable.tsx`
- `aqi-dashboard/src/components/SelectedStationChartPanel.tsx`
- `aqi-dashboard/src/components/ChartPanel.tsx`
- `aqi-dashboard/src/components/DateRangePicker.tsx`
- `aqi-dashboard/src/components/SummaryStats.tsx`
- `aqi-dashboard/src/components/StationPopupContent.tsx`
- `aqi-dashboard/src/components/LiveStationCard.tsx`
- `aqi-dashboard/src/hooks/useStationHistory.ts`
- `aqi-dashboard/src/hooks/useLiveAqi.ts`
- `aqi-dashboard/src/hooks/useWaqiLiveStation.ts`
- `aqi-dashboard/src/hooks/usePrefetchWaqiLiveStations.ts`
- `aqi-dashboard/src/utils/aqi.ts`
- `aqi-dashboard/src/utils/waqi.ts`

## Data Files
- `aqi-dashboard/public/data/station_master.json`
- `aqi-dashboard/public/data/station_site_296.json`
- `aqi-dashboard/public/data/station_site_5110.json`
- `aqi-dashboard/public/data/station_site_5111.json`
- `aqi-dashboard/public/data/station_site_5126.json`
- `aqi-dashboard/public/data/station_site_5129.json`
- `aqi-dashboard/public/data/station_site_5238.json`
- `aqi-dashboard/public/data/voronoi_cells.json`
- `aqi-dashboard/public/data/voronoi-cells.geojson`
- `aqi-dashboard/public/data/kolkata_roads.json`
- `aqi-dashboard/public/data/road_network_linestrings_simplified.geojson`
- `aqi-dashboard/src/data/waqiStationUids.ts`

## Notes
- The historical data path is static and does not require an API key.
- The live WAQI path should use the proxy in production and the token only for local development.
- Coverage and road overlays use static public GeoJSON, while stale live fallbacks are marked explicitly in the UI.

