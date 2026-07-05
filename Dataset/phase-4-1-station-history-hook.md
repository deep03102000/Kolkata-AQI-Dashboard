# Phase 4.1 Station History Hook

Added `useStationHistory(stationId)` to fetch the matching `public/data/station_<id>.json` file on demand.

## Behavior

- Uses a small in-memory `Map` cache so the same station file is not refetched repeatedly.
- Returns `idle`, `loading`, `ready`, and `error` states.
- Cancels stale updates when the selected station changes quickly.

## Result
The chart and sidebar can share the same fetched history payload without adding a database or any extra client library.