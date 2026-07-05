# Phase 8.7 - Export Static Output

Phase 8.7 writes the final clipped Voronoi cells to a static file that the app can serve directly.

## 8.7.1 Write the Final Clipped, Validated Cells

The validated clipped cells are written to `aqi-dashboard/public/data/voronoi_cells.json` as a GeoJSON FeatureCollection with minimal feature properties, keeping `station_id` only so no color or AQI values are baked into the public asset.

## 8.7.3 Run the File Through a GeoJSON Validator/Linter

The final public export is checked by `npm run validate:geojson` before commit-time review. The validator confirms the file is valid GeoJSON, keeps the public properties minimal, and rejects self-intersecting polygon geometry.

## Output

- `aqi-dashboard/public/data/voronoi_cells.json`

## Result

The final Voronoi coverage is now a static JSON asset that reflects the clipped and validated district geometry.
