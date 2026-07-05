#!/usr/bin/env node
// Re-run this simplifier only when the converted road GeoJSON changes.
// The chosen tolerance below was iterated up/down against file size and city-block fidelity,
// so re-running later with the same constant reproduces the same trade-off.
// It does not need to run on every deploy if the raw Overpass extract stays the same.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplify } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'scripts', 'output', 'road_network_linestrings.geojson')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'road_network_linestrings_simplified.geojson')
const defaultPublicOutputPath = join(projectRoot, 'public', 'data', 'road_network_linestrings_simplified.geojson')
const chosenTolerance = 0.0001
const defaultTolerance = chosenTolerance

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isFeature(value) {
  return value && typeof value === 'object' && value.type === 'Feature'
}

function simplifyFeature(feature, tolerance) {
  const simplified = simplify(feature, {
    tolerance,
    highQuality: false,
    mutate: false,
  })

  if (!simplified?.geometry || simplified.geometry.type !== 'LineString') {
    return null
  }

  if (!Array.isArray(simplified.geometry.coordinates) || simplified.geometry.coordinates.length < 2) {
    return null
  }

  return simplified
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const outputPath = process.argv[3] || defaultOutputPath
  const publicOutputPath = process.argv[4] || defaultPublicOutputPath
  const toleranceArg = process.argv[5]
  const tolerance = toleranceArg ? Number(toleranceArg) : defaultTolerance

  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error(`Invalid simplify tolerance: ${toleranceArg}`)
  }

  const payload = loadJson(inputPath)
  const features = Array.isArray(payload?.features) ? payload.features : []
  const simplifiedFeatures = []
  let skippedFeatures = 0
  let unchangedFeatures = 0

  for (const feature of features) {
    if (!isFeature(feature)) {
      skippedFeatures += 1
      continue
    }

    const simplifiedFeature = simplifyFeature(feature, tolerance)
    if (!simplifiedFeature) {
      skippedFeatures += 1
      continue
    }

    if (
      JSON.stringify(simplifiedFeature.geometry.coordinates) ===
      JSON.stringify(feature.geometry?.coordinates)
    ) {
      unchangedFeatures += 1
    }

    simplifiedFeatures.push(simplifiedFeature)
  }

  if (simplifiedFeatures.length === 0) {
    throw new Error(`No valid simplified LineString features could be generated from ${inputPath}`)
  }

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_geojson_path: inputPath,
      source_feature_count: features.length,
      simplified_feature_count: simplifiedFeatures.length,
      skipped_feature_count: skippedFeatures,
      unchanged_feature_count: unchangedFeatures,
      simplify_tolerance: tolerance,
      simplify_units: 'degrees',
      simplify_note: 'GeoJSON LineStrings simplified with turf.simplify while preserving original feature properties.',
    },
    features: simplifiedFeatures,
  }

  saveJson(outputPath, outputValue)
  saveJson(publicOutputPath, outputValue)

  console.log(`Simplified ${simplifiedFeatures.length} feature(s) from ${inputPath}`)
  console.log(`Skipped ${skippedFeatures} feature(s)`)
  console.log(`Unchanged ${unchangedFeatures} feature(s)`)
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${publicOutputPath}`)
}

main()