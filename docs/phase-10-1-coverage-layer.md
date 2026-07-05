# Phase 10.1 - Build CoverageLayer

Phase 10 begins the rendering pass for Voronoi coverage and colored roads.

## 10.1.1 Create the Component Skeleton

The `CoverageLayer` component imports `aqi-dashboard/public/data/voronoi_cells.json` directly and renders it as a Leaflet GeoJSON overlay when the coverage toggle is enabled. That keeps the map ready for the later Phase 10 styling and interaction work without adding a fetch step in the render path.

## 10.1.2 Render It via react-leaflet `GeoJSON`

The component uses react-leaflet's `<GeoJSON>` with a data prop bound to the imported Voronoi FeatureCollection, so the map can render the clipped coverage directly from the public asset.

## 10.1.3 Style the Coverage Cells

The `CoverageLayer` style callback looks up `feature.properties.station_id` in the station-color map that `AqiMap` builds from the live or historical station summaries. It then returns `fillColor`, `color`, `weight`, and `fillOpacity` so the coverage overlay stays aligned with the road layer and the station circles. When the shared stale flag is present, the layer softens the fill and stroke so cached live data does not look fresh.

## 10.1.4 Wire the Layer Into the Map

`AqiMap` lazy-loads `CoverageLayer` and `RoadLayer`, then shows them only when the coverage mode is set to Voronoi and the corresponding visibility toggles are enabled. The current implementation keeps the GeoJSON source stable while repainting the Leaflet layers when station colors or freshness states change.

## Output

- `aqi-dashboard/src/components/CoverageLayer.tsx`
- `aqi-dashboard/src/components/AqiMap.tsx`
- `aqi-dashboard/src/components/RoadLayer.tsx`

## Result

The map now has a dedicated coverage layer component and a matching road layer, so the Voronoi and road rendering work can stay isolated from the main map container.
