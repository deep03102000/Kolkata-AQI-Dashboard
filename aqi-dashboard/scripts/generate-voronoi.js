#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Delaunay } from 'd3-delaunay'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const defaultInputPath = join(projectRoot, '..', 'Dataset', 'master', 'station_master.csv')
const defaultOutputPath = join(projectRoot, 'public', 'data', 'voronoi-cells.geojson')
const defaultIntermediateOutputPath = join(__dirname, 'output', 'voronoi_cells_featurecollection.json')
const defaultPointsOutputPath = join(__dirname, 'output', 'voronoi_points.json')
const defaultBoundsOutputPath = join(__dirname, 'output', 'voronoi_bounds.json')

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

function buildBounds(stations) {
  const latitudes = stations.map((station) => station.latitude)
  const longitudes = stations.map((station) => station.longitude)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const latitudeSpan = maxLatitude - minLatitude
  const longitudeSpan = maxLongitude - minLongitude
  const latitudePadding = Math.max(latitudeSpan * 0.25, 0.03)
  const longitudePadding = Math.max(longitudeSpan * 0.25, 0.03)

  return {
    minLongitude: Number((minLongitude - longitudePadding).toFixed(7)),
    minLatitude: Number((minLatitude - latitudePadding).toFixed(7)),
    maxLongitude: Number((maxLongitude + longitudePadding).toFixed(7)),
    maxLatitude: Number((maxLatitude + latitudePadding).toFixed(7)),
    longitudePadding: Number(longitudePadding.toFixed(7)),
    latitudePadding: Number(latitudePadding.toFixed(7)),
  }
}

function buildBoundsArray(bounds) {
  return [bounds.minLongitude, bounds.minLatitude, bounds.maxLongitude, bounds.maxLatitude]
}

function closeRing(ring) {
  if (ring.length === 0) {
    return ring
  }

  const [firstX, firstY] = ring[0]
  const [lastX, lastY] = ring[ring.length - 1]

  if (firstX === lastX && firstY === lastY) {
    return ring
  }

  return [...ring, [firstX, firstY]]
}

function buildRawPoints(stations) {
  return stations.map((station) => ({
    station_id: station.station_id,
    station_name: station.station_name,
    longitude: station.longitude,
    latitude: station.latitude,
    point: [station.longitude, station.latitude],
  }))
}

function buildVoronoiFeatureCollection(stations, bounds, inputPath) {
  const points = stations.map((station) => [station.longitude, station.latitude])
  const delaunay = Delaunay.from(points, (point) => point[0], (point) => point[1])
  const voronoi = delaunay.voronoi(buildBoundsArray(bounds))

  const features = stations
    .map((station, index) => {
      const polygon = voronoi.cellPolygon(index)

      if (!polygon || polygon.length < 3) {
        return null
      }

      return {
        type: 'Feature',
        properties: {
          station_id: station.station_id,
          station_name: station.station_name,
          cell_index: index,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [closeRing(polygon)],
        },
      }
    })
    .filter(Boolean)

  return {
    type: 'FeatureCollection',
    properties: {
      generated_at: new Date().toISOString(),
      source: inputPath,
      station_count: stations.length,
      cell_count: features.length,
      bounds,
    },
    features,
  }
}

function main() {
  const [
    ,
    ,
    inputPathArg,
    outputPathArg,
    intermediateOutputPathArg,
    pointsOutputPathArg,
    boundsOutputPathArg,
  ] = process.argv
  const inputPath = inputPathArg ? inputPathArg : defaultInputPath
  const outputPath = outputPathArg ? outputPathArg : defaultOutputPath
  const intermediateOutputPath = intermediateOutputPathArg
    ? intermediateOutputPathArg
    : defaultIntermediateOutputPath
  const pointsOutputPath = pointsOutputPathArg ? pointsOutputPathArg : defaultPointsOutputPath
  const boundsOutputPath = boundsOutputPathArg ? boundsOutputPathArg : defaultBoundsOutputPath
  const stations = loadStations(inputPath)
  const rawPoints = buildRawPoints(stations)
  const bounds = buildBounds(stations)
  const voronoi = buildVoronoiFeatureCollection(stations, bounds, inputPath)

  mkdirSync(dirname(intermediateOutputPath), { recursive: true })
  writeFileSync(intermediateOutputPath, `${JSON.stringify(voronoi, null, 2)}\n`, 'utf8')

  mkdirSync(dirname(pointsOutputPath), { recursive: true })
  writeFileSync(
    pointsOutputPath,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: inputPath,
        station_count: stations.length,
        points: rawPoints,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  mkdirSync(dirname(boundsOutputPath), { recursive: true })
  writeFileSync(
    boundsOutputPath,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: inputPath,
        station_count: stations.length,
        bounds,
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  writeFileSync(intermediateOutputPath, `${JSON.stringify(voronoi, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${intermediateOutputPath}`)
  writeFileSync(outputPath, `${JSON.stringify(voronoi, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${pointsOutputPath}`)
  console.log(`Wrote ${boundsOutputPath}`)
}

main()
