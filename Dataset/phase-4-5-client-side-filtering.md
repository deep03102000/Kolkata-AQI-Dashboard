# Phase 4.5 Client-Side Filtering

Chart data is filtered in the browser from the already fetched station JSON.

## Behavior

- Uses a simple array `.filter()` on the station history records.
- Filters by the selected date range when Historical mode is active.
- Falls back to the latest available records in Live mode.
- Avoids any extra storage layer such as SQLite.

## Result
The historical chart stays lightweight and fast because the full dataset already lives in memory after the on-demand fetch.