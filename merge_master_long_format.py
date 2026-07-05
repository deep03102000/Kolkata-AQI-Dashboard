from __future__ import annotations

from pathlib import Path

import pandas as pd


DATASET_DIR = Path(__file__).resolve().parent / "Dataset"
STATION_DIR = DATASET_DIR / "station_named"
MASTER_DIR = DATASET_DIR / "master"

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


def main() -> None:
    MASTER_DIR.mkdir(parents=True, exist_ok=True)

    frames = []
    summaries = []

    for src in sorted(STATION_DIR.glob("*.csv")):
        df = pd.read_csv(src)
        df = df[TARGET_COLUMNS]
        frames.append(df)
        summaries.append(
            {
                "station": df["station_name"].iloc[0],
                "rows": len(df),
                "missing": int(df.isna().sum().sum()),
            }
        )

    master = pd.concat(frames, ignore_index=True)
    master = master[TARGET_COLUMNS]

    out_path = MASTER_DIR / "master_long_format.csv"
    master.to_csv(out_path, index=False)

    lines = [
        "# Phase 1.9 Master Long Format",
        "",
        "All six station-specific cleaned datasets were merged into one long-format table.",
        "",
        "## Schema",
        "",
        "`station_name, date, pm25, pm10, no2, so2, co, o3, nh3`",
        "",
        "## Output file",
        "",
        f"- `{out_path.as_posix()}`",
        "",
        "## Validation summary",
        "",
        f"- Total rows: `{len(master)}`",
        f"- Total missing cells: `{int(master.isna().sum().sum())}`",
        "",
        "| Station | Rows | Missing cells |",
        "|---|---:|---:|",
    ]

    for item in summaries:
        lines.append(f"| {item['station']} | {item['rows']} | {item['missing']} |")

    report_path = DATASET_DIR / "phase-1-9-master-long-format.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report_path)
    print(out_path)


if __name__ == "__main__":
    main()
