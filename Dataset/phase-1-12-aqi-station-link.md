# Phase 1.12 AQI + Station Master Link

The master AQI table was linked to the station master table using the station identity mapping.

## Join logic

- `master_long_format.station_name` was normalized to the canonical station names used by `station_master`.
- `station_master.station_id` was then attached to every AQI row.
- The final table is keyed by `station_id` and retains the AQI measurements.

## Output file

- `D:/Applications/kolkata-aqi-dashboard/Dataset/master/aqi_station_linked.csv`

## Final schema

`station_id, station_name, latitude, longitude, date, pm25, pm10, no2, so2, co, o3, nh3`

## Validation summary

- Total rows: `421056`
- Total missing cells: `0`
- Unique station_id values: `6`

| station_id | station_name | rows |
|---|---|---:|
| site_296 | Rabindra Bharati University | 70176 |
| site_5110 | Fort William | 70176 |
| site_5111 | Jadavpur | 70176 |
| site_5126 | Rabindra Sarobar | 70176 |
| site_5129 | Bidhannagar | 70176 |
| site_5238 | Ballygunge | 70176 |
