from __future__ import annotations

from pathlib import Path

import pandas as pd


DATASET_DIR = Path(__file__).resolve().parent / "Dataset"
STANDARD_DIR = DATASET_DIR / "standardized"
STATION_DIR = DATASET_DIR / "station_named"

TARGET_COLUMNS = [
    "station_name",
    "date",
    "pm25",
    "pm10",
    "no2",
    "so2",
    "co",
    "o3",
    "nh3",
]


def add_station_name(src: Path) -> dict[str, object]:
    df = pd.read_csv(src)
    station_name = src.stem.replace("_standardized", "")
    df.insert(0, "station_name", station_name)
    df = df[TARGET_COLUMNS]

    out_path = STATION_DIR / f"{station_name}_station_named.csv"
    df.to_csv(out_path, index=False)

    return {
        "station": station_name,
        "rows": len(df),
        "columns": list(df.columns),
        "missing": int(df.isna().sum().sum()),
        "out_path": out_path,
    }


def main() -> None:
    STATION_DIR.mkdir(parents=True, exist_ok=True)
    summaries = [add_station_name(src) for src in sorted(STANDARD_DIR.glob("*.csv"))]

    lines = [
        "# Phase 1.9 Station Name Column",
        "",
        "A `station_name` column was added to each standardized dataset.",
        "",
        "## Column order",
        "",
        "`station_name, date, pm25, pm10, no2, so2, co, o3, nh3`",
        "",
        "## Output files",
        "",
    ]

    for item in summaries:
        lines.append(f"- `{item['out_path'].as_posix()}`")

    lines += [
        "",
        "## Validation summary",
        "",
        "| Station | Rows | Missing cells | Columns |",
        "|---|---:|---:|---|",
    ]

    for item in summaries:
        lines.append(
            f"| {item['station']} | {item['rows']} | {item['missing']} | "
            + ", ".join(item["columns"])
            + " |"
        )

    report_path = DATASET_DIR / "phase-1-9-station-name.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report_path)
    for item in summaries:
        print(item["out_path"])


if __name__ == "__main__":
    main()
