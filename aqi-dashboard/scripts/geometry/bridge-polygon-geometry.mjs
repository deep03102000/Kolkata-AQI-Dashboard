import { intersect } from '@turf/turf'

export function isDegenerateTouchPair(pair) {
  const distanceKm = Number(pair?.distance_km)

  return Number.isFinite(distanceKm) && Math.abs(distanceKm - 6) <= 1e-9
}

export function computeBridgeLensPolygon(pair) {
  return intersect(
    {
      type: 'FeatureCollection',
      features: [pair.from_station_circle, pair.to_station_circle],
    },
    {
      properties: {
        pair_key: pair.pair_key,
        from_station_id: pair.from_station_id,
        to_station_id: pair.to_station_id,
        station_id_a: pair.from_station_id,
        station_id_b: pair.to_station_id,
        bridge_polygon_source: 'turf.intersect',
        bridge_polygon_status: 'computed_lens_polygon',
      },
    },
  )
}
