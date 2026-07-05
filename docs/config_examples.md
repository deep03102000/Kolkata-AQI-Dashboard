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

## WAQI live-data config
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

## Example risk scoring config
See `risk_scoring_config.example.json` for a sample configuration payload.

## Notes

- Keep config examples small and human-readable.
- Prefer static JSON examples for tunable values.
- Avoid adding a heavier configuration library unless the project grows significantly.