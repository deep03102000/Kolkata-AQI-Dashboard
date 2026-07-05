#!/usr/bin/env node
// Re-run this loader only when the clipped Voronoi cells change.
// It reads the Phase 8.7.1 public export and normalizes the cell boundaries into linework
// that later road-splitting stages can use without re-running the Voronoi pipeline.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'public', 'data', 'voronoi_cells.json')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'voronoi_cell_boundaries.geojson')
const defaultMetadataPath = join(projectRoot, 'scripts', 'output', 'voronoi_cell_boundaries.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPosition(value) {
  return Array.isArray(value) && value.length >= 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])
}

function normalizeRing(ring) {
  if (!Array.isArray(ring)) {
    return []
  }

  const coordinates = ring.filter(isPosition).map((position) => [position[0], position[1]])
  if (coordinates.length === 0) {
    return []
  }

  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    coordinates.pop()
  }

  return coordinates
}

function getPolygonRings(geometry) {
  if (!geometry || typeof geometry !== 'object') {
    return []
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring, ringIndex) => ({ polygonIndex: 0, ringIndex, ring }))
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon, polygonIndex) =>
      polygon.map((ring, ringIndex) => ({ polygonIndex, ringIndex, ring })),
    )
  }

  return []
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const outputPath = process.argv[3] || defaultOutputPath
  const metadataPath = process.argv[4] || defaultMetadataPath
  const payload = loadJson(inputPath)

  if (!payload || payload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${inputPath}`)
  }

  const features = Array.isArray(payload.features) ? payload.features : []
  if (features.length === 0) {
    throw new Error(`No Voronoi features were found in ${inputPath}`)
  }

  const boundaryFeatures = []
  let skippedFeatures = 0
  let totalRings = 0

  for (const feature of features) {
    const stationId = feature?.properties?.station_id
    if (typeof stationId !== 'string' || stationId.trim() === '') {
      skippedFeatures += 1
      continue
    }

    const rings = getPolygonRings(feature.geometry)
    if (rings.length === 0) {
      skippedFeatures += 1
      continue
    }

    for (const { polygonIndex, ringIndex, ring } of rings) {
      const coordinates = normalizeRing(ring)
      if (coordinates.length < 2) {
        continue
      }

      boundaryFeatures.push({
        type: 'Feature',
        properties: {
          station_id: stationId,
          polygon_index: polygonIndex,
          ring_index: ringIndex,
          ring_role: ringIndex === 0 ? 'outer' : 'hole',
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      })
      totalRings += 1
    }
  }

  if (boundaryFeatures.length === 0) {
    throw new Error(`No boundary linework could be generated from ${inputPath}`)
  }

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_voronoi_path: inputPath,
      source_feature_count: features.length,
      skipped_feature_count: skippedFeatures,
      boundary_feature_count: boundaryFeatures.length,
      source_ring_count: totalRings,
      note: 'Boundary linework extracted from the clipped Voronoi cells exported in Phase 8.7.1.',
    },
    features: boundaryFeatures,
  }

  saveJson(outputPath, outputValue)
  saveJson(metadataPath, outputValue.metadata)

  console.log(`Loaded ${features.length} clipped Voronoi cell(s) from ${inputPath}`)
  console.log(`Wrote ${boundaryFeatures.length} boundary line feature(s)`)
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${metadataPath}`)
}

main()
