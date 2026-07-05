# Model Details

## AQI Logic
The dashboard computes AQI from pollutant observations using CPCB-style breakpoints.

## Pollutants Used
- PM2.5
- PM10
- NO2
- SO2
- CO
- O3

## Summary Behavior
- Live mode uses the WAQI live feed when it is available.
- Historical mode averages AQI values over the selected date range.
- The sidebar summary uses the same AQI calculation as the chart layer.
- If live pollutant values are missing, the app can fall back to the latest historical values for the same station.

## Chart Behavior
- The chart panel shows one line series per pollutant.
- Series can be toggled on and off with checkboxes.
- The filtered date range is applied before plotting.

## AQI Categories
- Good
- Satisfactory
- Moderate
- Poor
- Very Poor
- Severe

## Notes
The project uses the AQI logic already implemented in `aqi-dashboard/src/utils/aqi.ts` and does not add a separate ML model. Live AQI data is adapted in `aqi-dashboard/src/utils/waqi.ts`.