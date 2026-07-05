# Phase 1.6 Missing-Data Strategy

## Applied strategy

- Drop the single malformed row with no `Timestamp` from each file.
- Interpolate numeric sensor values using time-based linear interpolation within each station.
- Use forward/back fill after interpolation to cover edge gaps, when present.
- Keep `Xylene (ug/m3)` and `O Xylene (ug/m3)` flagged as missing because they are completely blank in all six files.

## Output files

- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/Ballygunge_cleaned.csv`
- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/Bidhannagar_cleaned.csv`
- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/Fort William_cleaned.csv`
- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/JU_cleaned.csv`
- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/Rabindra Sarobar_cleaned.csv`
- `D:/Applications/kolkata-aqi-dashboard/Dataset/cleaned/RBU_cleaned.csv`

## Cleaning summary

| Station | Original rows | Clean rows | Dropped rows | Remaining missing cells | Flagged all-blank columns |
|---|---:|---:|---:|---:|---|
| Ballygunge | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
| Bidhannagar | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
| Fort William | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
| JU | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
| Rabindra Sarobar | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
| RBU | 70177 | 70176 | 1 | 140352 | `Xylene (ug/m3)`, `O Xylene (ug/m3)` |
