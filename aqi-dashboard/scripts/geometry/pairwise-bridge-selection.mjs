#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bridgeBorderColorConvention,
  bridgeBorderOpacityConvention,
  bridgeBorderStyleConvention,
  bridgeCircleFillOpacityConvention,
  bridgeFillConvention,
  bridgePairDistanceThresholdKm,
  bridgeGeometryShape,
  bridgePairGeometryRule,
  bridgePairMeetsGeometryModel,
  bridgePairMidpointThresholdKm,
  midpointDistanceFromEachStationKm,
  qualifiesBridgePair,
} from './pairwise-bridge-model.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..', '..')
const defaultStationMasterPath = join(projectRoot, 'Dataset', 'master', 'station_master.csv')
const defaultDistanceReportPath = join(__dirname, 'station-distance-report.json')
const defaultMidpointPath = join(__dirname, '..', 'output', 'pair_midpoints.json')
const defaultReportPath = join(__dirname, 'pairwise-bridge-selection-report.json')
const defaultJsonOutputPath = join(__dirname, '..', 'output', 'pairwise_bridge_pairs.json')
const defaultQualifyingPairsPath = join(__dirname, '..', 'output', 'qualifying_pairs.json')
const defaultGeoOutputPath = join(__dirname, '..', 'output', 'pairwise_bridge_pairs.geojson')

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

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
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

function buildStationIndex(stations) {
  return new Map(stations.map((station) => [station.station_id, station]))
}

function pairKey(fromStationId, toStationId) {
  return `${fromStationId}__${toStationId}`
}

function loadPairwiseDistances(distanceReportPath) {
  const payload = loadJson(distanceReportPath)
  const pairwise = Array.isArray(payload?.pairwise) ? payload.pairwise : []

  if (pairwise.length === 0) {
    throw new Error(`No pairwise distances were found in ${distanceReportPath}`)
  }

  return pairwise
}

function loadMidpointPairs(midpointPath) {
  const payload = loadJson(midpointPath)
  return payload?.midpoint_pairs && typeof payload.midpoint_pairs === 'object' ? payload.midpoint_pairs : {}
}

function buildBridgeCandidates(stations, pairwiseDistances, midpointPairs) {
  const stationIndex = buildStationIndex(stations)
  const qualifyingPairs = []
  const rejectedPairs = []
  const geoFeatures = []
  const distanceQualifiedPairs = pairwiseDistances.filter((pair) => qualifiesBridgePair(Number(pair.distance_km)))
  const distanceRejectedPairs = pairwiseDistances.filter((pair) => !qualifiesBridgePair(Number(pair.distance_km)))

  for (const pair of distanceRejectedPairs) {
    const key = pairKey(pair.from_station_id, pair.to_station_id)
    const stationA = stationIndex.get(pair.from_station_id)
    const stationB = stationIndex.get(pair.to_station_id)

    if (!stationA || !stationB) {
      throw new Error(`Missing station master row for pair ${key}`)
    }

    rejectedPairs.push({
      pair_key: key,
      from_station_id: pair.from_station_id,
      from_station_name: pair.from_station_name,
      to_station_id: pair.to_station_id,
      to_station_name: pair.to_station_name,
      distance_km: Number(Number(pair.distance_km).toFixed(3)),
      midpoint_longitude: null,
      midpoint_latitude: null,
      midpoint_distance_from_each_station_km: midpointDistanceFromEachStationKm(Number(pair.distance_km)),
      bridge_pair_distance_threshold_km: bridgePairDistanceThresholdKm,
      bridge_pair_midpoint_threshold_km: bridgePairMidpointThresholdKm,
      bridge_pair_geometry_rule: bridgePairGeometryRule,
      bridge_geometry_shape: bridgeGeometryShape,
      bridge_border_color_convention: bridgeBorderColorConvention,
      bridge_border_style_convention: bridgeBorderStyleConvention,
      bridge_border_opacity_convention: bridgeBorderOpacityConvention,
      bridge_circle_fill_opacity_convention: bridgeCircleFillOpacityConvention,
      bridge_fill_convention: bridgeFillConvention,
      bridge_pair_distance_qualifies: false,
      bridge_pair_midpoint_qualifies: false,
      bridge_pair_qualifies: false,
      bridge_pair_rejection_reason: 'distance_exceeds_threshold',
    })
  }

  for (const pair of distanceQualifiedPairs) {
    const key = pairKey(pair.from_station_id, pair.to_station_id)
    const midpoint = midpointPairs[key]
    const distanceKm = Number(pair.distance_km)
    const midpointDistanceKm = midpointDistanceFromEachStationKm(distanceKm)
    const midpointQualifies = midpointDistanceKm !== null && midpointDistanceKm <= bridgePairMidpointThresholdKm
    const bridgePairQualifies = bridgePairMeetsGeometryModel(distanceKm)
    const stationA = stationIndex.get(pair.from_station_id)
    const stationB = stationIndex.get(pair.to_station_id)

    if (!stationA || !stationB) {
      throw new Error(`Missing station master row for pair ${key}`)
    }

    const candidate = {
      pair_key: key,
      from_station_id: pair.from_station_id,
      from_station_name: pair.from_station_name,
      to_station_id: pair.to_station_id,
      to_station_name: pair.to_station_name,
      distance_km: Number(distanceKm.toFixed(3)),
      midpoint_longitude: midpoint ? midpoint.midpoint_longitude : null,
      midpoint_latitude: midpoint ? midpoint.midpoint_latitude : null,
      midpoint_distance_from_each_station_km: midpointDistanceKm,
      bridge_pair_distance_threshold_km: bridgePairDistanceThresholdKm,
      bridge_pair_midpoint_threshold_km: bridgePairMidpointThresholdKm,
      bridge_pair_geometry_rule: bridgePairGeometryRule,
      bridge_geometry_shape: bridgeGeometryShape,
      bridge_border_color_convention: bridgeBorderColorConvention,
      bridge_border_style_convention: bridgeBorderStyleConvention,
      bridge_border_opacity_convention: bridgeBorderOpacityConvention,
      bridge_circle_fill_opacity_convention: bridgeCircleFillOpacityConvention,
      bridge_fill_convention: bridgeFillConvention,
      bridge_pair_distance_qualifies: true,
      bridge_pair_midpoint_qualifies: midpointQualifies,
      bridge_pair_qualifies: bridgePairQualifies,
    }

    if (bridgePairQualifies) {
      qualifyingPairs.push(candidate)
      geoFeatures.push({
        type: 'Feature',
        properties: {
          ...candidate,
          geometry_model: 'station-to-station-line-seed',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [stationA.longitude, stationA.latitude],
            [stationB.longitude, stationB.latitude],
          ],
        },
      })
    } else {
      rejectedPairs.push({
        ...candidate,
        bridge_pair_rejection_reason: 'midpoint_exceeds_threshold',
      })
    }
  }

  return { qualifyingPairs, rejectedPairs, geoFeatures }
}

function main() {
  const [, , stationMasterPathArg, distanceReportPathArg, midpointPathArg, reportPathArg, jsonOutputPathArg, qualifyingPairsOutputPathArg, geoOutputPathArg] = process.argv
  const stationMasterPath = stationMasterPathArg || defaultStationMasterPath
  const distanceReportPath = distanceReportPathArg || defaultDistanceReportPath
  const midpointPath = midpointPathArg || defaultMidpointPath
  const reportPath = reportPathArg || defaultReportPath
  const jsonOutputPath = jsonOutputPathArg || defaultJsonOutputPath
  const qualifyingPairsOutputPath = qualifyingPairsOutputPathArg || defaultQualifyingPairsPath
  const geoOutputPath = geoOutputPathArg || defaultGeoOutputPath

  const stations = loadStations(stationMasterPath)
  const pairwiseDistances = loadPairwiseDistances(distanceReportPath)
  const midpointPairs = loadMidpointPairs(midpointPath)
  const { qualifyingPairs, rejectedPairs, geoFeatures } = buildBridgeCandidates(stations, pairwiseDistances, midpointPairs)

  const report = {
    generated_at: new Date().toISOString(),
    source_station_master: stationMasterPath,
    source_distance_report: distanceReportPath,
    source_midpoint_report: midpointPath,
    station_count: stations.length,
    pair_count: pairwiseDistances.length,
    qualifying_pair_count: qualifyingPairs.length,
    rejected_pair_count: rejectedPairs.length,
    bridge_pair_distance_threshold_km: bridgePairDistanceThresholdKm,
    bridge_pair_midpoint_threshold_km: bridgePairMidpointThresholdKm,
    bridge_pair_geometry_rule: bridgePairGeometryRule,
    bridge_geometry_shape: bridgeGeometryShape,
    bridge_border_color_convention: bridgeBorderColorConvention,
    bridge_border_style_convention: bridgeBorderStyleConvention,
    bridge_border_opacity_convention: bridgeBorderOpacityConvention,
    bridge_circle_fill_opacity_convention: bridgeCircleFillOpacityConvention,
    bridge_fill_convention: bridgeFillConvention,
    qualifying_pairs: qualifyingPairs,
    rejected_pairs: rejectedPairs,
  }

  saveJson(reportPath, report)
  saveJson(jsonOutputPath, {
    generated_at: report.generated_at,
    source: distanceReportPath,
    qualifying_pair_count: qualifyingPairs.length,
    bridge_pair_distance_threshold_km: bridgePairDistanceThresholdKm,
    bridge_pair_midpoint_threshold_km: bridgePairMidpointThresholdKm,
    bridge_pair_geometry_rule: bridgePairGeometryRule,
    bridge_geometry_shape: bridgeGeometryShape,
    bridge_border_color_convention: bridgeBorderColorConvention,
    bridge_border_style_convention: bridgeBorderStyleConvention,
    bridge_border_opacity_convention: bridgeBorderOpacityConvention,
    bridge_circle_fill_opacity_convention: bridgeCircleFillOpacityConvention,
    bridge_fill_convention: bridgeFillConvention,
    bridge_pairs: qualifyingPairs,
  })
  saveJson(qualifyingPairsOutputPath, {
    generated_at: report.generated_at,
    source_distance_report: distanceReportPath,
    qualifying_pair_count: qualifyingPairs.length,
    qualifying_pairs: qualifyingPairs,
  })
  saveJson(geoOutputPath, {
    type: 'FeatureCollection',
    metadata: {
      generated_at: report.generated_at,
      source_station_master: stationMasterPath,
      source_distance_report: distanceReportPath,
      source_midpoint_report: midpointPath,
      bridge_pair_distance_threshold_km: bridgePairDistanceThresholdKm,
      bridge_pair_midpoint_threshold_km: bridgePairMidpointThresholdKm,
      bridge_pair_geometry_rule: bridgePairGeometryRule,
      bridge_geometry_shape: bridgeGeometryShape,
      bridge_border_color_convention: bridgeBorderColorConvention,
      bridge_border_style_convention: bridgeBorderStyleConvention,
      bridge_border_opacity_convention: bridgeBorderOpacityConvention,
      bridge_circle_fill_opacity_convention: bridgeCircleFillOpacityConvention,
      bridge_fill_convention: bridgeFillConvention,
      feature_count: geoFeatures.length,
      note: 'Station-to-station line seed features for the qualifying pair set used by Phase 12 bridge work.',
    },
    features: geoFeatures,
  })

  console.log(`Wrote ${reportPath}`)
  console.log(`Wrote ${jsonOutputPath}`)
  console.log(`Wrote ${qualifyingPairsOutputPath}`)
  console.log(`Wrote ${geoOutputPath}`)
}

main()