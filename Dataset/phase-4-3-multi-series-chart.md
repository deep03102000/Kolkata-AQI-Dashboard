# Phase 4.3 Multi-Series Chart

The chart panel uses one `react-chartjs-2` `<Line />` chart with toggleable pollutant series.

## Series

- PM2.5
- PM10
- NO2
- SO2
- CO
- O3
- NH3

## Behavior

- A small checkbox row controls which series are visible.
- One chart instance is reused instead of rendering separate charts per parameter.
- The chart is driven by the already fetched station JSON.

## Result
The historical view stays compact and responsive while still exposing all major pollutant trends.