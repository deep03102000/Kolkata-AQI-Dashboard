# Phase 12.9 - Dedicated Three-Station Bridge Overlay

Phase 12.9 adds a separate three-station bridge overlay without changing the existing six-station `BRIDGES` layer.

## 12.9.0 Skip the old narrowing path

The earlier idea of narrowing the existing bridge export down to only the three-station subset was never actually implemented in this repository.
Because there is nothing to revert, skip 12.9.0 entirely and proceed directly to 12.9.1.

## 12.9.1 Confirm the exact station IDs

The three-station overlay uses these exact station IDs from `station_master.json`:
- `site_5238` for Ballygunge
- `site_5111` for Jadavpur
- `site_5126` for Rabindra Sarobar

## 12.9.1.2 Record the IDs as they appear in the file

These `station_id` values were checked directly in `aqi-dashboard/public/data/station_master.json` and should be treated as the source of truth:
- `site_5238`
- `site_5111`
- `site_5126`

## 12.9.1.3 Record the station names exactly as spelled

These `station_name` strings were checked directly in `aqi-dashboard/public/data/station_master.json` and should be reused verbatim for UI labels and logs:
- `Ballygunge`
- `Jadavpur`
- `Rabindra Sarobar`

## 12.9.1.1 Proceed with the additive overlay

Implement the new three-station bridge overlay as a separate layer, with its own toggle and its own rendering path, while leaving the existing bridge polygons untouched.

## 12.9.2 Create a new, separate whitelist config

Define a separate whitelist constant for the three-station overlay so it stays distinct from the existing bridge feature config.

### 12.9.2.1 Create `CLOSEST_TRIO_STATIONS`

Use a new named constant such as `CLOSEST_TRIO_STATIONS` for the trio whitelist, separate from any config used by the existing bridge feature.

### 12.9.2.2 Populate it with the confirmed station IDs

Populate the whitelist with the three confirmed `station_id` values from 12.9.1.2:
- `site_5238`
- `site_5111`
- `site_5126`

## 12.9.3 Generate a new, separate qualifying-pair artifact

Use a new trio-specific qualifying-pair artifact instead of reusing the six-station bridge export.

### 12.9.3.1 Reuse the existing inputs as read-only

Reuse the existing distance-matrix data from Phase 8.2.4 and the existing distance/midpoint filter logic from Phase 12.2.2 as read-only inputs. Do not modify either source artifact.

### 12.9.3.2 Apply the same <=6 km distance rule to these 3 candidates only

Keep the trio artifact limited to the three whitelisted station combinations and gate each candidate with the same inter-station distance threshold used by the main bridge logic.

### 12.9.3.3 Do not broaden the trio set beyond those 3 candidates

Do not let any other station pair slip into the trio artifact, even if it appears in the source distance matrix.

### 12.9.3.4 Write the result to a new, separate file

Write the trio output to its own file, such as /scripts/output/closest_trio_pairs.json, and never overwrite the general bridge feature's qualifying_pairs.json.


### 12.9.3.5 Log how many of the 3 candidates actually qualify

Print a small summary such as Qualified trio pairs: X of 3 so the generator output reflects the real filter result instead of assuming all three pairs pass.


## 12.9.4 Generate a new, separate bridge-polygon artifact

Use a trio-specific bridge-polygon artifact generated from the trio-specific qualifying pairs output instead of reusing the six-station bridge export.

### 12.9.4.1 Reuse the existing lens-intersection logic as a shared, read-only utility function

Filter exact 6 km touch pairs before intersecting and silently drop any unexpected null intersections after the shared `turf.intersect()` call, just like the main bridge polygon pipeline.

### 12.9.4.3 Write the result to a new, separate file

Write the trio public GeoJSON to `/public/data/closest_trio_bridge_polygons.json` and never overwrite the general bridge feature's `/public/data/bridge_polygons.json`.



### 12.9.4.2 Apply the same degenerate-case handling as 12.4.5/12.4.6

Filter exact 6 km touch pairs before intersecting and silently drop any unexpected null intersections after the shared `turf.intersect()` call, just like the main bridge polygon pipeline.




### 12.9.4.4 Validate the output count matches the qualifying count from 12.9.3.5

Fail the trio polygon generator if the exported polygon count does not match the qualifying trio count logged in 12.9.3.5.


## 12.9.5 Build a new, separate rendering layer

### 12.9.5.1 Build a new component, e.g. <ClosestTrioBridgeLayer /> — do not modify or reuse the existing <BridgeLayer />, since that component is wired to the general bridge toggle and its own data file.

Add a dedicated trio bridge layer component and wire it to the trio public GeoJSON file without touching the general bridge layer.


### 12.9.5.4 Reuse the memoized station_id -> color map from Phase 10.6 as a read-only input

Pass the existing memoized station_id -> color map from AqiMap into the trio bridge layer as a read-only prop. Do not duplicate color calculation logic inside the trio component.


### 12.9.5.5 Hard requirement - color is not optional or placeholder

Only render the trio layer when the memoized station_id -> color map already contains real CPCB AQI colors for every station involved in the trio. Capture that color snapshot when the button is clicked, keep the two-tone border convention station-specific, and do not fall back to fixed/default colors.



### 12.9.5.6 Preserve stale fallback color semantics

If a station has no fresh live AQI at click time, keep using the last-known AQI color from the existing fallback path and mark that station half of the trio border as stale with the same dashed, muted treatment used elsewhere in the app. Never substitute a blank, neutral, or hardcoded placeholder color.

## 12.9.6 Replace the single on/off toggle with a per-station multi-select

### 12.9.6.1 Build a checkbox per trio station

Replace the single trio on/off control with three independent checkboxes for Jadavpur, Rabindra Sarobar, and Ballygunge so any combination can be shown at once.

### 12.9.6.3 Default state stays invisible

Start with an empty trio selection set so nothing is ticked and no trio polygon is shown until the user actively checks at least one station.

### 12.9.6.4 One station selected means one circle only

When exactly one trio station is checked, render only that station's 3 km circle using the same precomputed 3 km geometry and current CPCB AQI color, and do not render any bridge polygon until at least two stations are selected.

### 12.9.6.5 Two or more selected stations can show circles and bridges together

When two or more ticked trio stations form a qualifying pair in the precomputed trio list, render the bridge/lens polygon for that pair and keep both stations' 3 km circles visible as well, using the same two-tone border and hard CPCB color rules.

### 12.9.6.6 Non-qualifying pair fallback is silent

If two checked stations do not match any precomputed trio bridge pair, show both circles and skip the bridge polygon without throwing or surfacing an error.

### 12.9.6.7 Immediate feedback, no apply step

Checkbox changes update the trio selection state directly, so the map repaints immediately when a station is ticked or unticked.

## 12.9.7 Reactivity

### 12.9.7.1 Shared color-map updates repaint the trio overlay

When the underlying stations' Live AQI values change, and when Historical mode or the selected date range changes, the trio layer repaints from the shared memoized station color map so the displayed circles and bridge borders stay in sync with the current CPCB colors for that mode.


### 12.9.8.2b Live-computed border color proof

Switch to Historical mode and pick a date where the station category differs from its current Live category, then confirm the corresponding bridge border half repaints to that historical CPCB color. That proves the color is computed from the current shared map at render time, not baked into the static geometry file.

### 12.9.8.3 Multi-selection repaint sanity

Tick two stations, then all three, and confirm the map updates immediately each time with no stale leftover shapes from the prior selection.

## 12.9.9 Documentation

### 12.9.9.1 Keep the two bridge features clearly separate

The existing general bridge overlay is the six-station feature that renders all qualifying pairs across the full station set and uses the shared bridge data files/components. This dedicated trio overlay is a separate feature that always stays limited to Jadavpur, Rabindra Sarobar, and Ballygunge, with its own trio-specific data files and rendering layer. Future changes should keep those two paths distinct so the general bridge exports are never confused with the trio-only artifacts.
