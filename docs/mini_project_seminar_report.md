# Kolkata AQI Dashboard
Mini Project Seminar Report

Prepared by: [Your Name]
Roll No.: [Your Roll No.]
Department: [Department Name]
College/Institute: [College Name]
Guide: [Guide Name]
Date: August 2026

## Abstract

Air quality monitoring has become an important public-health and urban-planning concern for large Indian cities, and Kolkata is no exception. This mini project presents a web-based Kolkata AQI Dashboard that combines cleaned station data, static geometry exports, interactive mapping, and live AQI from the Central Pollution Control Board (CPCB) into a single lightweight application. The system was designed to be easy to run, easy to inspect, and suitable for both demonstration and analysis. Instead of depending on a heavy backend, most of the data is prepared ahead of time and consumed directly by the frontend.

The dashboard brings together six monitored Kolkata stations and displays them through a Leaflet map with coverage and road overlays, a station panel with live AQI, temperature and humidity, a pollutant chart, and a comparison table that ranks all six stations either live or as averages over any chosen date range. In addition to the general six-station views, the project adds a dedicated trio workflow for Jadavpur, Rabindra Sarobar, and Ballygunge, including a trio selector, trio bridge polygons, and trio-colored road segments. These additional layers are kept separate from the existing general bridge and road features so that the overall architecture remains understandable and maintainable.

The project also supports Live and Historical modes. Live readings come from CPCB's official real-time station feed on data.gov.in, with the World Air Quality Index (WAQI) project as a fallback, while historical analysis is handled from static station files. Stale fallback handling ensures that the user can still see the last known live AQI when a fresh reading is not available. The result is a compact, responsive, and semantically clear dashboard that demonstrates data preparation, spatial analysis, and frontend state management in one coherent system.

Keywords: AQI, Kolkata, CPCB, React, Leaflet, WAQI, Voronoi, road overlays, static data, live monitoring

## 1. Introduction and Objectives

Urban air quality affects daily life, long-term health, mobility, and policy decisions. In a city such as Kolkata, the ability to visually compare pollution levels across multiple stations is more useful than looking at isolated numeric reports. A map-based interface can show where a station is located, how it relates to its neighbors, and how the air-quality trend changes over time. This project was developed to provide that kind of integrated view in a way that remains lightweight and practical for a seminar-grade implementation.

The Kolkata AQI Dashboard starts from raw station workbooks and converts them into a frontend-friendly structure. Historical records are cleaned and standardized, station names are aligned, and stable station identifiers are added. Once the data is prepared, the application can load compact JSON files directly and render them without requiring a database or a dedicated backend service for the historical path. This design choice keeps the system easy to reproduce and easy to explain in a classroom or seminar setting.

The specific objectives were as follows:
- clean and standardize the historical station datasets
- create stable station identifiers and geospatial coordinates
- generate Voronoi coverage and road assignment artifacts at build time
- render AQI circles, coverage cells, and road overlays in the browser
- show live AQI from the official CPCB station readings without exposing API keys in the frontend bundle
- preserve stale live data when a fresh reading is temporarily unavailable
- introduce a dedicated trio workflow for Jadavpur, Rabindra Sarobar, and Ballygunge
- keep the trio features separate from the general six-station bridge and road features
- compare all stations over any historical date range
- show current temperature and humidity next to each station's live AQI
- keep the interface simple on phones and light to load

These objectives make the project suitable both as a technical demonstration and as a practical example of frontend-driven environmental visualization.

## 2. Technology Stack and System Overview

The project uses a modern React and Vite frontend, supported by TypeScript and Tailwind CSS. React is a natural fit because the dashboard is built from multiple independent but coordinated UI modules. Vite keeps the development loop fast and the production bundle compact. TypeScript improves clarity in data handling, which is especially useful when working with GeoJSON, station summaries, and live AQI payloads. Tailwind CSS makes it possible to implement consistent spacing, alignment, and responsive behavior without writing a large custom stylesheet.

Leaflet and react-leaflet are used for the mapping layer. They provide the map tiles, markers, GeoJSON rendering, and pane control needed for coverage, roads, and bridge overlays. Chart.js and react-chartjs-2 handle the historical time-series visualization. Live data is fetched by small server routes (`/api/cpcb` for CPCB and `/api/waqi` for WAQI) that hold the API keys, so the browser never sees credentials. Application hooks then adapt the readings into the summary format used by the rest of the interface.

The overall system has two major halves. The data-preparation side converts raw files into static assets such as station JSON, coverage GeoJSON, roads, and trio overlay files. The frontend side loads those assets on demand, combines them with live or historical state, and renders the dashboard. This separation is one of the main strengths of the project: it keeps the interface dynamic while keeping the heavy spatial processing out of the runtime application bundle.

## 3. Data Preparation Pipeline

The data pipeline is responsible for turning raw station workbooks into a stable, usable dataset. The original station records are cleaned, standardized, and aligned to a common schema. Station names are merged into a master table, and each station receives a stable identifier so that later phases can refer to the same station consistently. This step is essential because the frontend, the geometry scripts, and the live-data mapping all depend on the same station identity.

After cleaning and identification, the geospatial stage begins. The stations are geocoded so that each one has latitude and longitude coordinates. Those coordinates are then used to build spatial artifacts such as pairwise distances, midpoint checks, Voronoi coverage cells, and road assignment structures. Importantly, these are build-time steps, not browser-time steps. That means the runtime dashboard can stay responsive and simple because the expensive calculations have already been completed.

The final exports are written as static files under the frontend public directory. These include station payloads, coverage files, road files, and trio-specific overlays. The app can load them directly when needed. This is a practical design because it makes the system deterministic and easy to demo in a seminar environment. It also means that the data model remains inspectable, since each phase produces a named artifact that can be validated or reviewed independently.

## 4. Spatial Analysis and Static Map Layers

A major part of the project is the spatial analysis pipeline. One of the most useful design decisions was to compute the coverage and road geometry ahead of time instead of trying to derive it live in the browser. The system first computes pairwise distances and midpoint logic for the stations. It then builds Voronoi coverage cells, which provide a simple way to approximate each station's area of influence. These cells are clipped to the city boundary, validated, and exported for rendering.

Road data is handled in a similar way. Road ways are acquired, simplified, split at coverage boundaries, and then joined back to station identifiers. This gives the map a station-colored road layer that can be displayed alongside AQI circles. Because the roads are preprocessed, the browser only needs to load and style them rather than recompute them. That keeps the user interface smooth and also makes the project easier to explain as a static-first system.

The trio overlay uses the same philosophy but is narrowed to the Jadavpur, Rabindra Sarobar, and Ballygunge subset. Separate trio bridge polygons and trio road overlays are generated and exported to their own files. This prevents confusion between the general six-station bridge feature and the dedicated trio feature. It also allows the system to show bridge polygons only for the trio stations while leaving the rest of the map behavior unchanged.

## 5. Frontend Architecture and State Management

The frontend is organized around a shared station context and a set of focused components. The context stores the selected station, live or historical mode, coverage mode, date range, and trio station selection set. This keeps the map, sidebar, chart panel, and comparison table synchronized. A single change in station state can therefore update multiple UI areas without manual coordination.

The `AqiMap` component is the center of the visual experience. It renders the base map, station markers, AQI circles, coverage overlays, road layers, bridge layers, and popups. To keep performance manageable, the larger layers are lazy-loaded. This means the app does not pay the cost of loading every overlay at startup. The map also reuses a memoized station-color map so that circle and overlay colors remain consistent in Live and Historical modes.

The main controls sit in a control bar that stays at the top of the screen: the Live/Historical toggle, a station picker, the date range and quick presets such as "Last 30 days". The sidebar lists every station with a colour-coded AQI chip, shows the selected station's details, and groups the map layers: coverage mode, overlay toggles and the dedicated trio selector. The trio selector is independent from the core coverage toggle, which makes the feature easier to reason about. Each trio station has its own checkbox and a small color swatch based on the current CPCB AQI category. That gives the user an immediate visual link between the checkbox and the map overlay that will appear.

The interface was deliberately kept minimal. Every panel uses the same flat card style. The live card shows one large AQI number with its category colour and a small 0–500 scale. Each comparison-table row is reduced to the AQI, a coloured bar and a short source line, with fuller details in a tooltip. Gentle animations, all in plain CSS, make changes easy to follow: sections fade in, numbers count up to new values, and the Live/Historical toggle slides. All of these switch off automatically for users who have asked their device to reduce motion.

Load size was treated as a feature too. An early version downloaded every station's full two-year history, about 8 MB each, on every visit just in case a live pollutant value was missing, and it also loaded the full road network while roads were hidden. Loading those only when they are actually needed cut the first page load from about 70 MB to 7 MB in development mode.

## 6. Trio Overlay and Road Highlighting

One of the most distinctive additions in the later phases is the trio-specific overlay workflow. The trio bridge layer is separate from the general bridge layer and is dedicated only to Jadavpur, Rabindra Sarobar, and Ballygunge. The trio road layer is also separate and highlights only the road segments associated with the selected trio stations. Both layers are driven by the same selected trio station set, but they are rendered independently so that their rules remain clear.

The trio selection behavior is designed to be intuitive. When a single station is checked, the dashboard shows only that station's circle and its roads. No bridge polygon appears because a bridge needs two stations. When two stations are checked and they form a qualifying trio pair, the map shows both circles, the bridge polygon, and the station-colored roads for both stations. When all three stations are checked, the map shows all three circles, all qualifying bridge polygons among the trio, and all three road groups together.

This overlay design is also visually careful. The map uses separate Leaflet panes for roads and bridges, which helps prevent z-ordering conflicts. The trio road and bridge layers are mounted in a way that keeps the display readable even when multiple shapes overlap. This is important for a seminar project because it demonstrates not only spatial processing, but also thoughtful map composition and rendering control.

## 7. Live Data, Reactivity, and Stale Behavior

Live AQI comes first from CPCB's official real-time feed, published on the Open Government Data portal (data.gov.in). CPCB calculates each station's AQI every hour and publishes it about 30 to 40 minutes after the hour, so the dashboard shows when the next reading is expected. The feed reports a sub-index for each pollutant, and the station's AQI is the highest of these, following CPCB's method. A server route fetches the feed with the project's API key and caches it for five minutes, so every station shares one request.

The live path is designed to keep working when a source fails. If a station's CPCB reading is more than six hours old, the dashboard falls back to WAQI's copy of the station, and then to the nearest live WAQI sensor within 5 km. Every card and table row names the source it is showing. Building this layer surfaced two real data-quality problems. WAQI's copies of all six stations had stopped updating on 23 June 2026, and its coordinate-based lookup returned readings from Lhasa and Shanghai for Kolkata coordinates. The dashboard therefore no longer uses that lookup, and it checks how recent every reading is before showing it.

Current temperature and humidity are shown alongside the live AQI. CPCB's open feed carries no weather fields, and the stations' own weather sensors are not available through any public API. The dashboard therefore uses Open-Meteo, a free weather service, which gives 15-minute model estimates for each station's exact coordinates. The interface labels these as location estimates rather than station measurements, so users are not misled about their origin.

A key aspect of the live implementation is stale-data handling. If a live request temporarily fails or returns no fresh value, the project keeps the last known reading visible and marks it clearly as stale. This is preferable to hiding the station or showing a blank state. The same shared freshness logic also carries into coverage, roads, and trio overlays. As a result, the entire UI keeps a consistent visual language for data freshness.

The trio overlays and roads are reactive as well. When the selected stations change, the map updates immediately. When the AQI mode changes from Live to Historical, or the date range changes, the overlay colors update from the shared color map. This demonstrates good state management practice because the user always sees a map that corresponds to the currently selected data mode rather than a stale snapshot.

## 8. Testing, Validation, and Results

The project was validated by checking both the build output and the intended interaction rules. On the data side, the geometry artifacts were generated as separate static files and the trio outputs were kept distinct from the general bridge outputs. On the frontend side, the application was built successfully after the trio overlay and selector features were added, confirming that the code path remained stable.

The interaction checks are also important. With nothing selected in the trio feature, the map returns to a clean state. With one station selected, only that station's circle and roads appear. With two stations selected, the relevant bridge polygon and both road groups appear together. With all three selected, the trio layers can coexist without obvious visual conflict. These behaviors confirm that the application is following its intended selection logic.

The more general regression requirement is equally important. When the trio selector is left untouched, the original map layers, popups, chart panel, comparison table, and coverage controls continue to behave as before. That matters because it shows the trio feature is additive rather than disruptive. In a seminar context, this is a strong example of non-regression design: new features are layered in without breaking the established user experience.

The final result is a compact AQI dashboard that combines static preprocessing, spatial analysis, and interactive visualization in a single project. The map can show a station's circle, its coverage area, its road network, and in the special trio mode, its bridge and road relationships with neighboring stations. The dashboard also provides historical analysis through the chart panel and comparison table, and it shows live AQI from the official CPCB station readings, with clearly labelled fallbacks. In Historical mode the comparison table, sidebar and map popups switch to the average AQI for the selected date range; for example, Ballygunge averaged 194 (Moderate) across November 2024, from 2,880 readings. In Live mode, the official CPCB readings on 7 November 2026 ranged from 122 at Rabindra Bharati University to 233 (Poor) at Jadavpur, with temperatures around 29°C and humidity near 54%.

From a software engineering perspective, the project shows the value of separating build-time data generation from runtime rendering. The geometry scripts can be complex without making the browser application complex. Likewise, the frontend can remain easy to use without sacrificing spatial detail. The trio work adds a focused special case that demonstrates how to extend the system while preserving clarity.

From a user-experience perspective, the biggest advantage is immediacy. The sidebar controls are directly tied to the map, and the trio selector provides a clear link between checkboxes and colors. This makes the dashboard practical for explanation in a seminar and also demonstrates a thoughtful UI design approach. The project therefore succeeds both as a technical artifact and as a presentable mini project.

## 9. Conclusion and Future Scope

The Kolkata AQI Dashboard demonstrates how environmental data, spatial processing, and interactive frontend design can be combined into a single lightweight application. The project starts with raw AQI datasets, converts them into structured static assets, and presents them through a responsive map-based interface. It supports both live and historical analysis, adds coverage and road layers, and extends the map with a dedicated trio overlay for a smaller station subset. The result is a coherent system that is easy to run, easy to inspect, and useful for seminar presentation.

There are several clear directions for future work. The road assignment could be refined to match bridge and circle boundaries more precisely. Additional stations or regions could be introduced by extending the same pipeline. A more advanced analytics layer could compare daily, weekly, or seasonal trends. Live updates could become more frequent, and the weather values could come from the stations' own sensors, if CPCB or the West Bengal Pollution Control Board grants access to their 15-minute station data, which has no public API today. The seventh Kolkata station in CPCB's feed, Victoria, could also be added. The UI could also offer export options for reports and screenshots. If needed, a formal backend could be added later, but the current static-first design already provides a solid foundation.

In summary, the project delivers a practical and well-structured AQI dashboard that demonstrates data cleaning, spatial computation, map rendering, and frontend state management in one integrated workflow.

## References

- Kolkata AQI Dashboard README and project documentation
- Phase notes in the `docs/` folder
- Public static data files in `aqi-dashboard/public/data/`
- Frontend source components in `aqi-dashboard/src/components/`
- Central Pollution Control Board, "Real time Air Quality Index from various locations", Open Government Data Platform India (data.gov.in)
- World Air Quality Index Project, api.waqi.info
- Open-Meteo weather API, open-meteo.com (CC BY 4.0)
- Live-data helpers in `aqi-dashboard/shared/`, `aqi-dashboard/src/hooks/` and `aqi-dashboard/src/utils/`

