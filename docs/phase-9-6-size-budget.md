# Phase 9.6 - Sanity-Check File Size

Phase 9.6 makes sure the final road export stays within a simple size budget before it is treated as final.

## 9.6.1 Check the Final File Size Against the Bundle-Size Budget

After the export is validated structurally, the pipeline checks `aqi-dashboard/public/data/kolkata_roads.json` against a 7 MiB budget. That keeps the static road asset in the same disciplined size lane as the earlier Phase 7.3 bundle-size gate.

## 9.6.2 If Too Large, Split Into Per-Station Files

If the combined export exceeds the budget, the size gate replaces it with one file per station: `aqi-dashboard/public/data/roads_station_<id>.json`. Each file keeps only the features for a single `station_id`, so the data stays publishable without forcing one oversized combined asset.

## 9.6.3 Plan the Lazy-Load Pattern for Split Files

The app now uses a cached hook, `useRoadNetworkPayload`, that mirrors the `useStationHistory` pattern from Phase 4.1: it stays idle until the roads layer is requested, then fetches the combined road file today and can fall back to `roads_station_<id>.json` later if Phase 10 renders roads per station. That way the rendering work does not need to retrofit a new loading shape when the split-file path is activated.

## Output

- `aqi-dashboard/scripts/geometry/road-network-static-size.mjs`

## Result

The published road export now has a final size sanity check, and oversized output falls back to per-station files before the asset is considered done.
