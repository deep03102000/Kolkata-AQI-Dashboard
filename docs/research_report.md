# Research Report

## Topic
AQI dashboard data preparation, station mapping and reliable live AQI for Kolkata's CPCB monitoring stations.

## Research Summary
The project uses static station records and landmark-level geocoding, so the frontend can render a stable map without a live lookup service. Live data is layered on top. CPCB's official real-time feed on data.gov.in is the primary source, with WAQI and the nearest live sensor as labelled fallbacks. Temperature and humidity come from Open-Meteo location estimates.

## Key Findings
- The station datasets cover 2024-01-01 to 2025-12-31 at 15-minute intervals.
- Several columns were missing or blank and needed interpolation or flagging.
- AQI can be computed locally from the cleaned pollutant series using CPCB breakpoints.
- The frontend stays light by loading data and map layers only when needed. Removing unneeded history downloads cut first open from about 70 MB to 7 MB in development mode.
- **Data-quality issues in third-party live data:**
  - WAQI's coordinate lookup returned Lhasa and Shanghai for Kolkata coordinates.
  - WAQI's copies of all six stations stopped updating on 2026-06-23.

  Every live reading therefore has its timestamp checked and its source shown.
- **CPCB's own feed:** it is current and complete for all six stations. Its documented field names differ from the live API (`avg_value`, not `pollutant_avg`), and its values are AQI sub-indices, not concentrations.
- **No public API for faster or richer station data:** CPCB's 15-minute raw readings and the stations' weather sensors are only on CPCB's dashboard, so getting them would need permission from CPCB or WBPCB.

## Deliverables
- cleaned and standardized station CSVs
- a linked master AQI table
- static JSON and GeoJSON exports
- an interactive React dashboard with Live and Historical modes
- official CPCB live AQI with labelled fallbacks
- temperature and humidity estimates
- a mini project seminar report

## Notes
This report is intentionally short; the step-by-step records are in the phase notes, especially [Phase 13](./phase-13-cpcb-live-data.md) to [Phase 15](./phase-15-station-weather.md).
