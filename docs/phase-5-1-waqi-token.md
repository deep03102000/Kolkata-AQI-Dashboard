# Phase 5.1 WAQI API Token

The WAQI token handling is split between local development and deployment so the secret does not need to live in the browser bundle.

## Status

- WAQI account registration completed
- API token obtained
- Local development can read `VITE_WAQI_API_TOKEN` from `aqi-dashboard/.env.local`
- Production deployments should read `WAQI_API_TOKEN` on the server and expose WAQI through the proxy

## Recommended Environment Variables

Use the proxy in deployment:

```bash
VITE_WAQI_PROXY_URL=/.netlify/functions/waqi
WAQI_API_TOKEN=your_server_side_token_here
```

Use a local-only token only when you need direct browser access during development:

```bash
VITE_WAQI_API_TOKEN=your_token_here
```

## Recommended Local File

Store any local-only token in:

```bash
aqi-dashboard/.env.local
```

The checked-in `aqi-dashboard/.env.example` file should keep placeholders only, not real secrets.

## Notes

- Do not commit the token to the repository.
- Keep the token out of documentation screenshots and logs.
- Prefer the proxy path for anything public or production-facing.

## Result

Phase 5.1 is complete. The project now supports both a secure proxy setup and a local fallback for live WAQI requests.