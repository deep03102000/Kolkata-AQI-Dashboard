#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultBoundaryPath = join(__dirname, '..', 'output', 'kolkata_boundary.geojson')
const defaultQueryOutputPath = join(__dirname, '..', 'output', 'road_network_overpass_query.txt')
const defaultMetadataOutputPath = join(__dirname, '..', 'output', 'road_network_acquisition.json')
const overpassUrl = 'https://overpass-api.de/api/interpreter'
const highwayVehicleRegex = '^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service|living_street)$'

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveText(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${value}\n`, 'utf8')
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isPosition(value) {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])
}

function positionsEqual(left, right) {
  return left[0] === right[0] && left[1] === right[1]
}

function trimClosedRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) {
    return []
  }

  const trimmed = [...ring]
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]

  if (isPosition(first) && isPosition(last) && positionsEqual(first, last)) {
    trimmed.pop()
  }

  return trimmed.filter(isPosition)
}

function ringToPolyClause(ring) {
  return trimClosedRing(ring)
    .map(([longitude, latitude]) => `${latitude.toFixed(7)} ${longitude.toFixed(7)}`)
    .join(' ')
}

function loadBoundaryFeature(boundaryPath) {
  const payload = loadJson(boundaryPath)
  const feature = Array.isArray(payload?.features) ? payload.features[0] : null

  if (!feature?.geometry) {
    throw new Error(`Expected a boundary FeatureCollection with at least one feature in ${boundaryPath}`)
  }

  if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
    throw new Error(`Boundary geometry in ${boundaryPath} must be Polygon or MultiPolygon`)
  }

  return feature
}

function getBoundaryRings(geometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ({ polygonIndex: 0, ring }))
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon, polygonIndex) => polygon.map((ring) => ({ polygonIndex, ring })))
  }

  return []
}

function buildPolygonQuery(boundaryFeature) {
  const rings = getBoundaryRings(boundaryFeature.geometry)

  if (rings.length === 0) {
    throw new Error('Boundary geometry did not contain any rings for Overpass scoping')
  }

  const clauses = rings
    .map(({ polygonIndex, ring }) => {
      const polyClause = ringToPolyClause(ring)
      if (!polyClause) {
        return null
      }

      return `  way["highway"~"${highwayVehicleRegex}"](poly:"${polyClause}"); // polygon ${polygonIndex}`
    })
    .filter(Boolean)

  if (clauses.length === 0) {
    throw new Error('Could not build an Overpass polygon clause from the Kolkata boundary geometry')
  }

  return [
    '[out:json][timeout:180];',
    '(',
    ...clauses,
    ');',
    'out body geom;',
  ].join('\n')
}

function main() {
  const [, , boundaryPathArg, queryOutputPathArg, metadataOutputPathArg] = process.argv
  const boundaryPath = boundaryPathArg || defaultBoundaryPath
  const queryOutputPath = queryOutputPathArg || defaultQueryOutputPath
  const metadataOutputPath = metadataOutputPathArg || defaultMetadataOutputPath
  const boundaryFeature = loadBoundaryFeature(boundaryPath)
  const query = buildPolygonQuery(boundaryFeature)

  saveText(queryOutputPath, query)
  saveJson(metadataOutputPath, {
    generated_at: new Date().toISOString(),
    source_boundary_path: boundaryPath,
    scope_mode: 'polygon',
    overpass_url: overpassUrl,
    query_output_path: queryOutputPath,
    metadata_output_path: metadataOutputPath,
    query,
  })

  console.log(`Wrote ${queryOutputPath}`)
  console.log(`Wrote ${metadataOutputPath}`)
  console.log(query)
}

main()