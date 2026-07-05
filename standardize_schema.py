from __future__ import annotations

from pathlib import Path

import pandas as pd


DATASET_DIR = Path(__file__).resolve().parent / "Dataset"
CLEAN_DIR = DATASET_DIR / "cleaned"
STANDARD_DIR = DATASET_DIR / "standardized"

SOURCE_TO_TARGET = {
    "Timestamp": "date",
    "PM2.5 (ug/m3)": "pm25",
    "PM10 (ug/m3)": "pm10",
    "NO2 (ug/m3)": "no2",
    "SO2 (ug/m3)": "so2",
    "CO (mg/m3)": "co",
    "Ozone (ug/m3)": "o3",
    "NH3 (ug/m3)": "nh3",
}

TARGET_ORDER = ["date", "pm25", "pm10", "no2", "so2", "co", "o3", "nh3"]


def standardize_file(src: Path) -> dict[str, object]:
    df = pd.read_csv(src)
    out = df[list(SOURCE_TO_TARGET.keys())].rename(columns=SOURCE_TO_TARGET)
    out["date"] = pd.to_datetime(out["date"], errors="coerce").dt.strftime("%Y-%m-%dT%H:%M:%S")
    out = out[TARGET_ORDER]

    out_path = STANDARD_DIR / f"{src.stem.replace('_cleaned', '')}_standardized.csv"
    out.to_csv(out_path, index=False)

    return {
        "station": src.stem.replace("_cleaned", ""),
        "rows": len(out),
        "columns": list(out.columns),
        "missing": int(out.isna().sum().sum()),
        "out_path": out_path,
    }


def main() -> None:
    STANDARD_DIR.mkdir(parents=True, exist_ok=True)
    summaries = [standardize_file(src) for src in sorted(CLEAN_DIR.glob("*.csv"))]

    lines = [
        "# Phase 1.8 Standard Schema",
        "",
        "The cleaned datasets were standardized to the requested schema:",
        "",
        "`date, pm25, pm10, no2, so2, co, o3, nh3`",
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

    report_path = DATASET_DIR / "phase-1-8-standard-schema.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report_path)
    for item in summaries:
        print(item["out_path"])


if __name__ == "__main__":
    main()
