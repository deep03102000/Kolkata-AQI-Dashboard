# Deployment

This repository is ready to deploy from the repo root through Render.

## Render Settings

- Service type: Web Service
- Root directory: `aqi-dashboard`
- Build command: `npm ci && npm run build`
- Start command: `node server.mjs`

## Required Environment Variables

- `DATA_GOV_IN_API_KEY`: your data.gov.in key, for official CPCB live readings at `/api/cpcb`. Without it, the live site falls back to WAQI and the nearest sensor.
- `WAQI_API_TOKEN` for the server-side WAQI proxy
- `VITE_WAQI_PROXY_URL=/api/waqi`
- `VITE_WAQI_API_TOKEN` only for local development fallback

Set secrets in the Render dashboard (Environment). `render.yaml` lists them with `sync: false`, so the values are never committed.

## Notes

- The hosted app is the React/Vite project in `aqi-dashboard/`.
- The Render web service serves the built frontend, the `/api/cpcb` CPCB route and the `/api/waqi` proxy from the same origin.
- On Netlify, `/api/cpcb` is served by `netlify/functions/cpcb.mjs` through a redirect in `netlify.toml`. Set `DATA_GOV_IN_API_KEY` under Site settings → Environment variables.
- Live data sources are described in [docs/live-data-sources.md](docs/live-data-sources.md).
- The root-level dataset and docs stay in the repository, but they are not deployed as site content.
- The app has already been verified with `npm run build`.