from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "Dataset"
MASTER_DIR = DATASET_DIR / "master"

STATION_NAME_ALIASES = {
    "Ballygunge": "Ballygunge",
    "Bidhannagar": "Bidhannagar",
    "Fort William": "Fort William",
    "JU": "Jadavpur",
    "Rabindra Sarobar": "Rabindra Sarobar",
    "RBU": "Rabindra Bharati University",
}


def main() -> None:
    aqi_path = MASTER_DIR / "master_long_format.csv"
    station_path = MASTER_DIR / "station_master.csv"
    out_path = MASTER_DIR / "aqi_station_linked.csv"

    aqi = pd.read_csv(aqi_path)
    stations = pd.read_csv(station_path)

    aqi["station_name"] = aqi["station_name"].map(STATION_NAME_ALIASES)

    linked = aqi.merge(stations, on="station_name", how="left", validate="m:1")
    linked = linked[
        [
            "station_id",
            "station_name",
            "latitude",
            "longitude",
            "date",
            "pm25",
            "pm10",
            "no2",
            "so2",
            "co",
            "o3",
            "nh3",
        ]
    ]

    linked.to_csv(out_path, index=False)

    report = DATASET_DIR / "phase-1-12-aqi-station-link.md"
    lines = [
        "# Phase 1.12 AQI + Station Master Link",
        "",
        "The master AQI table was linked to the station master table using the station identity mapping.",
        "",
        "## Join logic",
        "",
        "- `master_long_format.station_name` was normalized to the canonical station names used by `station_master`.",
        "- `station_master.station_id` was then attached to every AQI row.",
        "- The final table is keyed by `station_id` and retains the AQI measurements.",
        "",
        "## Output file",
        "",
        f"- `{out_path.as_posix()}`",
        "",
        "## Final schema",
        "",
        "`station_id, station_name, latitude, longitude, date, pm25, pm10, no2, so2, co, o3, nh3`",
        "",
        "## Validation summary",
        "",
    ]

    lines.append(f"- Total rows: `{len(linked)}`")
    lines.append(f"- Total missing cells: `{int(linked.isna().sum().sum())}`")
    lines.append(f"- Unique station_id values: `{linked['station_id'].nunique()}`")
    lines.append("")
    lines.append("| station_id | station_name | rows |")
    lines.append("|---|---|---:|")
    for (station_id, station_name), group in linked.groupby(["station_id", "station_name"], sort=True):
        lines.append(f"| {station_id} | {station_name} | {len(group)} |")

    report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report)
    print(out_path)


if __name__ == "__main__":
    main()