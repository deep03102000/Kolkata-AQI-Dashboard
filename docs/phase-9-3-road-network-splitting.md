# Phase 9.3 - Split Roads at Voronoi Boundaries

Phase 9.3 prepares the road network for boundary-aware splitting by loading the clipped Voronoi cells from Phase 8.7.1, checking which roads hit a cell boundary, and splitting only those roads that cross.

## 9.3.1 Load the Clipped Voronoi Cells

The loader reads `aqi-dashboard/public/data/voronoi_cells.json`, which is the clipped and validated Voronoi export from Phase 8.7.1. It normalizes each cell boundary into LineString features so later road-splitting steps can compare roads against the district partition without re-running the Voronoi pipeline.

The generated boundary linework is written to `aqi-dashboard/scripts/output/voronoi_cell_boundaries.geojson`.

## 9.3.2 For Each Road LineString, Test Whether It Crosses Any Cell Boundary

The crossing checker reads the simplified road layer from `aqi-dashboard/public/data/road_network_linestrings_simplified.geojson`, uses a bounding-box pre-filter for speed, and then applies `turf.booleanCrosses` against the Voronoi boundary linework from 9.3.1.

Any road that crosses one or more cell boundaries is written to `aqi-dashboard/scripts/output/road_boundary_crossings.geojson`, with the crossed boundary station IDs and intersection count preserved in the feature properties for the next split phase.

## 9.3.3 Split Crossing Roads into Sub-Segments

The splitter reads the crossing-road report from 9.3.2 and runs `turf.lineSplit` against the relevant Voronoi cell edges for each road that crosses a boundary. The output keeps the original road properties and labels each split part with `segment_index`, `segment_count`, and `segment_kind` so later stages can trace where each piece came from.

## 9.3.4 Keep Non-Crossing Roads Unchanged

Roads that do not cross any boundary are passed through unchanged as a single segment. They remain in the same output collection with `boundary_split_applied: false` and `segment_kind: 'unchanged'`, so the split output still represents the full road network.

## 9.3.5 Confirm Segment Count and Spot-Check a Few Split Roads

The splitter now validates that every road's output segment count matches the expected count from the crossing report and that the total segment length stays within a small tolerance of the source road length. It also writes a small GeoJSON spot-check sample to `aqi-dashboard/scripts/output/road_boundary_split_spotcheck.geojson` plus a companion JSON report so a few split roads can be inspected visually for gaps or duplicate overlaps.

## Output

- `aqi-dashboard/scripts/geometry/road-network-voronoi-boundaries.mjs`
- `aqi-dashboard/scripts/geometry/road-network-boundary-crossings.mjs`
- `aqi-dashboard/scripts/geometry/road-network-boundary-split.mjs`
- `aqi-dashboard/scripts/output/voronoi_cell_boundaries.geojson`
- `aqi-dashboard/scripts/output/road_boundary_crossings.geojson`
- `aqi-dashboard/scripts/output/road_boundary_segments.geojson`
- `aqi-dashboard/scripts/output/road_boundary_segments.json`
- `aqi-dashboard/scripts/output/road_boundary_split_spotcheck.geojson`
- `aqi-dashboard/scripts/output/road_boundary_split_spotcheck.json`

## Result

Phase 9.3 now has a deterministic boundary-loading step, a road-boundary crossing filter, and a road-splitting pass that preserves untouched roads as single segments.
