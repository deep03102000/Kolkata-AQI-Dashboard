# Config Examples

## Vite scripts
The frontend uses these package scripts:

```json
{
  "dev": "vite --host localhost --port 5173 --strictPort --configLoader native",
  "build": "tsc && vite build",
  "preview": "vite preview --host localhost --port 4173 --strictPort --configLoader native"
}
```

## Station history fetch pattern
The historical chart loads station data like this:

```ts
fetch(`/data/station_${stationId}.json`)
```

## CPCB live-data config (primary source)
Official station readings come from data.gov.in. The key is read on the server only, so never give it a `VITE_` prefix:

```bash
DATA_GOV_IN_API_KEY=your_data_gov_in_key
```

Put it in `aqi-dashboard/.env.local` for local development, and in the Render or Netlify environment for deployment. See [Live Data Sources](./live-data-sources.md).

## WAQI live-data config (fallback)
Use a server-side proxy in deployment and a token only for local fallback:

```bash
VITE_WAQI_PROXY_URL=/.netlify/functions/waqi
WAQI_API_TOKEN=server_only_token_here
```

For local development, put the browser token in `aqi-dashboard/.env.local`:

```bash
VITE_WAQI_API_TOKEN=your_token_here
```

The checked-in `aqi-dashboard/.env.example` file should keep only placeholders.

On Render, use `VITE_WAQI_PROXY_URL=/api/waqi` (set in `render.yaml`).

## Weather
Temperature and humidity come from Open-Meteo, called directly by the browser. No key or setting is needed.

## Tunable values in code
| Value | Where | Default |
|---|---|---|
| Live reading counts as stale after | `FRESHNESS_WINDOW_MS` in `src/hooks/useLiveAqi.ts` | 6 hours |
| Nearest-sensor search radius | `NEARBY_SENSOR_MAX_KM` in `src/hooks/useLiveAqi.ts` | 5 km |
| CPCB server cache (normal / when a reading is due) | `CACHE_TTL_MS` / `CACHE_TTL_WHEN_DUE_MS` in `shared/cpcbFeed.mjs` | 5 min / 1 min |
| Weather refresh | `CACHE_TTL_MS` in `src/utils/weather.ts` | 10 min |
| Historical date limits | `HISTORY_MIN_DATE` / `HISTORY_MAX_DATE` in `src/components/ControlBar.tsx` | 2024-01-01 / 2025-12-31 |

## Example risk scoring config
See `risk_scoring_config.example.json` for a sample configuration payload.

## Notes

- Keep config examples small and human-readable.
- Prefer static JSON examples for tunable values.
- Avoid adding a heavier configuration library unless the project grows significantly.