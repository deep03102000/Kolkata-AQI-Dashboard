#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'aqi-dashboard', 'public', 'data', 'station_master.json')
const defaultOutputPath = join(__dirname, 'station-distance-report.json')

function haversineKm(a, b) {
  const earthRadiusKm = 6371
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const sinHalfLat = Math.sin(dLat / 2)
  const sinHalfLon = Math.sin(dLon / 2)

  const haversine =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

function loadStations(inputPath) {
  const raw = readFileSync(inputPath, 'utf8')
  const stations = JSON.parse(raw)

  if (!Array.isArray(stations)) {
    throw new Error('Station master file must contain an array')
  }

  return stations.map((station) => {
    if (
      !station ||
      typeof station.station_id !== 'string' ||
      typeof station.station_name !== 'string' ||
      typeof station.latitude !== 'number' ||
      typeof station.longitude !== 'number'
    ) {
      throw new Error('Station master row is missing required fields')
    }

    return station
  })
}

function buildDistanceGraph(stations) {
  const pairwise = []
  const nearestNeighbors = stations.map((station) => ({
    station_id: station.station_id,
    station_name: station.station_name,
    nearest_station_id: null,
    nearest_station_name: null,
    nearest_distance_km: null,
  }))

  for (let i = 0; i < stations.length; i += 1) {
    for (let j = i + 1; j < stations.length; j += 1) {
      const left = stations[i]
      const right = stations[j]
      const distanceKm = Number(haversineKm(left, right).toFixed(3))

      pairwise.push({
        from_station_id: left.station_id,
        from_station_name: left.station_name,
        to_station_id: right.station_id,
        to_station_name: right.station_name,
        distance_km: distanceKm,
      })

      const leftNearest = nearestNeighbors[i]
      if (leftNearest.nearest_distance_km === null || distanceKm < leftNearest.nearest_distance_km) {
        leftNearest.nearest_station_id = right.station_id
        leftNearest.nearest_station_name = right.station_name
        leftNearest.nearest_distance_km = distanceKm
      }

      const rightNearest = nearestNeighbors[j]
      if (rightNearest.nearest_distance_km === null || distanceKm < rightNearest.nearest_distance_km) {
        rightNearest.nearest_station_id = left.station_id
        rightNearest.nearest_station_name = left.station_name
        rightNearest.nearest_distance_km = distanceKm
      }
    }
  }

  return { pairwise, nearestNeighbors }
}

function main() {
  const [, , inputPathArg, outputPathArg] = process.argv
  const inputPath = inputPathArg ? inputPathArg : defaultInputPath
  const outputPath = outputPathArg ? outputPathArg : defaultOutputPath
  const stations = loadStations(inputPath)
  const report = {
    generated_at: new Date().toISOString(),
    source: inputPath,
    station_count: stations.length,
    ...buildDistanceGraph(stations),
  }

  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
}

main()