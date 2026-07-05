# Phase 8.2 - Pairwise Distance Matrix

Phase 8.2 loads the Phase 1.11 station master table and computes the spatial distances between every station pair.

## Input

- `Dataset/master/station_master.csv`

The input table must contain:

`station_id, station_name, latitude, longitude`

## Behavior

The geometry script reads the station master rows, validates the schema, and then:

- builds a square pairwise distance matrix in kilometers
- keeps the upper-triangular pair list for easier inspection
- records each station's nearest neighbor for quick spatial checks

## 8.2.2 Haversine Distance Function

The implementation uses a small hand-rolled Haversine helper in `aqi-dashboard/scripts/geometry/station-distance.mjs`.

Why this choice:

- no extra runtime dependency is needed
- the script stays easy to audit
- the result is still the standard great-circle distance in kilometers

## 8.2.3 All Station Pairs

With six stations in the Phase 1.11 master table, the script computes all 15 unique station pairs using the upper-triangular loop in `aqi-dashboard/scripts/geometry/station-distance.mjs`.

The report also records:

- `pair_count` = `15`
- `expected_pair_count` = `15`

This acts as a guardrail so the geometry step fails fast if the input station count or pair enumeration changes unexpectedly.
## 8.2.4 Station Matrix Artifact

The script writes a dev-only station-to-station matrix at `aqi-dashboard/scripts/output/distance_matrix.json`.

This file is intentionally kept out of `public/` so it stays a local preprocessing artifact rather than a shipped frontend asset.

The JSON structure stores:

- `station_ids`
- `station_names`
- `matrix_km` as a `station_id x station_id` lookup table
## 8.2.5 Google Maps Spot Checks

The following pairs are good sanity checks to compare in Google Maps before trusting the full pipeline:

- Ballygunge -> Jadavpur
- Ballygunge -> Rabindra Sarobar
- Bidhannagar -> Rabindra Bharati University

The script records the Haversine values for those pairs in `aqi-dashboard/scripts/output/distance_spot_checks.json` so the manual review stays repeatable.
## Output

- `aqi-dashboard/scripts/geometry/station-distance-report.json`

## Result

Phase 8.2 now uses the Phase 1.11 output directly, so the spatial tooling stays aligned with the canonical station master table.






