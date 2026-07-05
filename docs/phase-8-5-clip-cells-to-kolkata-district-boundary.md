# Phase 8.5 - Clip Voronoi Cells to the Kolkata District Boundary

Phase 8.5 clips the raw Voronoi cells to a Kolkata district boundary polygon so the final coverage geometry stays inside the district outline.

## 8.5.1 Source Boundary Polygon

The clipping script first tries to resolve a Kolkata district administrative relation from OpenStreetMap via Overpass, then materializes the polygon geometry.

## 8.5.2 Validate Boundary Geometry

Before the polygon is used, the script closes any open rings, runs `turf.kinks`, and rejects the boundary if self-intersections are detected.

## 8.5.3 Run Turf Intersect on Each Raw Voronoi Cell

Each raw Voronoi cell is clipped with `turf.intersect` against the resolved Kolkata district boundary. If a cell does not intersect the boundary, the script throws so the clipped coverage never silently falls back to the uncut raw geometry.

## 8.5.4 Confirm the Clipped Cell Still Covers Its Station Point

After clipping, the script confirms the result is non-empty and still contains the station's own point. This catches degenerate slivers or empty intersections before they reach the exported FeatureCollection.

## 8.5.5 Fallback Boundary Source

If the OSM boundary is missing, incomplete, or invalid, the script falls back to a public geo-data portal boundary for India district geometries and extracts the Kolkata district feature from that source.

## 8.5.6 Clip the Raw Cells

Each raw Voronoi polygon is intersected with the chosen Kolkata boundary polygon, producing a clipped FeatureCollection that keeps the `station_id` tag on every cell.

## Output

- `aqi-dashboard/scripts/output/kolkata_boundary.geojson`
- `aqi-dashboard/scripts/output/kolkata_boundary_source.json`
- `aqi-dashboard/scripts/output/voronoi_cells_clipped_featurecollection.json`
- `aqi-dashboard/public/data/voronoi_cells.json`

## Result

The public Voronoi coverage now reflects the district boundary instead of the larger bounding box used for raw generation, while the intermediate boundary and clipped-cell artifacts remain available under `scripts/output/` for validation.