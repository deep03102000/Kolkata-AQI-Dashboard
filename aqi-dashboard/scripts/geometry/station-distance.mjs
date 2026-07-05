#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Delaunay } from 'd3-delaunay'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..', '..')
const defaultInputPath = join(projectRoot, 'Dataset', 'master', 'station_master.csv')
const defaultOutputPath = join(__dirname, 'station-distance-report.json')
const defaultMatrixOutputPath = join(__dirname, '..', 'output', 'distance_matrix.json')
const defaultSpotCheckOutputPath = join(__dirname, '..', 'output', 'distance_spot_checks.json')
const defaultMidpointOutputPath = join(__dirname, '..', 'output', 'pair_midpoints.json')

function haversineDistanceKm(a, b) {
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

function sphericalMidpoint(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const toDeg = (value) => (value * 180) / Math.PI
  const lat1 = toRad(a.latitude)
  const lon1 = toRad(a.longitude)
  const lat2 = toRad(b.latitude)
  const lon2 = toRad(b.longitude)
  const dLon = lon2 - lon1

  const bx = Math.cos(lat2) * Math.cos(dLon)
  const by = Math.cos(lat2) * Math.sin(dLon)
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2)
  )
  const lon3 = lon1 + Math.atan2(by, Math.cos(lat1) + bx)

  return {
    latitude: Number(toDeg(lat3).toFixed(7)),
    longitude: Number(toDeg(lon3).toFixed(7)),
  }
}

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
      const row = Object.fromEntries(
        headers.map((header, index) => [header, cells[index] ?? ''])
      )

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

// Hand-rolled Haversine keeps the script dependency-light while matching the required spatial distance behavior.
function buildDistanceMatrix(stations) {
  return stations.map((left) =>
    stations.map((right) =>
      left.station_id === right.station_id ? 0 : Number(haversineDistanceKm(left, right).toFixed(3))
    )
  )
}

function buildStationMatrix(stations) {
  const matrix = {}

  for (const left of stations) {
    const row = {}
    for (const right of stations) {
      row[right.station_id] =
        left.station_id === right.station_id
          ? 0
          : Number(haversineDistanceKm(left, right).toFixed(3))
    }
    matrix[left.station_id] = row
  }

  return matrix
}

function buildVoronoiNeighborSet(stations) {
  const points = stations.map((station) => [station.longitude, station.latitude])
  const delaunay = Delaunay.from(points, (point) => point[0], (point) => point[1])
  const neighborPairs = new Set()

  for (let i = 0; i < stations.length; i += 1) {
    for (const neighborIndex of delaunay.neighbors(i)) {
      const left = stations[Math.min(i, neighborIndex)]
      const right = stations[Math.max(i, neighborIndex)]
      neighborPairs.add(`${left.station_id}__${right.station_id}`)
    }
  }

  return neighborPairs
}

function buildSpotChecks(stations) {
  const byStationId = new Map(stations.map((station) => [station.station_id, station]))
  const checks = [
    ['site_5238', 'site_5111'],
    ['site_5238', 'site_5126'],
    ['site_5129', 'site_296'],
  ]

  return checks.map(([fromStationId, toStationId]) => {
    const fromStation = byStationId.get(fromStationId)
    const toStation = byStationId.get(toStationId)

    if (!fromStation || !toStation) {
      throw new Error(`Missing station for spot check: ${fromStationId} -> ${toStationId}`)
    }

    return {
      from_station_id: fromStationId,
      from_station_name: fromStation.station_name,
      to_station_id: toStationId,
      to_station_name: toStation.station_name,
      haversine_km: Number(haversineDistanceKm(fromStation, toStation).toFixed(3)),
      google_maps_review_note: 'Manually compare this pair in Google Maps before trusting the pipeline.',
    }
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
      const distanceKm = Number(haversineDistanceKm(left, right).toFixed(3))

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

function buildMidpointPairs(stations, voronoiNeighborPairs) {
  const midpointPairs = {}
  let neighborPairCount = 0

  for (let i = 0; i < stations.length; i += 1) {
    for (let j = i + 1; j < stations.length; j += 1) {
      const left = stations[i]
      const right = stations[j]
      const midpoint = sphericalMidpoint(left, right)
      const pairKey = `${left.station_id}__${right.station_id}`
      const isVoronoiNeighbor = voronoiNeighborPairs.has(pairKey)

      if (isVoronoiNeighbor) {
        neighborPairCount += 1
      }

      midpointPairs[pairKey] = {
        from_station_id: left.station_id,
        from_station_name: left.station_name,
        to_station_id: right.station_id,
        to_station_name: right.station_name,
        midpoint_latitude: midpoint.latitude,
        midpoint_longitude: midpoint.longitude,
        voronoi_neighbor: isVoronoiNeighbor,
      }
    }
  }

  return { midpointPairs, neighborPairCount }
}

function expectedPairCount(stationCount) {
  return (stationCount * (stationCount - 1)) / 2
}

function main() {
  const [, , inputPathArg, outputPathArg, matrixOutputPathArg, spotCheckOutputPathArg, midpointOutputPathArg] = process.argv
  const inputPath = inputPathArg ? inputPathArg : defaultInputPath
  const outputPath = outputPathArg ? outputPathArg : defaultOutputPath
  const matrixOutputPath = matrixOutputPathArg ? matrixOutputPathArg : defaultMatrixOutputPath
  const spotCheckOutputPath = spotCheckOutputPathArg ? spotCheckOutputPathArg : defaultSpotCheckOutputPath
  const midpointOutputPath = midpointOutputPathArg ? midpointOutputPathArg : defaultMidpointOutputPath
  const stations = loadStations(inputPath)
  const { pairwise, nearestNeighbors } = buildDistanceGraph(stations)
  const expectedPairs = expectedPairCount(stations.length)
  const matrix = buildStationMatrix(stations)
  const spotChecks = buildSpotChecks(stations)
  const voronoiNeighborPairs = buildVoronoiNeighborSet(stations)
  const { midpointPairs, neighborPairCount } = buildMidpointPairs(stations, voronoiNeighborPairs)

  if (pairwise.length !== expectedPairs) {
    throw new Error(
      `Expected ${expectedPairs} pairwise distances for ${stations.length} stations, got ${pairwise.length}`
    )
  }

  if (Object.keys(midpointPairs).length !== expectedPairs) {
    throw new Error(
      `Expected ${expectedPairs} midpoint calculations for ${stations.length} stations, got ${Object.keys(midpointPairs).length}`
    )
  }

  const report = {
    generated_at: new Date().toISOString(),
    source: inputPath,
    station_count: stations.length,
    pair_count: pairwise.length,
    expected_pair_count: expectedPairs,
    midpoint_count: Object.keys(midpointPairs).length,
    neighbor_midpoint_count: neighborPairCount,
    distant_midpoint_count: expectedPairs - neighborPairCount,
    spot_check_count: spotChecks.length,
    station_order: stations.map((station) => ({
      station_id: station.station_id,
      station_name: station.station_name,
    })),
    distance_matrix_km: buildDistanceMatrix(stations),
    pairwise,
    nearestNeighbors,
    spot_checks: spotChecks,
  }

  mkdirSync(dirname(matrixOutputPath), { recursive: true })
  writeFileSync(
    matrixOutputPath,
    `${JSON.stringify(
      {
        generated_at: report.generated_at,
        source: inputPath,
        station_count: stations.length,
        station_ids: stations.map((station) => station.station_id),
        station_names: stations.map((station) => station.station_name),
        matrix_km: matrix,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  mkdirSync(dirname(spotCheckOutputPath), { recursive: true })
  writeFileSync(
    spotCheckOutputPath,
    `${JSON.stringify(
      {
        generated_at: report.generated_at,
        source: inputPath,
        station_count: stations.length,
        spot_checks: spotChecks,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  mkdirSync(dirname(midpointOutputPath), { recursive: true })
  writeFileSync(
    midpointOutputPath,
    `${JSON.stringify(
      {
        generated_at: report.generated_at,
        source: inputPath,
        station_count: stations.length,
        midpoint_count: Object.keys(midpointPairs).length,
        neighbor_midpoint_count: neighborPairCount,
        distant_midpoint_count: expectedPairs - neighborPairCount,
        midpoint_pairs: midpointPairs,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${matrixOutputPath}`)
  console.log(`Wrote ${spotCheckOutputPath}`)
  console.log(`Wrote ${midpointOutputPath}`)
}

main()
