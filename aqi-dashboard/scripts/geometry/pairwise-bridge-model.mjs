export const bridgePairDistanceThresholdKm = 6
export const bridgePairMidpointThresholdKm = 3
export const bridgePairGeometryRule = 'inter_station_distance_le_6_km_equiv_midpoint_le_3_km_each'
// Phase 12 currently uses the overlap lens shape; a straight corridor would require a different generator entirely.
export const bridgeGeometryShape = 'circle_overlap_lens'
// Phase 12 border colors should follow the more severe station AQI color when the pair spans mixed categories.
export const bridgeBorderColorConvention = 'use_higher_severity_station_aqi_color'
// Recommended default for the lens border is a two-tone split, with each side following the nearer station's CPCB color. This is a product decision, not just styling, because the split preserves both stations' influence in the final shape.
export const bridgeBorderStyleConvention = 'two_tone_split_at_lens_tips'
// Phase 12 keeps the lens border-only by default; blended fill would hide provenance and make the overlap read like a single averaged AQI patch, and it reads especially poorly when CPCB colors sit far apart on the scale.
export const bridgeFillConvention = 'border_only_no_fill'
// Visibility is a hard requirement: use a border weight in the 4-5 range so the split remains legible at normal zoom.
export const bridgeBorderWeightConvention = 'weight_4_to_5'
// Visibility is a hard requirement: keep the border fully opaque so it doesn't vanish against varying basemap features.
export const bridgeBorderOpacityConvention = 1
// Visibility is a hard requirement: use a circle fillOpacity in the 0.55-0.65 range so CPCB categories are legible without the legend. If lighter categories still disappear against OSM parks, water, or roads, tune visibility iteratively and re-test on the live map tiles, not a blank canvas.
// Phase 12 bridge selection reuses the Phase 8 distance report instead of recomputing pair distances.
export const bridgeCircleFillOpacityConvention = 'fill_opacity_0_55_to_0_65'

export function qualifiesBridgePair(distanceKm) {
  return Number.isFinite(distanceKm) && distanceKm <= bridgePairDistanceThresholdKm
}

export function midpointDistanceFromEachStationKm(distanceKm) {
  return Number.isFinite(distanceKm) ? Number((distanceKm / 2).toFixed(3)) : null
}

export function bridgePairMeetsGeometryModel(distanceKm) {
  const midpointDistanceKm = midpointDistanceFromEachStationKm(distanceKm)

  return (
    qualifiesBridgePair(distanceKm) &&
    midpointDistanceKm !== null &&
    midpointDistanceKm <= bridgePairMidpointThresholdKm
  )
}