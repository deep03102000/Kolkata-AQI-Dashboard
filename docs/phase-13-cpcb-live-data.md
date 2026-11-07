# Phase 13: Reliable Live AQI from CPCB

## Goal
Show correct, current live AQI for all six stations, and say where each reading comes from.

## What Was Wrong

### 13.1 Every station showed Lhasa's AQI
`useLiveAqi` fetched two candidates per station, WAQI's `feed/@<uid>` and `feed/geo:<lat>;<lon>`, and kept whichever had the newer timestamp. For every Kolkata coordinate, WAQI's geo lookup returned an unrelated city: a radiation station in Lhasa with the project token, and Shanghai with the demo token. Its timestamp was current, so it always won, and every station showed AQI 30.

### 13.2 WAQI's copies of the stations were frozen
WAQI's `feed/@<uid>` for all six stations stopped updating on 2026-06-23. WAQI search lists them with `aqi: "-"`.

## What Changed

### 13.3 Removed the geo lookup
Stations now resolve only through the fixed UIDs in `src/data/waqiStationUids.ts`. The WAQI proxies reject `feed/geo:` paths. The IndexedDB cache key moved to `v3` so cached Lhasa readings are never shown again.

### 13.4 Nearest live sensor fallback
When an official reading is more than 6 hours old, the app uses the nearest live WAQI sensor within 5 km, usually a West Bengal Pollution Control Board low-cost sensor:

- One `map/bounds/?latlng=…&networks=all` request covers every station. `networks=all` is required; without it WAQI leaves out the WBPCB network.
- The nearest sensors are read with `feed/@-<uid>` (these have negative UIDs). Up to 3 are tried in order of distance.
- The UI names the sensor and its distance, for example "From Ballygunge Campus, C.U (1.2 km away)".

### 13.5 Official CPCB feed as the primary source
The CPCB dataset "Real time Air Quality Index from various locations" on data.gov.in has current hourly readings for all six stations. It is now the first source:

- `shared/cpcbFeed.mjs` fetches `filters[city]=Kolkata` with `DATA_GOV_IN_API_KEY`, groups records by station and caches them.
- The same module serves `/api/cpcb` from the Vite dev server, `server.mjs` (Render) and `netlify/functions/cpcb.mjs` (Netlify). The key never reaches the browser.
- Checked against the live API on 2026-11-07:
  - The fields are `min_value / max_value / avg_value`, not the documented `pollutant_*` names; the parser accepts both.
  - The values are CPCB AQI sub-indices: CO reads 28–75, which is impossible as mg/m³. A station's AQI is therefore its highest sub-index.

Source order is now: CPCB station → WAQI station → nearest live sensor → newest stale official reading.

### 13.6 Freshness rules
- CPCB publishes each hour's AQI about 30–40 minutes after the hour. The station card shows when the next reading is expected.
- **Server cache:** 5 minutes normally; 1 minute once the next reading is due (25 minutes past the following hour).
- **Page load:** the first request after a load sends `?fresh=1`. The server fetches from data.gov.in only if a newer reading could exist and its copy is older than 30 seconds; otherwise it answers from cache. Reloads show live AQI in about 0.8 s.
- **Browser:** re-asks the server every minute.

## Result
All six stations show official CPCB readings, matching CPCB's own AQI on India's scale. If CPCB stops updating, the app falls back automatically and labels the source.

See [Live Data Sources](./live-data-sources.md) for the full reference.
