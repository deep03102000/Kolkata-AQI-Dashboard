# Research Report

## Topic
AQI dashboard data preparation, station mapping, and live AQI integration for Kolkata monitoring stations.

## Research Summary
The project uses static station records and landmark-level geocoding so the frontend can render a stable map without relying on a live lookup service. A WAQI live-data path was then added on top of that static base so the dashboard can show current values when a token and proxy are configured.

## Key Findings
- The station datasets cover the requested time range.
- Several columns were missing or blank and required interpolation or flagging.
- AQI computation can be done locally from the cleaned pollutant series.
- The frontend can stay lightweight by loading only the station JSON it needs.
- WAQI live data is best treated as an optional layer, not a dependency for the core dashboard.

## Deliverables
- cleaned station CSVs
- standardized station CSVs
- linked master AQI table
- static JSON exports
- interactive React dashboard
- optional WAQI live-data support

## Notes
This report is intentionally concise because the detailed step-by-step records already live in the phase notes.