# Deployment

This repository is ready to deploy from the repo root through Render.

## Render Settings

- Service type: Web Service
- Root directory: `aqi-dashboard`
- Build command: `npm ci && npm run build`
- Start command: `node server.mjs`

## Required Environment Variables

- `WAQI_API_TOKEN` for the server-side WAQI proxy
- `VITE_WAQI_PROXY_URL=/api/waqi`
- `VITE_WAQI_API_TOKEN` only for local development fallback

## Notes

- The hosted app is the React/Vite project in `aqi-dashboard/`.
- The Render web service serves the built frontend and the `/api/waqi` proxy from the same origin.
- The root-level dataset and docs stay in the repository, but they are not deployed as site content.
- The app has already been verified with `npm run build`.