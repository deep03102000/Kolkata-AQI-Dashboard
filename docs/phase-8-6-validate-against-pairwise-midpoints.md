# Phase 8.6 - Validate Against Pairwise Midpoints

Phase 8.6 checks the Voronoi-neighbor midpoint pairs from Phase 8.3 against the clipped Voronoi cells from Phase 8.5.

## 8.6.1 Find the Shared Edge for Each Neighbor Pair

For each neighboring pair identified in 8.3.3, the validator loads the two clipped cells, finds their shared edge with Turf overlap geometry, and records the result for later midpoint checks.

## 8.6.2 Confirm the Midpoint Sits on the Shared Edge

For each shared edge, the validator measures the pairwise midpoint against the edge and requires the midpoint to be within a small tolerance of 0.75 km. This catches cases where clipping or simplification leaves a sliver that still overlaps, but no longer lines up with the midpoint.

## 8.6.3 Flag Shared-Edge Deviations for Manual Review

Any pair whose midpoint sits more than 0.5 km from the shared edge is flagged for manual inspection. That kind of offset is usually a sign of a boundary-clipping artifact from Phase 8.5, even if the pair still passes the tolerance check.

## Output

- `aqi-dashboard/scripts/geometry/voronoi-midpoint-validation-report.json`
- `aqi-dashboard/scripts/output/voronoi_midpoint_shared_edges.geojson`

## Result

Phase 8.6 now has a dedicated validation step that ties the midpoint neighbor list to the clipped Voronoi geometry instead of treating the midpoint artifact as standalone metadata.