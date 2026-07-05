# Phase 8.3 - Per-Pair Midpoints

Phase 8.3 computes a midpoint for every one of the 15 station pairs. This is a validation step, not the final geometry pipeline.

## 8.3.1 Midpoint Computation

The generator uses a small spherical midpoint helper in `aqi-dashboard/scripts/geometry/station-distance.mjs` and stores the result keyed by station pair.

Why this approach:

- it keeps the calculation dependency-light
- it corrects the simple latitude/longitude average with spherical geometry
- it is good enough for sanity-checking the station pair layout before final spatial tooling

## Output

- `aqi-dashboard/scripts/output/pair_midpoints.json`

## Result

Phase 8.3 now has a dev-only midpoint artifact for all 15 station pairs, keyed by station pair, with Voronoi-neighbor tagging so validation can focus on the real neighbor subset in 8.6.


