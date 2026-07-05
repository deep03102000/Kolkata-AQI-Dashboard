# Phase 11.1 - Live Reactivity and Stale Visuals

Phase 11 keeps the live AQI experience honest when the feed wobbles. The goal is to preserve the last useful reading, but make it obvious when the UI is displaying cached live data instead of a fresh response.

## 11.1.1 Preserve the Last Known Live Summary

`AqiMap` stores the last non-null live AQI summary in a local ref. When the current live lookup returns nothing, the map can still color the coverage cells and road overlays from the last known live reading instead of snapping back to neutral styling.

## 11.1.2 Thread Stale State Through Shared Summaries

The map builds a shared `coverageSummaries` object for the coverage layer and road layer. That object now carries a `stale` flag so both overlays can use the same freshness signal.

## 11.1.3 Distinguish Cached Live Data in the UI

When the data is stale, the coverage fills soften, road strokes become muted and dashed, and the popup content shows a cached-live badge. The sidebar and station cards use the same label so the user can see that the value came from a fallback path.

## 11.1.4 Keep the Live and Historical Paths Aligned

The live hook already exposes the stale state, and `useWaqiLiveStation` forwards it to the station UI components. That keeps the map, sidebar, comparison table, and popup content aligned even when live data is temporarily unavailable.

## Output

- `aqi-dashboard/src/components/AqiMap.tsx`
- `aqi-dashboard/src/components/CoverageLayer.tsx`
- `aqi-dashboard/src/components/RoadLayer.tsx`
- `aqi-dashboard/src/components/StationSidebar.tsx`
- `aqi-dashboard/src/components/StationPopupContent.tsx`
- `aqi-dashboard/src/components/LiveStationCard.tsx`
- `aqi-dashboard/src/hooks/useLiveAqi.ts`
- `aqi-dashboard/src/hooks/useWaqiLiveStation.ts`

## Result

The dashboard can keep showing live-derived AQI values during transient fetch gaps, but the visual treatment makes stale cached data obvious instead of silently blending it into the fresh-live state.
