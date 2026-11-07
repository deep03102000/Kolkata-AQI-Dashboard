#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const qualifyingPairsPath = join(projectRoot, 'scripts', 'output', 'qualifying_pairs.json')
const bridgePolygonsPath = join(projectRoot, 'public', 'data', 'bridge_polygons.json')
const expectedStationIds = new Set(['site_5238', 'site_5129', 'site_5110', 'site_5111', 'site_5126', 'site_296'])

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

const qualifyingPayload = loadJson(qualifyingPairsPath)
const bridgePayload = loadJson(bridgePolygonsPath)
const qualifyingPairs = Array.isArray(qualifyingPayload?.qualifying_pairs) ? qualifyingPayload.qualifying_pairs : []
const bridgeFeatures = Array.isArray(bridgePayload?.features) ? bridgePayload.features : []

if (qualifyingPairs.length !== 7) {
  throw new Error(`Expected 7 qualifying pairs, found ${qualifyingPairs.length}`)
}

if (bridgeFeatures.length !== qualifyingPairs.length) {
  throw new Error(`Bridge polygon count mismatch: expected ${qualifyingPairs.length}, found ${bridgeFeatures.length}`)
}

const stationIds = new Set()
for (const feature of bridgeFeatures) {
  const props = feature?.properties ?? {}
  if (typeof props.station_id_a === 'string') {
    stationIds.add(props.station_id_a)
  }
  if (typeof props.station_id_b === 'string') {
    stationIds.add(props.station_id_b)
  }
}

for (const stationId of expectedStationIds) {
  if (!stationIds.has(stationId)) {
    throw new Error(`Bridge export is missing qualifying coverage for station ${stationId}`)
  }
}

const trioIds = new Set(['site_5238', 'site_5110', 'site_5126'])
const nonTrioPairs = bridgeFeatures.filter((feature) => {
  const props = feature?.properties ?? {}
  return !trioIds.has(props.station_id_a) || !trioIds.has(props.station_id_b)
})

if (nonTrioPairs.length === 0) {
  throw new Error('Bridge export appears narrowed to the three-station subset')
}

console.log(`Bridge restoration verified: ${bridgeFeatures.length} polygons across all 6 stations, with ${nonTrioPairs.length} pairs outside the 3-station subset.`)

