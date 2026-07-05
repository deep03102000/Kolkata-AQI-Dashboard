# Phase 1.13 Static JSON Exports

The final merged AQI dataset was exported as one compact JSON file per station under `public/data/`.
Each file is designed to be fetched on demand and is not imported into the JS bundle.

## File pattern

`/public/data/station_<station_id>.json`

## Payload shape

`station_id, station_name, latitude, longitude, records[]`

## Exported files

- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_296.json` (site_296 / Rabindra Bharati University / 70176 rows)
- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_5110.json` (site_5110 / Fort William / 70176 rows)
- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_5111.json` (site_5111 / Jadavpur / 70176 rows)
- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_5126.json` (site_5126 / Rabindra Sarobar / 70176 rows)
- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_5129.json` (site_5129 / Bidhannagar / 70176 rows)
- `D:/Applications/kolkata-aqi-dashboard/public/data/station_site_5238.json` (site_5238 / Ballygunge / 70176 rows)
