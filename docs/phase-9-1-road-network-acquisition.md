# Phase 9.1 - Road Network Acquisition & Spatial Join

Phase 9.1 starts the road-network pipeline by pulling the Kolkata road graph from Overpass so later join steps can clip and analyze it against the district boundary.

## 9.1.1 Write the Overpass QL Query

The acquisition script builds an Overpass QL query for vehicle-relevant `way["highway"]` features scoped directly to the Kolkata district boundary polygon resolved in Phase 8.5.1. The query excludes footways, paths, steps, bridleways, pedestrian ways, cycleways, and tracks so the road acquisition stays tight to the intended street network instead of a padded bounding box.

The query outputs full road geometry with `out body geom;` so the road network can be joined to the Voronoi and boundary artifacts without re-querying Overpass.

## 9.1.2 Run the Query as a One-off Script

The generated Overpass query is executed by `scripts/fetch-roads.js`, which runs outside the app, sends the query to Overpass one time, and saves the raw JSON response to `aqi-dashboard/scripts/output/raw_roads.json`. The running app never calls Overpass directly.

## 9.1.3 Sanity-Check the Response Size and Row Count

The fetch script retries transient Overpass failures with a short backoff, then prints the total element count, way count, and response size before it writes `aqi-dashboard/scripts/output/raw_roads.json`. The byte-size cap is the primary runaway safeguard; the element-count limits are set higher so dense city road networks do not get rejected just for being large. If the response is unexpectedly large or sparse, the script stops and suggests narrowing the query further if needed.
## Output

- `aqi-dashboard/scripts/geometry/road-network-acquisition.mjs`
- `aqi-dashboard/scripts/output/road_network_overpass_query.txt`
- `aqi-dashboard/scripts/fetch-roads.js`
- `aqi-dashboard/scripts/output/raw_roads.json`
- `aqi-dashboard/scripts/output/road_network_acquisition.json`

## Result

Phase 9.1 now has a concrete acquisition entry point and a reusable Overpass query for Kolkata road ways, ready for the later spatial join stages.