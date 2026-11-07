# Phase 12.10 - Color the Roads Inside the Ticked Trio Region

Phase 12.10 adds a trio-only road highlight layer that reuses the already-exported `public/data/kolkata_roads.json` file and filters it by the selected trio station IDs. It does not rerun the road join or rebuild any geometry.

The new layer is separate from the existing general road overlay: the general `RoadLayer` still renders all roads for the full map, while the trio road layer only appears when the Jadavpur, Rabindra Sarobar, or Ballygunge checkboxes are selected.

The trio road strokes reuse the shared station color map from `AqiMap.tsx`, so Live and Historical color changes stay in sync with the selected station state.
Known approximation: each road segment's `station_id` comes from the Phase 9.4 join against Voronoi cell boundaries, not from the 3 km circle or bridge-polygon boundaries used in this feature. That means a road just outside a ticked station's 3 km circle, but still inside its Voronoi cell, may still show up here as belonging to that station. This is intentional and useful, but it is an approximation rather than a pixel-exact match to the visible circle or polygon edge.

