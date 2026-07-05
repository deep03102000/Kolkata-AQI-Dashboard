# Phase 5.3 WAQI Node UID Mapping

For each Kolkata station, a WAQI node UID is stored locally so live requests can go directly to `feed/@<uid>/` instead of resolving a fresh geo match every time.

## Workflow

1. Use the station coordinates from the station master table.
2. Resolve the nearest WAQI node once.
3. Record the returned `data.idx` value.
4. Store that value in the local UID mapping file.
5. Reuse the saved UID for future requests.

## Current Mapping

The live dashboard currently uses the following station-to-WAQI mapping:

| Station ID | Station Name | WAQI UID |
| --- | --- | --- |
| `site_5238` | Ballygunge | `12746` |
| `site_5129` | Bidhannagar | `12745` |
| `site_5110` | Fort William | `12457` |
| `site_5111` | Jadavpur | `12458` |
| `site_5126` | Rabindra Sarobar | `12467` |
| `site_296` | Rabindra Bharati University | `9145` |

The mapping is stored in `aqi-dashboard/src/data/waqiStationUids.ts`.

## Notes

- The UID table keeps live lookups stable even if geo matching drifts.
- The live hooks still allow a geo fallback when a station is missing from the mapping.
- Do not commit additional experimental live data if you want to keep the deployment deterministic.

## Result

Each Kolkata station now has a reusable WAQI UID for direct live-data requests.