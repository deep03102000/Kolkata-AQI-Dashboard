# Phase 5.6 - WAQI Proxy

For static deployments, the app should not ship the WAQI API token in the browser bundle. The proxy keeps the secret on the server while still letting the frontend request live WAQI data.

## Recommended Deployment Setup

- Client-side code uses `VITE_WAQI_PROXY_URL` to call a serverless proxy endpoint.
- The proxy reads `WAQI_API_TOKEN` from the deployment environment.
- The proxy forwards only approved WAQI paths such as `feed/geo:{lat};{lon}/` and `feed/@{uid}/`.

## Environment Variables

```bash
VITE_WAQI_PROXY_URL=/.netlify/functions/waqi
WAQI_API_TOKEN=<server-only token>
```

## Local Development

If `VITE_WAQI_PROXY_URL` is not set, the app can still fall back to a direct WAQI request using `VITE_WAQI_API_TOKEN` in local development.

## Added Files

- `aqi-dashboard/netlify/functions/waqi.js`
- `aqi-dashboard/netlify.toml`
- `aqi-dashboard/.env.example`

## Result

Phase 5.6 is complete. The project now has a secure deployment path for WAQI live requests and a documented local fallback for development.