# Bridge Concept

A **bridge** is the area where two stations' 3 km circles overlap: the part of the city that both stations cover.

## The idea

- Each station gets a fixed **3 km circle**, its area of influence.
- Two circles of 3 km overlap only when the stations are **6 km apart or less**. (That is the same as saying the midpoint between them is within 3 km of each.)
- The overlap is a **lens** shape. That lens is the bridge.
- **The closer two stations are, the bigger their bridge.** Ballygunge and Jadavpur are 1.9 km apart and share 17 km², 60% of each circle. Fort William and Rabindra Sarobar are 5.8 km apart and share only 0.16 km².

Of the 15 possible pairs among the six stations, **7 qualify**:

| Pair | Distance | Shared area | Share of each circle |
|---|---|---|---|
| Ballygunge ↔ Jadavpur | 1.91 km | 17.01 km² | 60.2% |
| Jadavpur ↔ Rabindra Sarobar | 2.33 km | 14.67 km² | 51.9% |
| Ballygunge ↔ Rabindra Sarobar | 3.15 km | 10.28 km² | 36.4% |
| Bidhannagar ↔ Rabindra Bharati University | 3.31 km | 9.49 km² | 33.6% |
| Fort William ↔ Rabindra Bharati University | 3.70 km | 7.59 km² | 26.8% |
| Ballygunge ↔ Fort William | 5.54 km | 0.71 km² | 2.5% |
| Fort William ↔ Rabindra Sarobar | 5.83 km | 0.16 km² | 0.6% |

## Why it is useful

- **It shows which stations watch the same ground.** Inside a bridge, both stations' readings are relevant.
- **Comparing the two readings tells you something.** A small AQI gap means the shared area probably has similar air. A large gap means pollution changes sharply between the two sides, so the shared area is a transition zone worth watching.
- **It makes the station network's coverage visible:** where it is dense (big overlaps) and where stations stand alone.

## How it looks and works

- **Border:** each lens is outlined in two colours, split at its two pointed tips. Each half takes the **AQI colour of the station it is nearer to**, so you can see which side belongs to which station. The border is bold (weight 5) and fully opaque, with no fill, so the map underneath stays readable.
- **Colours follow the data:** live AQI in Live mode, the date-range average in Historical mode. A dashed half means that station's reading is stale.
- **Hover a bridge:** it fills lightly in the worse station's colour, both stations' 3 km circles appear as dashed outlines, and a label shows the pair and their distance.
- **Click a bridge:** a popup shows both stations' AQI (marking the worse one), the distance, the shared area, the share of each circle, the AQI gap and a one-line interpretation.
- **Select a station:** its bridges stay bold, and the others fade.
- **Bridge list:** turning on "Station-pair bridges" in the sidebar lists all 7 pairs, closest first, with both AQI values, the distance, the shared area and the gap. Picking one zooms the map to it and opens its popup.

## How it is built

- **At build time (Turf):**
  - `npm run bridge:circles` makes the 3 km circles (`public/data/circles_3km.json`).
  - `npm run bridge:pairs` selects the pairs within 6 km.
  - `npm run bridge:polygons` intersects each pair's circles into lens polygons (`public/data/bridge_polygons.json`).
  - Station locations don't move, so this only needs re-running if coordinates change.
- **In the browser (no Turf):**
  - `src/utils/bridges.ts` adds exact maths: distance, lens area A = 2r²·acos(d/2r) − (d/2)·√(4r² − d²), and splitting the outline at its tips. The area matches Turf's within 0.3%.
  - `src/hooks/useBridgePairs.ts` loads the lenses once for the map and the sidebar.
  - `src/components/BridgeLayer.tsx` draws and handles the map interactions.
  - `StationSidebar` shows the bridge list.

## Two bridge features

The project has two bridge features, kept independent:

- **Station-pair bridges** (this page): all 7 qualifying pairs among the six stations, switched on in Map layers.
- **Three-station bridges:** only Jadavpur, Rabindra Sarobar and Ballygunge, driven by their own checkboxes, with their own roads layer.

## Short summary

A bridge is the shared area where two nearby stations' 3 km circles overlap. Its two-coloured border shows each station's AQI, and clicking it compares the two stations to show whether the air across that shared area is likely uniform or changing.
