# Phase 14: Simpler UI, Historical Comparison and Lighter Loading

## Goal
Make the dashboard quick to understand and quick to load, on phones as well as desktops.

## 14.1 Control bar
`ControlBar` stays at the top of the screen and holds everything a user changes most often:

- the Live/Historical toggle, with a sliding highlight
- a station picker
- start and end dates, limited to the dataset's 2024-01-01 to 2025-12-31
- presets: last 7, 30 and 90 days of data, 2025 and 2024

Switching to Historical with no dates set selects the last 30 days of data, so the view is never empty. `DateRangePicker` was removed. On phones these controls used to be about 3,000 px down the page.

## 14.2 Historical mode follows the date range everywhere
The comparison table, the sidebar station list and the map popups show each station's **average AQI over the selected range** in Historical mode. They use the same calculation, `getHistoricalRangeAqi` in `src/utils/aqi.ts`, so the views always agree. Live polling stops while Historical mode is open.

## 14.3 Layout
- **Phone order:** controls → map → station panel → chart → table → legend.
- **Desktop:** the station panel sits in the right-hand column.
- **Sidebar:** a station list with AQI chips, one selected-station card (live reading, or the date-range average in Historical mode) and grouped map-layer controls in plain language.
- **Removed developer text:** "Phase 3.4", "WAQI token configured" and "Phase 12 geometry exports".

## 14.4 Minimal style and motion
- **Cards:** one flat `.card` style in `src/style.css` with a thin border and no shadow or blur. Labels are sentence case.
- **Comparison table:** each row shows the AQI, a coloured bar and a short source line ("CPCB · 1:00 pm"); the full detail is in a hover tooltip.
- **Live card:** a large AQI number, the category in its colour, a 0–500 CPCB colour scale with a marker, and a compact pollutant bar list.
- **Motion, all in CSS:**
  - sections fade up in sequence;
  - `AnimatedNumber` counts AQI values up to each new value;
  - bars and the scale marker glide to their values;
  - loading placeholders shimmer.

  Everything is disabled under `prefers-reduced-motion`.

## 14.5 Lighter loading
Measured in development mode, first open went from **70 MB to 7 MB**:

- **History files:** the live path used to download every station's full 2-year history (about 8 MB each) only to fill pollutants missing from a live reading. History now loads only when a reading actually lacks a pollutant, and CPCB reports all seven.
- **Optional layers:** the road, 3 km circle, bridge and trio layers mount only after first being switched on. The road network (about 16 MB raw) no longer loads while roads are hidden.

## 14.6 Fixes along the way
- Switching stations no longer briefly shows the previous station's live reading.
- Live timestamps use WAQI's ISO time, so they display correctly outside IST.
- Chart time labels no longer overlap on phones.
- The map popup timestamp is no longer cut off, and popups show the date-range average in Historical mode.
