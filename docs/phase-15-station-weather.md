# Phase 15: Temperature and Humidity

## Goal
Show current temperature and humidity alongside each station's live AQI.

## Source Decision
- CPCB's data.gov.in feed (the AQI source) has pollutant fields only.
- WAQI's station feeds include temperature and humidity, but WAQI's copies of these stations have been frozen since 2026-06-23 (Phase 13).
- The stations' own weather sensors appear only on CPCB's CCR dashboard, which has no public API.

The dashboard therefore uses [Open-Meteo](https://open-meteo.com/) current conditions for each station's coordinates: free, no key, CORS-enabled and updated every 15 minutes. **These are model estimates for the location, not readings from the station's sensors,** and the UI says so.

## Implementation
- `src/utils/weather.ts` makes one request with every station's coordinates (`current=temperature_2m,relative_humidity_2m,apparent_temperature`, `timezone=Asia/Kolkata`) and caches the result for 10 minutes.
- `src/hooks/useStationWeather.ts` gives components one station's weather and refreshes every 10 minutes.
- No server route is needed, because Open-Meteo allows browser requests (`access-control-allow-origin: *`).

## Where It Shows (Live mode only)
- **Live station card:** temperature, "feels like" and humidity, with a source line: "Weather estimate for this location · Open-Meteo · 1:45 pm".
- **Comparison table:** each row's short line, for example "CPCB · 1:00 pm · 29°C · 54%".
- **Map popups:** for example "29°C · 54% humidity".
- **Legend:** credits Open-Meteo, as its CC BY 4.0 licence requires.

## Result
Readings on 2026-11-07 at 13:45 IST were 28.9–29.2°C and 52–54% humidity across the six stations. They are nearly identical because the stations are within about 15 km of each other, closer than the model's grid can separate.
