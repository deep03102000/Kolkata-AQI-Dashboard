from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "Dataset"
MASTER_PATH = DATASET_DIR / "master" / "aqi_station_linked.csv"
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"


def main() -> None:
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(MASTER_PATH)
    df = df.sort_values(["station_id", "date"], kind="mergesort")

    exported = []
    for station_id, group in df.groupby("station_id", sort=True):
        group = group.copy()
        station_name = group["station_name"].iloc[0]
        latitude = float(group["latitude"].iloc[0])
        longitude = float(group["longitude"].iloc[0])

        records = group[["date", "pm25", "pm10", "no2", "so2", "co", "o3", "nh3"]].to_dict(
            orient="records"
        )
        payload = {
            "station_id": station_id,
            "station_name": station_name,
            "latitude": latitude,
            "longitude": longitude,
            "records": records,
        }

        out_path = PUBLIC_DATA_DIR / f"station_{station_id}.json"
        out_path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

        exported.append(
            {
                "station_id": station_id,
                "station_name": station_name,
                "rows": len(records),
                "path": out_path,
            }
        )

    report = DATASET_DIR / "phase-1-13-static-json-exports.md"
    lines = [
        "# Phase 1.13 Static JSON Exports",
        "",
        "The final merged AQI dataset was exported as one compact JSON file per station under `public/data/`.",
        "Each file is designed to be fetched on demand and is not imported into the JS bundle.",
        "",
        "## File pattern",
        "",
        "`/public/data/station_<station_id>.json`",
        "",
        "## Payload shape",
        "",
        "`station_id, station_name, latitude, longitude, records[]`",
        "",
        "## Exported files",
        "",
    ]

    for item in exported:
        lines.append(
            f"- `{item['path'].as_posix()}` ({item['station_id']} / {item['station_name']} / {item['rows']} rows)"
        )

    report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report)
    for item in exported:
        print(item["path"])


if __name__ == "__main__":
    main()
