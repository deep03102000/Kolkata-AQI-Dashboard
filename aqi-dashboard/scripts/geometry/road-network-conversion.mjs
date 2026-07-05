#!/usr/bin/env node
// Re-run this converter only when the raw Overpass road extract changes.
// It does not need to run on every deploy if the station locations and district boundary stay the same.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'scripts', 'output', 'raw_roads.json')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'road_network_linestrings.geojson')
const tagWhitelist = ['highway', 'name', 'ref', 'oneway', 'bridge', 'tunnel', 'service', 'surface'] // Keep road class and road name for later labeling/debugging.

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

function isGeometryPoint(point) {
  return point && typeof point === 'object' && isFiniteNumber(point.lat) && isFiniteNumber(point.lon)
}

function normalizeWayGeometry(geometry) {
  if (!Array.isArray(geometry)) {
    return []
  }

  return geometry
    .filter(isGeometryPoint)
    .map((point) => [point.lon, point.lat])
    .filter((coordinate, index, coordinates) => {
      if (index === 0) {
        return true
      }

      const previous = coordinates[index - 1]
      return previous[0] !== coordinate[0] || previous[1] !== coordinate[1]
    })
}

function pickTags(tags) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
    return {}
  }

  return tagWhitelist.reduce((accumulator, key) => {
    if (typeof tags[key] === 'string' && tags[key].trim() !== '') {
      accumulator[key] = tags[key]
    }

    return accumulator
  }, {})
}

function convertWayToFeature(way) {
  const coordinates = normalizeWayGeometry(way?.geometry)

  if (coordinates.length < 2) {
    return null
  }

  return {
    type: 'Feature',
    properties: {
      osm_type: 'way',
      osm_id: way.id,
      ...pickTags(way.tags),
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  }
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const outputPath = process.argv[3] || defaultOutputPath
  const payload = loadJson(inputPath)
  const elements = Array.isArray(payload?.elements) ? payload.elements : []
  const ways = elements.filter((element) => element?.type === 'way')
  const features = []
  let skippedWays = 0

  for (const way of ways) {
    const feature = convertWayToFeature(way)
    if (feature) {
      features.push(feature)
    } else {
      skippedWays += 1
    }
  }

  if (features.length === 0) {
    throw new Error(`No valid LineString features could be generated from ${inputPath}`)
  }

  saveJson(outputPath, {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_raw_overpass_path: inputPath,
      source_element_count: elements.length,
      source_way_count: ways.length,
      skipped_way_count: skippedWays,
      feature_count: features.length,
      geometry_note: 'Converted from Overpass ways with inline geometry produced by out body geom;',
    },
    features,
  })

  console.log(`Converted ${ways.length} way(s) from ${inputPath}`)
  console.log(`Skipped ${skippedWays} way(s) with insufficient geometry`) 
  console.log(`Wrote ${outputPath} (${features.length} feature(s))`)
}

main()