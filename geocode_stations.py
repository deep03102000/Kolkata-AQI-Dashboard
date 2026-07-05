from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "Dataset"
OUT_DIR = DATASET_DIR / "geocoded"

STATIONS = [
    {
        "station_name": "Ballygunge",
        "latitude": 22.5191616,
        "longitude": 88.3721923,
        "reference_place": "Ballygunge Junction railway station",
        "source_note": "Used the Ballygunge landmark with a documented map coordinate; cross-checked against locality/map listings.",
        "source_url": "https://en.wikipedia.org/wiki/Ballygunge_Junction_railway_station",
    },
    {
        "station_name": "Bidhannagar",
        "latitude": 22.5912300,
        "longitude": 88.3907370,
        "reference_place": "Bidhannagar Road railway station",
        "source_note": "Used the closest clearly mapped station point in Salt Lake/Bidhannagar; cross-checked against city/map listings.",
        "source_url": "https://en.wikipedia.org/wiki/Bidhannagar_Road_railway_station",
    },
    {
        "station_name": "Fort William",
        "latitude": 22.5577000,
        "longitude": 88.3380000,
        "reference_place": "Fort William",
        "source_note": "Fort location is directly documented; map cross-check aligns with central Kolkata landmark listing.",
        "source_url": "https://en.wikipedia.org/wiki/Fort_William%2C_West_Bengal",
    },
    {
        "station_name": "Jadavpur",
        "latitude": 22.5025130,
        "longitude": 88.3676051,
        "reference_place": "Jadavpur neighbourhood / Jadavpur University area",
        "source_note": "Used the Jadavpur neighbourhood centroid because the monitoring station is identified as Jadavpur/Jadavpur University in public reporting.",
        "source_url": "https://en.wikipedia.org/wiki/Jadavpur",
    },
    {
        "station_name": "Rabindra Sarobar",
        "latitude": 22.5057000,
        "longitude": 88.3452100,
        "reference_place": "Rabindra Sarobar metro station / lake area",
        "source_note": "Used the metro/lake-area point associated with Rabindra Sarobar; map cross-check matches the south Kolkata lake location.",
        "source_url": "https://en.wikipedia.org/wiki/Rabindra_Sarobar_metro_station",
    },
    {
        "station_name": "Rabindra Bharati University",
        "latitude": 22.5844542,
        "longitude": 88.3593841,
        "reference_place": "Rabindra Bharati University",
        "source_note": "University coordinates are directly documented; map cross-check aligns with Jorasanko campus location.",
        "source_url": "https://en.wikipedia.org/wiki/Rabindra_Bharati_University",
    },
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(STATIONS)
    out_csv = OUT_DIR / "station_geocodes.csv"
    df.to_csv(out_csv, index=False)

    report = DATASET_DIR / "phase-1-10-geocode-stations.md"
    lines = [
        "# Phase 1.10 Station Geocoding",
        "",
        "The six stations were geocoded using the nearest clearly documented map point for each station name.",
        "Where the monitor is identified only by a neighborhood or campus name in public sources, the centroid or nearest named landmark was used.",
        "",
        "## Output file",
        "",
        f"- `{out_csv.as_posix()}`",
        "",
        "## Validation table",
        "",
        "| Station | Latitude | Longitude | Reference place | Source |",
        "|---|---:|---:|---|---|",
    ]

    for row in STATIONS:
        lines.append(
            f"| {row['station_name']} | {row['latitude']:.7f} | {row['longitude']:.7f} | {row['reference_place']} | {row['source_url']} |"
        )

    lines += [
        "",
        "## Cross-check note",
        "",
        "I cross-checked the chosen points against map-linked public pages and the surrounding location context surfaced by web search. This is a landmark-level geocode, not a survey-grade GPS capture of the monitoring hardware.",
    ]

    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(report)
    print(out_csv)


if __name__ == "__main__":
    main()
