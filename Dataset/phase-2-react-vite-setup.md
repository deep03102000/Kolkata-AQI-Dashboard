# Phase 2: React + Vite Project Setup

This phase created the frontend foundation for the Kolkata AQI dashboard.

## Completed Items

### 2.1 Scaffold project
A new Vite React application was created in `aqi-dashboard/`.

### 2.2 Tailwind setup
Tailwind CSS and PostCSS were installed and configured for the project.

### 2.3 Essential dependencies
Only the core UI dependencies were added:
- `react-leaflet`
- `leaflet`
- `chart.js`
- `react-chartjs-2`

### 2.4 Folder structure
The app now includes:
- `src/components`
- `src/hooks`
- `src/context`
- `src/utils`
- `public/data`

### 2.5 StationContext
A shared React context was added to store:
- selected station
- mode (`Live` / `Historical`)
- selected date range

### 2.6 Chunk splitting
Vite build configuration was updated so Leaflet and chart code load only when their components are needed.

## Result
The app now has a clean, lightweight foundation for the interactive map and chart views used in Phase 3.