# Deployment

This repository is ready to deploy from the repo root through **Render** (`render.yaml`) or **Netlify** (`netlify.toml`). The README's Deploy section has step-by-step instructions.

## Render Settings

- Service type: Web Service (created as a Blueprint from `render.yaml`)
- Root directory: `aqi-dashboard`
- Build command: `npm ci && npm run build`
- Start command: `node server.mjs`
- Plan: `starter` in `render.yaml`. Change it to `free` for a free instance; free instances sleep when idle, so the first visit after a pause is slow.

## Netlify Settings

- Base directory `aqi-dashboard`, build command `npm run build`, publish directory `dist`, functions `netlify/functions` (all set in `netlify.toml`)
- `/api/cpcb` is redirected to the `cpcb` function
- `netlify.toml` also sets Node 22, `VITE_WAQI_PROXY_URL=/.netlify/functions/waqi` and cache headers (build files for a year, `/data/*` for a day)
- Only the secrets need setting in Netlify: `DATA_GOV_IN_API_KEY` and `WAQI_API_TOKEN`

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
- Temperature and humidity are fetched by the browser directly from Open-Meteo, so they need no key or server setting.
- Live data sources are described in [docs/live-data-sources.md](docs/live-data-sources.md).
- The root-level dataset and docs stay in the repository, but they are not deployed as site content.
- The app has already been verified with `npm run build`.

## CPCB Proxy in Mumbai (required for official live AQI)

data.gov.in refuses servers outside India, so the hosted site's `/api/cpcb` is forwarded (`netlify.toml`) to a small Vercel function pinned to Mumbai:

1. From the repository root: `vercel link --project kolkata-aqi-cpcb`.
2. Add the key: `vercel env add DATA_GOV_IN_API_KEY production`.
3. Deploy: `vercel deploy --prod`. `vercel.json` sets the region to `bom1`, and `.vercelignore` uploads only `api/` and `aqi-dashboard/shared/`.
4. Check: https://kolkata-aqi-cpcb.vercel.app/api/cpcb should list the Kolkata stations.

If you change the key, update it in `.env.local`, in Netlify and in Vercel.
