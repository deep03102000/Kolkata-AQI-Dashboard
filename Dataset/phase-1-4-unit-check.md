# Phase 1.4 Unit Check

## Scope checked
The following parameters were checked against the units shown in the column headers:

- `PM2.5 (ug/m3)`
- `PM10 (ug/m3)`
- `CO (mg/m3)`
- `NO (ug/m3)`
- `NO2 (ug/m3)`
- `NOx (ppb)`
- `NH3 (ug/m3)`
- `SO2 (ug/m3)`
- `Ozone (ug/m3)`
- `Benzene (ug/m3)`
- `Toluene (ug/m3)`
- `Xylene (ug/m3)`
- `O Xylene (ug/m3)`
- `Eth-Benzene (ug/m3)`
- `MP-Xylene (ug/m3)`

## Result
No confirmed unit mismatch was found in the populated columns.

## Notes
- `PM2.5` and `PM10` values are in a plausible `ug/m3` range across all files.
- `CO` values are in a plausible `mg/m3` range across all files, so they are not flagged as a mismatch.
- `Xylene (ug/m3)` and `O Xylene (ug/m3)` are present in every file but contain only blank values, so their units cannot be validated from the data.

## Flagged issue
- `Xylene (ug/m3)` and `O Xylene (ug/m3)` have no recorded measurements in any of the six files.
