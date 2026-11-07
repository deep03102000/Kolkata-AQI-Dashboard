# Research Report Outline

## 1. Problem Statement
Describe the monitoring and dashboard goal.

## 2. Data Sources
List the raw station workbooks and map references, plus the live sources: CPCB's real-time feed on data.gov.in (primary), WAQI (fallback) and Open-Meteo (weather estimates).

## 3. Cleaning Approach
Summarize missing-data handling, unit checks and schema standardization.

## 4. Station Mapping
Explain how station names were linked to coordinates and IDs, how CPCB station names are matched for live data, and the WAQI UID mapping used for the fallback.

## 5. Frontend Approach
Summarize the map, control bar, station panel, chart, comparison table and live-data integration, including the source order and freshness rules.

## 6. Results
Describe the static exports, the live CPCB path, the historical comparison and the dashboard output.

## 7. Limitations
Note data-quality issues found in third-party live data (WAQI's wrong-city lookup and frozen station feeds), CPCB's 30–40 minute publishing delay, weather being model estimates rather than station sensors, and the lack of a public API for CPCB's 15-minute data.

## 8. Next Steps
List future work, such as requesting CPCB or WBPCB station data access, adding the Victoria station, and refining road assignment.
