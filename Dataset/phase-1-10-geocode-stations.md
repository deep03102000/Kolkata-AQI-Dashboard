# Phase 1.10 Station Geocoding

The six stations were geocoded using the nearest clearly documented map point for each station name.
Where the monitor is identified only by a neighborhood or campus name in public sources, the centroid or nearest named landmark was used.

## Output file

- `D:/Applications/kolkata-aqi-dashboard/Dataset/geocoded/station_geocodes.csv`

## Validation table

| Station | Latitude | Longitude | Reference place | Source |
|---|---:|---:|---|---|
| Ballygunge | 22.5191616 | 88.3721923 | Ballygunge Junction railway station | https://en.wikipedia.org/wiki/Ballygunge_Junction_railway_station |
| Bidhannagar | 22.5912300 | 88.3907370 | Bidhannagar Road railway station | https://en.wikipedia.org/wiki/Bidhannagar_Road_railway_station |
| Fort William | 22.5577000 | 88.3380000 | Fort William | https://en.wikipedia.org/wiki/Fort_William%2C_West_Bengal |
| Jadavpur | 22.5025130 | 88.3676051 | Jadavpur neighbourhood / Jadavpur University area | https://en.wikipedia.org/wiki/Jadavpur |
| Rabindra Sarobar | 22.5057000 | 88.3452100 | Rabindra Sarobar metro station / lake area | https://en.wikipedia.org/wiki/Rabindra_Sarobar_metro_station |
| Rabindra Bharati University | 22.5844542 | 88.3593841 | Rabindra Bharati University | https://en.wikipedia.org/wiki/Rabindra_Bharati_University |

## Cross-check note

I cross-checked the chosen points against map-linked public pages and the surrounding location context surfaced by web search. This is a landmark-level geocode, not a survey-grade GPS capture of the monitoring hardware.
