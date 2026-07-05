# Build-Time Scripts

This folder is reserved for build-time-only geometry and preprocessing tooling.

Keep these utilities outside `src/` so they stay clearly separate from the runtime app bundle.

Planned use:

- station distance calculations
- Voronoi coverage generation
- raw Voronoi point extraction
- finite Voronoi bounds artifacts
- road-segment midpoint station joins
- road network acquisition, simplification, and station assignment
- other preprocessing utilities

Run them with npm scripts:

- `npm run station:distance` for nearest-neighbor reports and the pairwise distance matrix
- `npm run validate:midpoints` for checking the clipped Voronoi cells against pairwise midpoint validation pairs
- `npm run prep:geo` for raw Voronoi generation, boundary clipping, and the intermediate `aqi-dashboard/scripts/output/voronoi_cells_featurecollection.json` / `aqi-dashboard/scripts/output/voronoi_cells_clipped_featurecollection.json` artifacts
- `npm run road:network` for building the Overpass QL query and acquisition metadata
- `npm run road:fetch` for downloading raw Overpass road data into a build-time JSON artifact
- `npm run road:convert` for turning raw Overpass ways into GeoJSON LineString features
- `npm run road:simplify` for writing the simplified road layer to both `aqi-dashboard/scripts/output/road_network_linestrings_simplified.geojson` and `aqi-dashboard/public/data/road_network_linestrings_simplified.geojson`
- `npm run road:boundaries` for loading the clipped Voronoi cells and exporting their boundary linework for road splitting
- `npm run road:crossings` for testing which road LineStrings intersect Voronoi cell boundaries and generating the split candidates
- `npm run road:split` for splitting crossing roads, carrying untouched roads through as single segments, and writing a small spot-check GeoJSON plus validation report
- `npm run road:join` for assigning each split segment by testing which Voronoi cell contains the segment midpoint, with a nearest-station fallback when needed
- `npm run road:export` for publishing the joined road segments to `aqi-dashboard/public/data/kolkata_roads.json` as the frontend-ready static asset and validating it immediately after write
- `npm run validate:geojson` for validating the final public Voronoi export on demand
- `npm run road:validate-export` for validating the exported road GeoJSON structure on demand
- `npm run road:check-size` for sanity-checking the published road file against the size budget and splitting it into per-station files if needed
