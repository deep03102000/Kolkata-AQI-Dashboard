# Phase 9.5 - Export Static Output

Phase 9.5 publishes the joined road segments as a static JSON asset that the frontend can fetch directly.

## 9.5.1 Write Joined Segments to `public/data/kolkata_roads.json`

The export script reads `aqi-dashboard/scripts/output/road_boundary_segments_station_join.geojson` and writes the joined road network to `aqi-dashboard/public/data/kolkata_roads.json`. The exported file stays in GeoJSON FeatureCollection form so the segment geometry remains available to the app without re-running the geometry pipeline.

## 9.5.2 Keep Only Static Road Properties

The public export keeps `station_id` and may carry `name` and `highway` from Phase 9.2.2 when those fields exist, but it drops the rest of the joined feature properties so no dynamic color or other view-specific data gets baked into `public/data/kolkata_roads.json`.

## 9.5.3 Validate the Exported GeoJSON Structurally

The export command runs a structural GeoJSON validator after the file is written. The validator checks that `public/data/kolkata_roads.json` is a non-empty FeatureCollection, that each feature is a valid road line feature, and that the properties stay limited to `station_id` with optional `name` and `highway` fields.

## Output

- `aqi-dashboard/scripts/geometry/road-network-static-output.mjs`
- `aqi-dashboard/public/data/kolkata_roads.json`

## Result

The station-joined road network is now available as a static public data asset for direct frontend loading, with only the stable road identity fields preserved.
