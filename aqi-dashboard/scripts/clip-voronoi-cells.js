#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  booleanPointInPolygon,
  cleanCoords,
  featureCollection,
  intersect,
  kinks,
  point,
} from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const defaultRawVoronoiPath = join(__dirname, 'output', 'voronoi_cells_featurecollection.json')
const defaultPointsPath = join(__dirname, 'output', 'voronoi_points.json')
const defaultBoundaryPath = join(__dirname, 'output', 'kolkata_boundary.geojson')
const defaultBoundarySourcePath = join(__dirname, 'output', 'kolkata_boundary_source.json')
const defaultClippedOutputPath = join(__dirname, 'output', 'voronoi_cells_clipped_featurecollection.json')
const defaultPublicOutputPath = join(projectRoot, 'public', 'data', 'voronoi_cells.json')
const overpassUrl = 'https://overpass-api.de/api/interpreter'
const nominatimLookupUrl = 'https://nominatim.openstreetmap.org/lookup'
const fallbackGeoBoundariesUrl =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM2/geoBoundaries-IND-ADM2.geojson?download=1'

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      'user-agent': 'kolkata-aqi-dashboard/1.0 (+https://github.com/)',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`)
  }

  return response.json()
}

function normalizeFeature(candidate, metadata = {}) {
  if (!candidate) {
    return null
  }

  if (candidate.type === 'Feature') {
    return {
      ...candidate,
      properties: {
        ...(candidate.properties || {}),
        ...metadata,
      },
    }
  }

  if (candidate.type === 'Polygon' || candidate.type === 'MultiPolygon') {
    return {
      type: 'Feature',
      properties: { ...metadata },
      geometry: candidate,
    }
  }

  return null
}

function closeLinearRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) {
    return ring
  }

  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring
  }

  return [...ring, [first[0], first[1]]]
}

function normalizeBoundaryGeometry(feature) {
  if (!feature?.geometry) {
    return null
  }

  if (feature.geometry.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map(closeLinearRing),
      },
    }
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((polygon) => polygon.map(closeLinearRing)),
      },
    }
  }

  return null
}

function validateBoundaryFeature(feature, sourceLabel) {
  const normalized = normalizeBoundaryGeometry(feature)

  if (!normalized) {
    throw new Error(`Boundary source ${sourceLabel} did not provide a Polygon or MultiPolygon geometry`)
  }

  const cleaned = cleanCoords(normalized)
  const kinked = kinks(cleaned)
  if (kinked.features.length > 0) {
    throw new Error(`Boundary source ${sourceLabel} has self-intersections`)
  }

  return cleaned
}
function scoreBoundaryProperties(properties = {}) {

  const values = Object.entries(properties).map(([key, value]) => `${key}:${String(value).toLowerCase()}`)
  const name = String(properties.name || properties.NAME_2 || properties.shapeName || '').toLowerCase()
  let score = 0

  if (name === 'kolkata district') {
    score += 1000
  }

  if (name === 'kolkata') {
    score += 800
  }

  if (name.includes('kolkata')) {
    score += 500
  }

  if (String(properties.admin_level || '').trim() === '6') {
    score += 100
  }

  if (String(properties.boundary || '').toLowerCase() === 'administrative') {
    score += 50
  }

  if (values.some((entry) => entry.includes('district'))) {
    score += 25
  }

  return score
}

function scoreGeoBoundaryFeature(feature) {
  return scoreBoundaryProperties(feature?.properties || {})
}

async function resolveOverpassBoundary() {
  const query = `
[out:json][timeout:60];
(
  relation["boundary"="administrative"]["admin_level"="6"]["name"="Kolkata district"];
  relation["boundary"="administrative"]["admin_level"="6"]["name"="Kolkata"];
  relation["boundary"="administrative"]["admin_level"="6"]["name"~"Kolkata",i];
);
out tags ids;
`

  const payload = new URLSearchParams({ data: query })
  const overpassResponse = await fetchJson(overpassUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: payload,
  })

  const relations = Array.isArray(overpassResponse?.elements)
    ? overpassResponse.elements.filter((element) => element?.type === 'relation')
    : []

  if (relations.length === 0) {
    return null
  }

  const selected = relations
    .map((relation) => ({ relation, score: scoreBoundaryProperties(relation.tags || {}) }))
    .sort((left, right) => right.score - left.score)[0]?.relation

  if (!selected?.id) {
    return null
  }

  const nominatimUrl = `${nominatimLookupUrl}?osm_ids=R${selected.id}&format=jsonv2&polygon_geojson=1&addressdetails=0&namedetails=1`
  const lookupResults = await fetchJson(nominatimUrl, {
    headers: {
      accept: 'application/json',
      referer: 'https://nominatim.openstreetmap.org/',
    },
  })

  const boundaryResult = Array.isArray(lookupResults) ? lookupResults[0] : null
  if (!boundaryResult?.geojson) {
    return null
  }

  const feature = normalizeFeature(boundaryResult.geojson, {
    source_kind: 'osm-overpass',
    osm_relation_id: selected.id,
    osm_relation_name: selected.tags?.name || null,
    source_url: nominatimUrl,
  })

  return validateBoundaryFeature(feature, `OSM relation ${selected.id}`)
}

async function resolveGeoBoundariesFallback() {
  const fallbackData = await fetchJson(fallbackGeoBoundariesUrl)
  const features = Array.isArray(fallbackData?.features) ? fallbackData.features : []

  if (features.length === 0) {
    return null
  }

  const selected = features
    .map((feature) => ({ feature, score: scoreGeoBoundaryFeature(feature) }))
    .sort((left, right) => right.score - left.score)[0]?.feature

  if (!selected?.geometry) {
    return null
  }

  return validateBoundaryFeature({
    type: 'Feature',
    properties: {
      source_kind: 'geoBoundaries-fallback',
      source_url: fallbackGeoBoundariesUrl,
      boundary_name:
        selected.properties?.shapeName || selected.properties?.name || selected.properties?.NAME_2 || 'Kolkata',
    },
    geometry: selected.geometry,
  }, 'geoBoundaries fallback')
}

function loadStationPoints(pointsPath) {

  const payload = loadJson(pointsPath)
  if (!Array.isArray(payload?.points)) {
    throw new Error(`Expected points array in ${pointsPath}`)
  }

  return payload.points.map((entry) => {
    if (!entry?.station_id || !Array.isArray(entry.point) || entry.point.length !== 2) {
      throw new Error(`Invalid station point entry in ${pointsPath}`)
    }

    return {
      station_id: entry.station_id,
      station_name: entry.station_name,
      longitude: entry.point[0],
      latitude: entry.point[1],
    }
  })
}

function buildStationPointIndex(stations) {
  return new Map(
    stations.map((station) => [
      station.station_id,
      point([station.longitude, station.latitude], { station_id: station.station_id }),
    ]),
  )
}

function boundaryCoversStations(boundaryFeature, stations) {
  const inside = stations.filter((station) => {
    const stationPoint = point([station.longitude, station.latitude], { station_id: station.station_id })
    return booleanPointInPolygon(stationPoint, boundaryFeature)
  })

  return {
    station_count: stations.length,
    inside_count: inside.length,
    outside_station_ids: stations
      .filter((station) => !inside.some((match) => match.station_id === station.station_id))
      .map((station) => station.station_id),
    complete: inside.length === stations.length,
  }
}

function clipVoronoiFeature(feature, boundaryFeature, stationPoint) {
  const clipped = intersect(featureCollection([cleanCoords(feature), boundaryFeature]))

  if (!clipped) {
    const stationId = feature?.properties?.station_id || 'unknown-station'
    throw new Error(`Voronoi cell ${stationId} did not intersect the Kolkata boundary`)
  }

  const clippedGeometry = cleanCoords(clipped)
  if (!clippedGeometry?.geometry) {
    const stationId = feature?.properties?.station_id || 'unknown-station'
    throw new Error(`Voronoi cell ${stationId} clipped to an empty geometry`)
  }

  if (!stationPoint || !booleanPointInPolygon(stationPoint, clippedGeometry)) {
    const stationId = feature?.properties?.station_id || 'unknown-station'
    throw new Error(`Voronoi cell ${stationId} clipped outside its own station point`)
  }

  return {
    ...clippedGeometry,
    properties: {
      ...(feature.properties || {}),
      clipped_by: 'kolkata-boundary',
      validated_contains_station_point: true,
    },
  }
}
function sanitizePublicFeature(feature) {
  return {
    type: 'Feature',
    properties: {
      station_id: feature?.properties?.station_id,
    },
    geometry: feature.geometry,
  }
}

async function main() {
  const [
    ,
    ,
    rawVoronoiPathArg,
    publicOutputPathArg,
    clippedOutputPathArg,
    boundaryPathArg,
    boundarySourcePathArg,
    pointsPathArg,
  ] = process.argv

  const rawVoronoiPath = rawVoronoiPathArg || defaultRawVoronoiPath
  const publicOutputPath = publicOutputPathArg || defaultPublicOutputPath
  const clippedOutputPath = clippedOutputPathArg || defaultClippedOutputPath
  const boundaryPath = boundaryPathArg || defaultBoundaryPath
  const boundarySourcePath = boundarySourcePathArg || defaultBoundarySourcePath
  const pointsPath = pointsPathArg || defaultPointsPath

  const rawVoronoi = loadJson(rawVoronoiPath)
  const stations = loadStationPoints(pointsPath)
  const stationPointIndex = buildStationPointIndex(stations)

  let boundaryFeature = null
  let sourceKind = 'unknown'

  try {
    boundaryFeature = await resolveOverpassBoundary()
    sourceKind = 'osm-overpass'
  } catch (error) {
    boundaryFeature = null
  }

  const coverageCheck = boundaryFeature ? boundaryCoversStations(boundaryFeature, stations) : null

  if (!boundaryFeature || !coverageCheck?.complete) {
    boundaryFeature = await resolveGeoBoundariesFallback()
    sourceKind = 'geoBoundaries-fallback'
  }

  if (!boundaryFeature) {
    throw new Error('Could not resolve a Kolkata boundary polygon from OSM or the fallback portal')
  }

  const finalCoverageCheck = boundaryCoversStations(boundaryFeature, stations)
  const clippedFeatures = []
  let clippedCount = 0

  for (const feature of rawVoronoi.features || []) {
    const stationId = feature?.properties?.station_id
    const stationPoint = stationId ? stationPointIndex.get(stationId) : null
    const clipped = clipVoronoiFeature(feature, boundaryFeature, stationPoint)
    clippedFeatures.push(clipped)
    clippedCount += 1
  }

  const clippedCollection = {
    type: 'FeatureCollection',
    properties: {
      generated_at: new Date().toISOString(),
      source: rawVoronoiPath,
      boundary_source: boundaryFeature.properties || {},
      boundary_coverage: finalCoverageCheck,
      station_count: stations.length,
      cell_count: clippedFeatures.length,
      clipped_count: clippedCount,
    },
    features: clippedFeatures,
  }

  saveJson(boundaryPath, {
    type: 'FeatureCollection',
    properties: {
      generated_at: new Date().toISOString(),
      source: boundaryFeature.properties || {},
      station_count: stations.length,
      boundary_coverage: finalCoverageCheck,
      selected_source_kind: sourceKind,
    },
    features: [boundaryFeature],
  })

  saveJson(boundarySourcePath, {
    generated_at: new Date().toISOString(),
    selected_source_kind: sourceKind,
    boundary_coverage: finalCoverageCheck,
    fallback_url: fallbackGeoBoundariesUrl,
  })

  const publicCollection = {
    ...clippedCollection,
    features: clippedFeatures.map(sanitizePublicFeature),
  }

  saveJson(clippedOutputPath, clippedCollection)
  saveJson(publicOutputPath, publicCollection)

  console.log(`Wrote ${boundaryPath}`)
  console.log(`Wrote ${boundarySourcePath}`)
  console.log(`Wrote ${clippedOutputPath}`)
  console.log(`Wrote ${publicOutputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
