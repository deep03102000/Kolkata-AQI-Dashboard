/**
 * Station-pair bridges (Phase 12): each station has a fixed 3 km circle, and when
 * two stations are ≤ 6 km apart their circles overlap. That lens-shaped overlap
 * is the "bridge": the area both stations cover. The lens polygons themselves are
 * precomputed at build time (public/data/bridge_polygons.json, via turf.intersect);
 * this module only adds cheap, exact maths for display. No Turf ships to the client.
 */

export const BRIDGE_RADIUS_KM = 3
export const BRIDGE_MAX_DISTANCE_KM = BRIDGE_RADIUS_KM * 2

/** [longitude, latitude], as in GeoJSON. */
export type LonLat = [number, number]

export function haversineKm([lon1, lat1]: LonLat, [lon2, lat2]: LonLat) {
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLon = (lon2 - lon1) * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Exact area of the lens where two circles of radius r overlap, for centres d apart:
 * A = 2r²·acos(d / 2r) − (d / 2)·√(4r² − d²). Zero when d ≥ 2r.
 */
export function lensAreaKm2(distanceKm: number, radiusKm = BRIDGE_RADIUS_KM) {
  if (distanceKm >= 2 * radiusKm) {
    return 0
  }
  const r = radiusKm
  const d = Math.max(0, distanceKm)
  return 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d)
}

/** Share of one 3 km circle that lies inside the bridge (0–1). */
export function lensShareOfCircle(distanceKm: number, radiusKm = BRIDGE_RADIUS_KM) {
  return lensAreaKm2(distanceKm, radiusKm) / (Math.PI * radiusKm * radiusKm)
}

/**
 * Splits a lens outline at its two tips into the half nearer station A and the
 * half nearer station B (spec 12.1.4: each half takes the nearer station's colour).
 *
 * The lens boundary is two circular arcs that meet at the tips. Every vertex is
 * assigned to whichever station it is closer to; the ring is rotated so each half
 * is one continuous line, and the tip vertices are shared so the halves join.
 * Returns [latitude, longitude] pairs ready for Leaflet.
 */
export function splitLensAtTips(ring: LonLat[], stationA: LonLat, stationB: LonLat) {
  // Drop the closing vertex (GeoJSON rings repeat the first point at the end).
  const points =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring.slice()

  const nearA = points.map((point) => haversineKm(point, stationA) <= haversineKm(point, stationB))

  // Rotate so the walk starts at the first A-vertex that follows a B-vertex; then
  // the A-half is one contiguous run and the B-half is the rest.
  let start = nearA.findIndex((isA, index) => isA && !nearA[(index - 1 + nearA.length) % nearA.length])
  if (start < 0) {
    start = 0
  }
  const rotated = [...points.slice(start), ...points.slice(0, start)]
  const rotatedNearA = [...nearA.slice(start), ...nearA.slice(0, start)]
  const splitAt = rotatedNearA.findIndex((isA) => !isA)
  const cut = splitAt < 0 ? rotated.length : splitAt

  const toLatLng = ([lon, lat]: LonLat): [number, number] => [lat, lon]
  const halfA = rotated.slice(0, cut)
  const halfB = rotated.slice(cut)

  // Share the tip vertices so the two coloured halves meet without gaps.
  const firstA = halfA[0]
  const lastA = halfA[halfA.length - 1]
  return {
    nearA: [...halfA, ...(halfB.length > 0 ? [halfB[0]] : [])].map(toLatLng),
    nearB: [...(lastA ? [lastA] : []), ...halfB, ...(firstA ? [firstA] : [])].map(toLatLng),
  }
}

export type BridgePair = {
  key: string
  stationIdA: string
  stationIdB: string
  stationNameA: string
  stationNameB: string
  coordsA: LonLat
  coordsB: LonLat
  distanceKm: number
  overlapKm2: number
  /** Share of each 3 km circle covered by the bridge, 0–1. */
  overlapShare: number
  /** Outer ring of the precomputed lens polygon. */
  ring: LonLat[]
  /** [[south, west], [north, east]] for fitting the map. */
  bounds: [[number, number], [number, number]]
}

type BridgeFeature = {
  properties?: { pair_key?: string; station_id_a?: string; station_id_b?: string }
  geometry?: { type?: string; coordinates?: LonLat[][] }
}

type StationRef = { station_id: string; station_name: string; latitude: number; longitude: number }

/** Joins the precomputed lens polygons to station names and coordinates. */
export function buildBridgePairs(features: BridgeFeature[], stations: StationRef[]): BridgePair[] {
  const byId = new Map(stations.map((station) => [station.station_id, station]))
  const pairs: BridgePair[] = []

  for (const feature of features) {
    const a = byId.get(feature.properties?.station_id_a ?? '')
    const b = byId.get(feature.properties?.station_id_b ?? '')
    const ring = feature.geometry?.type === 'Polygon' ? feature.geometry.coordinates?.[0] : undefined
    if (!a || !b || !ring || ring.length < 3) {
      continue
    }

    const coordsA: LonLat = [a.longitude, a.latitude]
    const coordsB: LonLat = [b.longitude, b.latitude]
    const distanceKm = haversineKm(coordsA, coordsB)
    const lats = ring.map(([, lat]) => lat)
    const lons = ring.map(([lon]) => lon)

    pairs.push({
      key: feature.properties?.pair_key ?? `${a.station_id}__${b.station_id}`,
      stationIdA: a.station_id,
      stationIdB: b.station_id,
      stationNameA: a.station_name,
      stationNameB: b.station_name,
      coordsA,
      coordsB,
      distanceKm,
      overlapKm2: lensAreaKm2(distanceKm),
      overlapShare: lensShareOfCircle(distanceKm),
      ring,
      bounds: [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ],
    })
  }

  return pairs.sort((left, right) => left.distanceKm - right.distanceKm)
}
