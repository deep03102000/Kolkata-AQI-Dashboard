# Phase 4.4 Date Range Picker

Added a lightweight `DateRangePicker` component built from native `<input type="date">` fields.

## Behavior

- Uses a simple Live / Historical mode toggle.
- Lets the user choose start and end dates.
- Stays styled with Tailwind rather than adding a calendar library.
- Updates `StationContext` so the rest of the dashboard reacts immediately.

## Result
Historical filtering is available without adding a heavy date-picker dependency.