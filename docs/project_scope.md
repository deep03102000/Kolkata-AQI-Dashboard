# Project Scope

## In Scope
- Cleaning and standardizing six station datasets
- Exporting static JSON for on-demand loading
- Rendering a Kolkata AQI dashboard in React
- Showing AQI summaries, coverage zones, road overlays, 3 km circles, bridge and trio overlays, and pollutant charts
- Live and Historical modes
- Filtering history by date range, with quick presets
- Comparing all six stations in a table, live or as date-range averages
- Live AQI from CPCB's official real-time feed (data.gov.in), with WAQI and nearest-sensor fallbacks
- Labelling the source of every live reading and marking stale readings
- Current temperature and humidity estimates for each station's location (Open-Meteo)
- Keeping API keys on the server (`/api/cpcb`, `/api/waqi`)
- A phone-friendly, minimal interface with subtle motion that respects reduced-motion settings
- Keeping the trio selector independent from the main coverage toggle

## Out of Scope
- Readings straight from the station hardware, or CPCB's 15-minute raw data (no public API; it would need CPCB permission)
- The stations' own temperature and humidity sensors (same reason; model estimates are shown instead)
- Scraping CPCB's dashboard
- A database or backend for historical data
- User accounts or authentication
- Forecasting or machine learning
- Heavy calendar, date-picker or animation libraries
- Shipping API keys in the browser bundle

## Design Goals
- Keep the app lightweight: load data and map layers only when they are needed
- Prefer official data, and always say where a number comes from
- Keep station data static and easy to inspect
- Keep the dashboard working if any live source fails
- Favour simple, maintainable React components
- Keep stale readings visible instead of presenting them as fresh
