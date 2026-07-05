# Phase 5.2 Manual WAQI Response Check

This phase documents the WAQI response shape so the live-data hooks can normalize the upstream payload consistently.

## Tested Station

The station master entry used for the live-data path is Ballygunge:

- Station ID: `site_5238`
- Station name: `Ballygunge`
- Latitude: `22.5191616`
- Longitude: `88.3721923`

## Manual Request Pattern

The live-data flow can query the geo endpoint for station resolution or the direct UID endpoint for the actual feed.

```bash
curl "https://api.waqi.info/feed/geo:22.5191616;88.3721923/?token=YOUR_WAQI_TOKEN"
curl "https://api.waqi.info/feed/@12746/?token=YOUR_WAQI_TOKEN"
```

## Response Shape Used by the App

The dashboard expects the WAQI payload to contain:

- `status`
- `data.aqi`
- `data.idx`
- `data.iaqi`
- `data.city`
- `data.dominentpol`
- `data.time`
- `data.attributions`

## Normalization Rules

- `data.aqi` is converted to a numeric AQI value.
- `data.idx` is used as the resolved WAQI station UID.
- `data.city.name` and `data.city.url` are surfaced in the live summary.
- `data.time.s` becomes the displayed update timestamp.
- `data.iaqi` is mapped into the pollutant grid.

## Implementation Note

The app prefers a stable station UID mapping for live requests and only falls back to geo resolution when a mapping is missing. The actual UI request path uses `feed/@<uid>/`, which is why the UID table in `aqi-dashboard/src/data/waqiStationUids.ts` matters.