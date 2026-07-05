#!/usr/bin/env node
// Re-run this export only when the joined road segments change.
// Phase 9.5.1 publishes the final joined road segments as a static JSON asset for the frontend.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments_station_join.geojson')
const defaultOutputPath = join(projectRoot, 'public', 'data', 'kolkata_roads.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function sanitizeFeatureProperties(properties) {
  const sanitized = {}
  const allowedKeys = ['station_id', 'name', 'highway']

  for (const key of allowedKeys) {
    if (typeof properties?.[key] === 'string' && properties[key].trim() !== '') {
      sanitized[key] = properties[key]
    }
  }

  // Deliberately drop all other joined fields, including any dynamic color styling.
  return sanitized
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const outputPath = process.argv[3] || defaultOutputPath
  const payload = loadJson(inputPath)

  if (!payload || payload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${inputPath}`)
  }

  const features = Array.isArray(payload.features) ? payload.features : []
  if (features.length === 0) {
    throw new Error(`No joined road segments were found in ${inputPath}`)
  }

  const exportedFeatures = features.map((feature) => ({
    type: 'Feature',
    properties: sanitizeFeatureProperties(feature?.properties),
    geometry: feature.geometry,
  }))

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_join_path: inputPath,
      source_feature_count: features.length,
      exported_feature_count: exportedFeatures.length,
      note: 'Static road segment export for frontend consumption, generated from the Phase 9.4 joined road segments.',
    },
    features: exportedFeatures,
  }

  saveJson(outputPath, outputValue)

  console.log(`Exported ${exportedFeatures.length} joined road segment(s) from ${inputPath}`)
  console.log(`Wrote ${outputPath}`)
}

main()