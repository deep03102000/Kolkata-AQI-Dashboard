# Deployment

This repository is ready to deploy from the repo root through Netlify.

## Netlify Settings

- Base directory: `aqi-dashboard`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Required Environment Variables

- `WAQI_API_TOKEN` for the server-side WAQI proxy
- `VITE_WAQI_PROXY_URL=/.netlify/functions/waqi`
- `VITE_WAQI_API_TOKEN` only for local development fallback

## Notes

- The hosted app is the React/Vite project in `aqi-dashboard/`.
- The root-level dataset and docs stay in the repository, but they are not deployed as site content.
- The app has already been verified with `npm run build`.
