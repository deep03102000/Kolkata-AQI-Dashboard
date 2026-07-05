# Phase 8.4 - Raw Voronoi Diagram

Phase 8.4 builds the raw Voronoi diagram from the six station locations. This is a preprocessing step for final coverage geometry, not a shipped frontend asset.

## 8.4.1 Extract Station Points

The generator reads the Phase 1.11 station master table, extracts the six `[longitude, latitude]` points, and runs `d3-delaunay` Voronoi on that point set.

## 8.4.2 Run d3-delaunay Voronoi

The raw Voronoi cells are produced by `Delaunay.from(points).voronoi(bounds)` on the extracted point set.

## 8.4.3 Choose a Finite Bounding Box

The generator computes a bounding box that is comfortably larger than the station spread so the outer Voronoi cells can be clipped to finite polygons instead of remaining open-ended.

## Output

- `aqi-dashboard/scripts/output/voronoi_cells_featurecollection.json`
- `aqi-dashboard/scripts/output/voronoi_points.json`
- `aqi-dashboard/scripts/output/voronoi_bounds.json`
- `aqi-dashboard/public/data/voronoi-cells.geojson`

## Result

Phase 8.4 now has an explicit point-extraction artifact and a finite clipping bounds artifact alongside the raw Voronoi coverage file, so the geometry pipeline stays reproducible from the canonical station master table.
