from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "Dataset"
MASTER_DIR = DATASET_DIR / "master"
GEO_PATH = DATASET_DIR / "geocoded" / "station_geocodes.csv"

SOURCE_STATION_IDS = {
    "Ballygunge": "site_5238",
    "Bidhannagar": "site_5129",
    "Fort William": "site_5110",
    "Jadavpur": "site_5111",
    "Rabindra Sarobar": "site_5126",
    "Rabindra Bharati University": "site_296",
}


def main() -> None:
    MASTER_DIR.mkdir(parents=True, exist_ok=True)

    geo = pd.read_csv(GEO_PATH)
    geo = geo[["station_name", "latitude", "longitude"]].copy()

    rows = []
    for _, row in geo.iterrows():
        station_name = row["station_name"]
        rows.append(
            {
                "station_id": SOURCE_STATION_IDS[station_name],
                "station_name": station_name,
                "latitude": row["latitude"],
                "longitude": row["longitude"],
            }
        )

    master = pd.DataFrame(rows, columns=["station_id", "station_name", "latitude", "longitude"])
    out_path = MASTER_DIR / "station_master.csv"
    master.to_csv(out_path, index=False)

    report = DATASET_DIR / "phase-1-11-station-master.md"
    lines = [
        "# Phase 1.11 Station Master Table",
        "",
        "The station master table combines the stable station identifier with the geocoded station name and coordinates.",
        "",
        "## Output file",
        "",
        f"- `{out_path.as_posix()}`",
        "",
        "## Schema",
        "",
        "`station_id, station_name, latitude, longitude`",
        "",
        "## Validation table",
        "",
        "| station_id | station_name | latitude | longitude |",
        "|---|---|---:|---:|",
    ]
    for _, row in master.iterrows():
        lines.append(
            f"| {row['station_id']} | {row['station_name']} | {row['latitude']:.7f} | {row['longitude']:.7f} |"
        )

    lines += [
        "",
        "## Note",
        "",
        "The raw CSVs contain one additional `Station ID` value of `2025` in each file, but the repeated `site_####` value was used as the station master identifier because it is stable across the station rows.",
    ]

    report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report)
    print(out_path)


if __name__ == "__main__":
    main()
