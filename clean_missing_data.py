from __future__ import annotations

from pathlib import Path

import pandas as pd


DATASET_DIR = Path(__file__).resolve().parent / "Dataset"
CLEAN_DIR = DATASET_DIR / "cleaned"

METADATA_COLUMNS = ["_id", "Station ID", "State", "City", "Station Name"]
TIMESTAMP_COLUMN = "Timestamp"


def clean_file(src: Path) -> dict[str, object]:
    df = pd.read_csv(src)
    original_rows = len(df)

    timestamp_missing = df[TIMESTAMP_COLUMN].isna() | (df[TIMESTAMP_COLUMN].astype(str).str.strip() == "")
    dropped_rows = int(timestamp_missing.sum())
    df = df.loc[~timestamp_missing].copy()

    df[TIMESTAMP_COLUMN] = pd.to_datetime(df[TIMESTAMP_COLUMN], errors="coerce")
    invalid_timestamp = df[TIMESTAMP_COLUMN].isna()
    if invalid_timestamp.any():
        dropped_rows += int(invalid_timestamp.sum())
        df = df.loc[~invalid_timestamp].copy()

    df = df.sort_values(TIMESTAMP_COLUMN).set_index(TIMESTAMP_COLUMN)

    value_columns = [c for c in df.columns if c not in METADATA_COLUMNS]
    always_blank = [c for c in value_columns if df[c].isna().all()]
    numeric_columns = [c for c in value_columns if c not in always_blank]

    df[numeric_columns] = df[numeric_columns].apply(pd.to_numeric, errors="coerce")
    df[numeric_columns] = df[numeric_columns].interpolate(method="time", limit_direction="both")
    df[numeric_columns] = df[numeric_columns].ffill().bfill()

    for col in METADATA_COLUMNS:
        if col in df.columns:
            df[col] = df[col].ffill().bfill()

    df = df.reset_index()
    df[TIMESTAMP_COLUMN] = df[TIMESTAMP_COLUMN].dt.strftime("%Y-%m-%dT%H:%M:%S")
    df = df[[*METADATA_COLUMNS, TIMESTAMP_COLUMN, *value_columns]]

    out_path = CLEAN_DIR / f"{src.stem}_cleaned.csv"
    df.to_csv(out_path, index=False)

    remaining_missing = int(df.isna().sum().sum())
    return {
        "station": src.stem,
        "original_rows": original_rows,
        "clean_rows": len(df),
        "dropped_rows": dropped_rows,
        "always_blank": always_blank,
        "remaining_missing": remaining_missing,
        "out_path": out_path,
    }


def main() -> None:
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)

    sources = sorted(DATASET_DIR.glob("*.csv"))
    summaries = [clean_file(src) for src in sources]

    lines = [
        "# Phase 1.6 Missing-Data Strategy",
        "",
        "## Applied strategy",
        "",
        "- Drop the single malformed row with no `Timestamp` from each file.",
        "- Interpolate numeric sensor values using time-based linear interpolation within each station.",
        "- Use forward/back fill after interpolation to cover edge gaps, when present.",
        "- Keep `Xylene (ug/m3)` and `O Xylene (ug/m3)` flagged as missing because they are completely blank in all six files.",
        "",
        "## Output files",
        "",
    ]

    for item in summaries:
        lines.append(f"- `{item['out_path'].as_posix()}`")

    lines += [
        "",
        "## Cleaning summary",
        "",
        "| Station | Original rows | Clean rows | Dropped rows | Remaining missing cells | Flagged all-blank columns |",
        "|---|---:|---:|---:|---:|---|",
    ]

    for item in summaries:
        lines.append(
            f"| {item['station']} | {item['original_rows']} | {item['clean_rows']} | {item['dropped_rows']} | {item['remaining_missing']} | "
            + ", ".join(f"`{c}`" for c in item["always_blank"])
            + " |"
        )

    report_path = DATASET_DIR / "phase-1-6-missing-data-strategy.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(report_path)
    for item in summaries:
        print(item["out_path"])


if __name__ == "__main__":
    main()
