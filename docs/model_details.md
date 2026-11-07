# Model Details

## AQI Logic
The dashboard uses India's CPCB National AQI. A pollutant's sub-index is computed from its concentration with CPCB breakpoints, and a station's AQI is the highest sub-index.

- **Historical data:** the dashboard computes sub-indices itself from the stored concentrations (`calculateRecordAqi` in `aqi-dashboard/src/utils/aqi.ts`).
- **Live CPCB data:** the feed already reports sub-indices (`avg_value`), so the AQI is simply the highest of them (`computeCpcbAqi` in `aqi-dashboard/src/utils/cpcb.ts`). This matches the AQI CPCB publishes.
- **Live WAQI fallback:** WAQI reports its own AQI value, which is shown as given. WAQI appears to use the US EPA scale, so a fallback reading may not line up exactly with the CPCB categories.

## Pollutants
PM2.5, PM10, NO₂, SO₂, CO and O₃ are used for AQI. NH₃ is displayed but not used in the historical calculation.

## AQI Categories (CPCB)
| Category | AQI range |
|---|---|
| Good | 0–50 |
| Satisfactory | 51–100 |
| Moderate | 101–200 |
| Poor | 201–300 |
| Very Poor | 301–400 |
| Severe | 401+ |

## Summary Behaviour
- **Live mode:** each station shows its official CPCB reading, falling back to WAQI and then the nearest live sensor. See [Live Data Sources](./live-data-sources.md).
- **Historical mode:** the average AQI over every reading in the selected date range (`getHistoricalRangeAqi`). The comparison table, sidebar, popups and map colours all use this one calculation.
- **Missing live pollutants:** if a live source omits a pollutant, the station's latest historical value is shown in grey as "last known".

## Chart Behaviour
- One line per pollutant; series can be switched on and off.
- **Historical mode** plots the selected date range, thinned to about 96 points.
- **Live mode** plots the last recorded day of history.
- Average, maximum and minimum AQI are computed from the plotted range.

## Weather
Temperature, "feels like" and humidity are Open-Meteo model estimates for each station's coordinates, not readings from station sensors. See [Phase 15](./phase-15-station-weather.md).

## Notes
The project does not use a forecasting or machine-learning model. The AQI logic lives in `aqi-dashboard/src/utils/aqi.ts` (historical) and `aqi-dashboard/src/utils/cpcb.ts` (live).
