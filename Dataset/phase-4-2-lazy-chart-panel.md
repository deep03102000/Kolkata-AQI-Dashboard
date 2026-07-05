# Phase 4.2 Lazy Chart Panel

The historical chart panel is loaded with `React.lazy` and `Suspense`.

## Behavior

- The chart code is not included in the initial page load.
- The `ChartPanel` chunk loads only after a station is selected.
- A small fallback panel is shown while the module loads.

## Result
Chart.js stays out of the first render path, keeping the dashboard lighter at startup.