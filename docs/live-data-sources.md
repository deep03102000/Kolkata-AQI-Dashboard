# Live Data Sources

How the dashboard gets live AQI for the six Kolkata stations, in priority order. Every view names the source it is showing.

| Order | Source | Used when | Label in the UI |
|---|---|---|---|
| 1 | **CPCB real-time feed** on data.gov.in (official station readings) | The station's CPCB reading is less than 6 hours old | Live AQI · CPCB station |
| 2 | WAQI's copy of the same station (`feed/@<uid>`) | CPCB is missing or stale and WAQI is fresh | Live AQI · WAQI |
| 3 | Nearest live WAQI sensor within 5 km (usually a WBPCB low-cost sensor) | Neither official feed is fresh | Live AQI · nearest sensor, with the sensor's name and distance |
| 4 | The newer of the two stale official readings | Nothing fresh anywhere | Marked **Stale** |

## 1. CPCB real-time feed (primary)

- **Dataset:** "Real time Air Quality Index from various locations", resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` on [data.gov.in](https://data.gov.in/resource/real-time-air-quality-index-various-locations), published by the Central Pollution Control Board.
- **Request:** `GET https://api.data.gov.in/resource/<id>?api-key=…&format=json&limit=1000&filters[city]=Kolkata`
- **Record shape** (verified 2026-11-07): one record per station per pollutant.

  ```json
  {
    "station": "Ballygunge, Kolkata - WBPCB",
    "last_update": "07-11-2026 12:00:00",
    "latitude": "…", "longitude": "…",
    "pollutant_id": "PM2.5",
    "min_value": "71", "max_value": "240", "avg_value": "141"
  }
  ```

  The live API uses `min_value / max_value / avg_value`. Older examples online use `pollutant_min / pollutant_max / pollutant_avg`; the parser accepts both. `last_update` is IST.
- **Values are CPCB AQI sub-indices, not concentrations.** CO reads about 30–75 (impossible as mg/m³), and NH₃ reads 6–15, which fits its sub-index scale. A station's AQI is therefore its highest sub-index, and the dominant pollutant is the one with that value.
- **Timing:** CPCB computes each hour's AQI after the hour ends, and data.gov.in publishes it about 30–40 minutes later (12:00 data appeared at 12:32 IST on 2026-11-07). The station card shows when the next reading is expected.
- **Coverage:** Ballygunge, Bidhannagar, Fort William, Jadavpur, Rabindra Bharati University and Rabindra Sarobar, plus Victoria (not shown on the dashboard).

### How it is served

The API key stays on the server. A shared module fetches the feed, groups records by station and caches the result for 5 minutes:

- `aqi-dashboard/shared/cpcbFeed.mjs`: fetching, parsing and caching
- served at **`/api/cpcb`** by:
  - the Vite dev and preview servers (`aqi-dashboard/vite.config.js`)
  - Render (`aqi-dashboard/server.mjs`)
  - Netlify (`aqi-dashboard/netlify/functions/cpcb.mjs`, through a redirect in `netlify.toml`)

Without a key, `/api/cpcb` returns `503 not_configured`. The browser then stops asking for the rest of the session and uses sources 2–4.

In the browser, `aqi-dashboard/src/utils/cpcb.ts` loads `/api/cpcb` (cached for 2 minutes), matches stations by name and computes the AQI.

## 2–3. WAQI (fallback)

- **Station feed:** `feed/@<uid>` using the UIDs in `aqi-dashboard/src/data/waqiStationUids.ts`. WAQI's copies of all six stations stopped updating on 2026-06-23.
- **Nearest sensor:** one `map/bounds/?latlng=…&networks=all` request covers every station. `networks=all` is required; without it WAQI leaves out the WBPCB sensor network. The nearest sensor within 5 km is then read with `feed/@-<uid>` (these sensors have negative UIDs). They report PM2.5 only, so other pollutants show the station's last historical value, marked "last known".
- **Not used:** WAQI's `feed/geo:<lat>;<lon>` endpoint returns unrelated cities for Kolkata coordinates (Lhasa with a real token, Shanghai with the demo token), so the dashboard no longer calls it. The proxies reject it.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `DATA_GOV_IN_API_KEY` | Server only (`.env.local` locally; Render or Netlify environment in production) | CPCB feed. Get a free key from data.gov.in → My Account. |
| `WAQI_API_TOKEN` | Server only | WAQI proxy |
| `VITE_WAQI_PROXY_URL` | Build-time | `/api/waqi` on Render |
| `VITE_WAQI_API_TOKEN` | Local development only | Direct WAQI calls without a proxy |

The proxy routes only allow `feed/@<uid>` and `map/bounds/?latlng=…&networks=all`.

## Faster data

CPCB's CCR dashboard (airquality.cpcb.gov.in) shows raw 15-minute readings, but it has no public API, and those readings are unvalidated rather than the official AQI. The way to get them is to ask CPCB or WBPCB for access; the dashboard does not scrape the site.
