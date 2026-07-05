# Docs Index

## Project Guides
- [Architecture](./architecture.md)
- [Phase Implementation Summary](./phase-implementation-summary.md)
- [Project Scope](./project_scope.md)
- [Project Documentation](./project_documentation.md)
- [Reference](./reference.md)

## Feature Notes
- [Feature Provenance](./feature_provenance.md)
- [Model Details](./model_details.md)
- [Research Report](./research_report.md)
- [Research Report Outline](./research_report_outline.md)

## Phase Notes
- [Phase 5.1 WAQI API Token](./phase-5-1-waqi-token.md)
- [Phase 5.2 Manual WAQI Response Check](./phase-5-2-waqi-response-shape.md)
- [Phase 5.3 WAQI Node UID Mapping](./phase-5-3-waqi-node-uid.md)
- [Phase 5.6 WAQI Proxy](./phase-5-6-waqi-proxy.md)
- [Phase 8.1 Geometry Script Environment](./phase-8-1-geometry-script-environment.md)
- [Phase 8.2 Pairwise Distance Matrix](./phase-8-2-pairwise-distance-matrix.md)
- [Phase 8.3 Per-Pair Midpoints](./phase-8-3-per-pair-midpoints.md)
- [Phase 8.4 Raw Voronoi Diagram](./phase-8-4-raw-voronoi-diagram.md)
- [Phase 8.5 Clip Voronoi Cells to the Kolkata District Boundary](./phase-8-5-clip-cells-to-kolkata-district-boundary.md)
- [Phase 8.6 Validate Against Pairwise Midpoints](./phase-8-6-validate-against-pairwise-midpoints.md)
- [Phase 8.7 Export Static Output](./phase-8-7-static-output.md)
- [Phase 9.1 Road Network Acquisition & Spatial Join](./phase-9-1-road-network-acquisition.md)
- [Phase 9.2 Convert and Simplify Road Network Output](./phase-9-2-road-network-conversion.md)
- [Phase 9.3 Split Roads at Voronoi Boundaries](./phase-9-3-road-network-splitting.md)
- [Phase 9.4 Spatial Join: Assign Each Segment to a Station](./phase-9-4-road-network-segment-station-join.md)
- [Phase 9.5 Export Static Output](./phase-9-5-export-static-output.md)
- [Phase 9.6 Sanity-Check File Size](./phase-9-6-size-budget.md)
- [Phase 10.1 Build CoverageLayer](./phase-10-1-coverage-layer.md)
- [Phase 11.1 Live Reactivity and Stale Visuals](./phase-11-1-live-reactivity-and-stale-visuals.md)

## Configuration
- [Config Examples](./config_examples.md)
- [Risk Scoring Config Example](./risk_scoring_config.example.json)

## Notes

- The documentation is organized by implementation phase, with spatial tooling notes in Phases 8 through 11.
- The current app supports static history, live WAQI fallback caching, Voronoi coverage, road overlays, and stale-data visual cues when live readings are reused.
