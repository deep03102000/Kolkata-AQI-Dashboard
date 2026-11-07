#!/usr/bin/env node
// This geometry is static: station locations do not move, so re-run only when station coordinates change.
// Keep the same discipline as the Phase 8.7.4 Voronoi export note.
import { circle } from '@turf/turf'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const phase12BaseCircleRadiusKm = 3
const phase12BaseCircleSteps = 64

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultStationMasterPath = join(__dirname, '..', '..', '..', 'Dataset', 'master', 'station_master.csv')
const defaultReportPath = join(__dirname, 'fixed-3km-circles-report.json')
const defaultJsonOutputPath = join(__dirname, '..', 'output', 'fixed_3km_circles.json')
const defaultGeoOutputPath = join(__dirname, '..', 'output', 'fixed_3km_circles.geojson')
const defaultPublicOutputPath = join(__dirname, '..', '..', 'public', 'data', 'circles_3km.json')

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

function loadStations(inputPath) {
  const raw = readFileSync(inputPath, 'utf8')
  const inputFormat = extname(inputPath).toLowerCase()
  let stations

  if (inputFormat === '.json') {
    stations = JSON.parse(raw)
  } else {
    const lines = raw.trim().split(/\r?\n/)
    const [headerLine, ...dataLines] = lines
    const headers = parseCsvLine(headerLine).map((header) => header.trim())

    stations = dataLines.filter(Boolean).map((line) => {
      const cells = parseCsvLine(line)
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))

      return {
        station_id: row.station_id,
        station_name: row.station_name,
        latitude: Number.parseFloat(row.latitude),
        longitude: Number.parseFloat(row.longitude),
      }
    })
  }

  if (!Array.isArray(stations)) {
    throw new Error('Station master file must contain an array')
  }

  return stations.map((station) => {
    if (
      !station ||
      typeof station.station_id !== 'string' ||
      typeof station.station_name !== 'string' ||
      typeof station.latitude !== 'number' ||
      typeof station.longitude !== 'number' ||
      Number.isNaN(station.latitude) ||
      Number.isNaN(station.longitude)
    ) {
      throw new Error('Station master row is missing required fields')
    }

    return station
  })
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function buildFixedCircles(stations) {
  return stations.map((station) => {
    const feature = circle([station.longitude, station.latitude], phase12BaseCircleRadiusKm, {
      steps: phase12BaseCircleSteps,
      units: 'kilometers',
    })

    feature.properties = {
      // Keep station_id on every base circle so later bridge layers can join back to the station master.
      station_id: station.station_id,
      station_name: station.station_name,
      station_latitude: station.latitude,
      station_longitude: station.longitude,
      base_circle_radius_km: phase12BaseCircleRadiusKm,
      base_circle_steps: phase12BaseCircleSteps,
      geometry_role: 'phase12_base_circle',
    }

    return feature
  })
}

function main() {
  const [, , stationMasterPathArg, reportPathArg, jsonOutputPathArg, geoOutputPathArg, publicOutputPathArg] = process.argv
  const stationMasterPath = stationMasterPathArg || defaultStationMasterPath
  const reportPath = reportPathArg || defaultReportPath
  const jsonOutputPath = jsonOutputPathArg || defaultJsonOutputPath
  const geoOutputPath = geoOutputPathArg || defaultGeoOutputPath
  const publicOutputPath = publicOutputPathArg || defaultPublicOutputPath

  const stations = loadStations(stationMasterPath)
  const circleFeatures = buildFixedCircles(stations)
  const generatedAt = new Date().toISOString()

  const report = {
    generated_at: generatedAt,
    source_station_master: stationMasterPath,
    station_count: stations.length,
    base_circle_radius_km: phase12BaseCircleRadiusKm,
    base_circle_steps: phase12BaseCircleSteps,
    circle_count: circleFeatures.length,
    note: 'Phase 12 base layer: one 3 km turf.circle() per station, stored separately from the earlier Phase 3.4 1 km circle dataset and the Phase 8 Voronoi cells so no existing geometry output is overwritten.',
  }

  const publicFeatureCollection = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: generatedAt,
      source_station_master: stationMasterPath,
      station_count: stations.length,
      base_circle_radius_km: phase12BaseCircleRadiusKm,
      base_circle_steps: phase12BaseCircleSteps,
      circle_count: circleFeatures.length,
      note: 'Public Phase 12 base layer for frontend consumption. This is separate from the private scripts/output artifacts.',
    },
    features: circleFeatures,
  }

  saveJson(reportPath, report)
  saveJson(jsonOutputPath, {
    generated_at: generatedAt,
    source_station_master: stationMasterPath,
    station_count: stations.length,
    base_circle_radius_km: phase12BaseCircleRadiusKm,
    base_circle_steps: phase12BaseCircleSteps,
    circle_count: circleFeatures.length,
    circles: circleFeatures.map((feature) => feature.properties ?? {}),
  })
  saveJson(geoOutputPath, publicFeatureCollection)
  saveJson(publicOutputPath, publicFeatureCollection)

  console.log(`Wrote ${reportPath}`)
  console.log(`Wrote ${jsonOutputPath}`)
  console.log(`Wrote ${geoOutputPath}`)
  console.log(`Wrote ${publicOutputPath}`)
}

main()
