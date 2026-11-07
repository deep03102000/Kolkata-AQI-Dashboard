# Phase 12.11 - Trio Selector Interaction Notes

This note records the expected trio overlay behavior so future changes do not conflate the road layer with the bridge layer.

## 12.11.4.1 Single-station selection

When exactly one trio station is checked:
- that station's 3 km circle appears
- that station's roads appear, colored from the current shared AQI color map
- no bridge polygon appears, because a bridge requires two selected stations

## 12.11.4.2 Two-station selection

When two trio stations are checked and they form a qualifying trio pair:
- both 3 km circles appear
- the connecting bridge polygon appears
- both stations' roads appear, each colored from that station's current AQI color

## 12.11.4.3 Three-station selection

When all three trio stations are checked:
- all three 3 km circles appear
- all qualifying trio bridge polygons among the selected stations appear
- all three stations' roads appear
- the road and bridge layers do not visually conflict because they render in separate Leaflet panes, with roads mounted before the trio bridge layer in `AqiMap.tsx`

## 12.11.4.4 Untick all three

When all trio stations are unchecked:
- the map returns to a clean state
- no trio circles remain
- no trio roads remain
- no trio bridge polygons remain
- the feature is fully hidden until the user selects a station again

## 12.11.4.5 Final regression check

With nothing from this feature ticked, re-run the 12.9.8.1 regression check at the end and confirm the original app still behaves exactly as it did before Phase 12.9 through 12.11 existed:
- Circles
- Voronoi
- general Bridges
- popups
- chart panel
- no trio overlay artifacts visible
## Reminder

The trio road layer is independent from the trio bridge layer. A single checked station still shows its roads, while the bridge layer stays hidden until a qualifying pair is selected.

