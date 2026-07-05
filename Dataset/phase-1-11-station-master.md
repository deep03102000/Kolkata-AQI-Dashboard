# Phase 1.11 Station Master Table

The station master table combines the stable station identifier with the geocoded station name and coordinates.

## Output file

- `D:/Applications/kolkata-aqi-dashboard/Dataset/master/station_master.csv`

## Schema

`station_id, station_name, latitude, longitude`

## Validation table

| station_id | station_name | latitude | longitude |
|---|---|---:|---:|
| site_5238 | Ballygunge | 22.5191616 | 88.3721923 |
| site_5129 | Bidhannagar | 22.5912300 | 88.3907370 |
| site_5110 | Fort William | 22.5577000 | 88.3380000 |
| site_5111 | Jadavpur | 22.5025130 | 88.3676051 |
| site_5126 | Rabindra Sarobar | 22.5057000 | 88.3452100 |
| site_296 | Rabindra Bharati University | 22.5844542 | 88.3593841 |

## Note

The raw CSVs contain one additional `Station ID` value of `2025` in each file, but the repeated `site_####` value was used as the station master identifier because it is stable across the station rows.
