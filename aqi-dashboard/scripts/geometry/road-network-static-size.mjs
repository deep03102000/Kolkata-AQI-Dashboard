#!/usr/bin/env node
// Sanity-check the published road export size before it is treated as final.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'public', 'data', 'kolkata_roads.json')
const defaultMaxBytes = 7 * 1024 * 1024
const splitFilePrefix = 'roads_station_'
const splitFileSuffix = '.json'

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes (${(bytes / 1024 / 1024).toFixed(2)} MiB)`
}

function sanitizeStationId(stationId) {
  return stationId.replace(/[^A-Za-z0-9_-]/g, '_')
}

function cleanupSplitFiles(outputDir) {
  for (const entry of readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue
    }

    if (entry.name.startsWith(splitFilePrefix) && entry.name.endsWith(splitFileSuffix)) {
      rmSync(join(outputDir, entry.name), { force: true })
    }
  }
}

function groupFeaturesByStation(features) {
  const groups = new Map()

  for (const feature of features) {
    const stationId = feature?.properties?.station_id
    if (typeof stationId !== 'string' || stationId.trim() === '') {
      throw new Error('Cannot split the road export because one or more features are missing station_id')
    }

    if (!groups.has(stationId)) {
      groups.set(stationId, [])
    }

    groups.get(stationId).push(feature)
  }

  return groups
}

function buildSplitPayload(inputPath, stationId, features) {
  return {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_combined_path: inputPath,
      station_id: stationId,
      exported_feature_count: features.length,
      note: 'Per-station road export generated because the combined file exceeded the size budget.',
    },
    features,
  }
}

function splitByStation(inputPath, outputDir, features) {
  cleanupSplitFiles(outputDir)

  const groups = groupFeaturesByStation(features)
  const writtenFiles = []

  for (const [stationId, stationFeatures] of groups.entries()) {
    const fileName = `${splitFilePrefix}${sanitizeStationId(stationId)}${splitFileSuffix}`
    const filePath = join(outputDir, fileName)
    saveJson(filePath, buildSplitPayload(inputPath, stationId, stationFeatures))
    writtenFiles.push({ stationId, filePath, count: stationFeatures.length })
  }

  rmSync(inputPath, { force: true })
  return writtenFiles
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const maxBytes = Number.isFinite(Number(process.argv[3])) ? Number(process.argv[3]) : defaultMaxBytes
  const outputDir = dirname(inputPath)
  const actualBytes = statSync(inputPath).size
  const payload = loadJson(inputPath)

  if (!payload || payload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${inputPath}`)
  }

  const features = Array.isArray(payload.features) ? payload.features : []
  if (features.length === 0) {
    throw new Error(`No road features were found in ${inputPath}`)
  }

  if (actualBytes <= maxBytes) {
    cleanupSplitFiles(outputDir)
    console.log(`Checked ${inputPath}`)
    console.log(`Size: ${formatBytes(actualBytes)} of ${formatBytes(maxBytes)}`)
    return
  }

  const writtenFiles = splitByStation(inputPath, outputDir, features)
  console.log(`Road export exceeded budget, split into ${writtenFiles.length} station file(s)`)
  console.log(`Original size: ${formatBytes(actualBytes)} of ${formatBytes(maxBytes)}`)
  writtenFiles.forEach((item) => {
    console.log(`- ${item.stationId}: ${item.count} feature(s) -> ${item.filePath}`)
  })
}

main()
