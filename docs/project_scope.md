# Project Scope

## In Scope
- Cleaning and standardizing six station datasets
- Exporting static JSON for on-demand loading
- Rendering a Kolkata AQI dashboard in React
- Showing AQI summaries, circles, coverage overlays, road overlays, and history charts
- Supporting Live and Historical modes
- Filtering historical records by date range
- Comparing all six stations in a table
- Resolving optional live WAQI data by station UID
- Marking cached live fallbacks as stale when fresh data is unavailable
- Using a server-side proxy for WAQI tokens in deployment

## Out of Scope
- Real-time sensor streaming directly from the station hardware
- Backend APIs or a database layer for historical data
- User accounts or authentication
- Machine learning forecasting
- Heavy calendar/date-picker libraries
- Shipping the WAQI secret token in the browser bundle

## Design Goals
- Keep the app lightweight
- Load chart code only when needed
- Keep station data static and easy to inspect
- Favor simple, maintainable React components
- Keep live data optional so the dashboard still works from static files alone
- Keep stale live fallbacks visible instead of silently presenting them as fresh data
