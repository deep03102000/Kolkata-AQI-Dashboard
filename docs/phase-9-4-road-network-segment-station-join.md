# Phase 9.4 - Spatial Join: Assign Each Segment to a Station

Phase 9.4 takes the split road segments from Phase 9.3 and tags each one with the Voronoi cell that contains its midpoint so later analysis can work with a station-aware road network. If a midpoint falls outside every clipped cell, the script falls back to the nearest station so the join still completes. If a midpoint lands exactly on a boundary line and matches more than one cell, the script uses the nearest station as a tiebreaker so the assignment stays deterministic.

## 9.4.1 Compute a Midpoint for Each Segment

The join script reads `aqi-dashboard/scripts/output/road_boundary_segments.geojson` and computes a representative midpoint for every `LineString` segment from the segment geometry itself. That midpoint is stored in the segment properties so the join can be audited later without re-running the geometry step.

## 9.4.2 Run `turf.booleanPointInPolygon` Against Each Voronoi Cell

The join script loads `aqi-dashboard/public/data/voronoi_cells.json` and checks each cell with `turf.booleanPointInPolygon`. When exactly one cell contains the segment midpoint, that cell becomes the segment's assignment. When more than one cell contains the midpoint because it lands on a shared boundary line, the script uses the nearest station as a tiebreaker and records that boundary-line tiebreaker separately. When no cell contains the midpoint, the script falls back to the nearest station and records that fallback was used, along with the chosen station ID, station name, and midpoint-to-station distance in kilometers for audit purposes.

## 9.4.3 Write a Station-Joined Segment Artifact

The output is a new build-time GeoJSON artifact at `aqi-dashboard/scripts/output/road_boundary_segments_station_join.geojson`, plus a JSON report with summary statistics for the assignment run. The joined features keep the original road geometry, copy the matched `station_id` onto each segment, and add station assignment metadata directly on each segment.

## 9.4.4 Handle Boundary-Line Midpoints

A midpoint can rarely land exactly on a Voronoi boundary line, which means more than one clipped cell may report that it contains the point. In that case the join script does not pick the first match. It falls back to the nearest station by distance and uses that result as the tiebreaker so the output stays deterministic across runs.

## 9.4.5 Log Segment Counts Per Station

The join script also prints the final segment count for every station and stores the same per-station summary in the metadata. That makes it easy to spot a suspiciously uneven assignment pattern, since a wildly skewed distribution can point to a clipping or join bug rather than a real road-density difference.

## Output

- `aqi-dashboard/scripts/geometry/road-network-segment-station-join.mjs`
- `aqi-dashboard/scripts/output/road_boundary_segments_station_join.geojson`
- `aqi-dashboard/scripts/output/road_boundary_segments_station_join.json`

## Result

Phase 9.4 now turns the split road network into a station-aware road layer by using each segment representative midpoint to pick the Voronoi cell that contains it, with a nearest-station fallback for out-of-bounds midpoints and a nearest-station tiebreaker for midpoint boundary hits. It also records per-station segment counts so obviously skewed results are easy to sanity-check.
