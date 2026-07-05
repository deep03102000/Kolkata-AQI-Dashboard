# Phase 8.1 - Geometry Script Environment

Phase 8 starts the build-time spatial tooling for station distance analysis and eventual Voronoi coverage work.

## What Was Set Up

- Created a root-level `scripts/` directory for preprocessing and geometry utilities.
- Kept that folder separate from `src/` so it is clearly outside the runtime app bundle.
- Added a Node-based distance script at `scripts/geometry/station-distance.mjs`.
- Added a generated report target at `scripts/geometry/station-distance-report.json`.

## Script Behavior

The distance script reads the exported station master JSON, validates the expected station fields, and then:

- computes pairwise station distances with the haversine formula
- records each station's nearest neighbor
- writes a JSON report for later spatial analysis

## Why This Matters

This gives the project a clean build-time home for geometry work, so future Voronoi coverage generation can reuse the same station coordinates without mixing tooling into the frontend source tree.

## Result

Phase 8.1 is in place as a documented build-time tooling setup, and the repository now has a clear path for station distance and coverage preprocessing.
