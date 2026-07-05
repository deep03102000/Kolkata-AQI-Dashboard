# Phase 3: Interactive Dashboard UI

This phase turned the React shell into an interactive AQI map experience.

## Completed Items

### 3.1 Map component
Built the `<AqiMap />` component using `react-leaflet` with `MapContainer`, OSM tiles, and a Kolkata-centered view.

### 3.2 Station markers
Added six station markers using the station master JSON coordinates.

### 3.3 Reactive popups
Each marker shows a popup with the station name and the current AQI value from shared context state.

### 3.4 AQI circles
Added a 1 km `Circle` around each station, colored by CPCB AQI category using `getAqiColor(value)`.

### 3.5 Legend
Added a plain Tailwind legend component that stays visible and shows the AQI category colors.

### 3.6 Context-driven selection
Marker clicks update `StationContext.selectedStationId`, which drives the sidebar panel.

### 3.7 Cheap rerenders
The marker and circle overlays are memoized so the map stays stable across context changes.

## Result
The dashboard now combines a station map, color-coded AQI overlays, and context-driven selection, providing the interactive map layer that Phase 4 builds on.