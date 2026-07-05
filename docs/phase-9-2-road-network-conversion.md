# Phase 9.2 - Convert and Simplify Road Network Output

Phase 9.2 turns the raw Overpass response from Phase 9.1 into clean GeoJSON road layers that later spatial steps can consume without talking to Overpass again.

## 9.2.2 Convert Raw Overpass Ways to GeoJSON LineStrings

The conversion script reads `aqi-dashboard/scripts/output/raw_roads.json`, keeps the `way` elements that already include inline geometry from `out body geom;`, and emits a GeoJSON `FeatureCollection` of `LineString` features.

The output feature properties keep a minimal OSM tag set, including `highway` and `name`, plus a few other common road tags. That keeps the road class and road name available for later labeling and debugging without baking in extra derived data.

The converted file is written to `aqi-dashboard/scripts/output/road_network_linestrings.geojson`.

## 9.2.3 Simplify the Converted LineStrings

The simplification script reads the converted GeoJSON and runs `turf.simplify` with an initial small tolerance so the road geometry is a little lighter while keeping the road shape readable and the feature properties intact. The chosen tolerance is recorded in the script as `chosenTolerance = 0.0001` after comparing file size against city-block visual fidelity. The simplified layer is also published to `public/data` so it can be toggled on in the map for city-block visual inspection.

The simplified file is written to `aqi-dashboard/scripts/output/road_network_linestrings_simplified.geojson`.

## Output

- `aqi-dashboard/scripts/geometry/road-network-conversion.mjs`
- `aqi-dashboard/scripts/geometry/road-network-simplify.mjs`
- `aqi-dashboard/scripts/output/road_network_linestrings.geojson`
- `aqi-dashboard/scripts/output/road_network_linestrings_simplified.geojson`

## Result

Phase 9.2 now has a deterministic conversion-and-simplification path that turns the fetched Overpass road ways into reusable GeoJSON for the later join and cleanup stages.