# Phase 4.6 Summary Stats

Added a `SummaryStats` block above the chart to show average, maximum, and minimum AQI for the filtered range.

## Behavior

- Computes the statistics with `useMemo` from the filtered records.
- Reuses the same history payload already fetched for the chart.
- Displays the values directly above the plot so the selected date range is easy to scan.

## Result
The historical panel now gives both trend and range-level context in one compact view.