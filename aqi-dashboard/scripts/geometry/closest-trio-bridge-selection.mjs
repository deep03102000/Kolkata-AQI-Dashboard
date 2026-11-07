#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bridgeBorderColorConvention,
  bridgeBorderOpacityConvention,
  bridgeBorderStyleConvention,
  bridgeCircleFillOpacityConvention,
  bridgeFillConvention,
  bridgeGeometryShape,
  bridgePairDistanceThresholdKm,
  bridgePairGeometryRule,
  bridgePairMidpointThresholdKm,
  midpointDistanceFromEachStationKm,
} from './pairwise-bridge-model.mjs'

const CLOSEST_TRIO_STATIONS = [
  {
    station_id: 'site_5238',
    station_name: 'Ballygunge',
  },
  {
    station_id: 'site_5111',
    station_name: 'Jadavpur',
  },
  {
    station_id: 'site_5126',
    station_name: 'Rabindra Sarobar',
  },
]

const CLOSEST_TRIO_STATION_IDS = new Set(CLOSEST_TRIO_STATIONS.map((station) => station.station_id))
const CLOSEST_TRIO_PAIR_KEYS = new Set([
  pairKey('site_5238', 'site_5111'),
  pairKey('site_5238', 'site_5126'),
  pairKey('site_5111', 'site_5126'),
])

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultDistanceReportPath = join(__dirname, 'station-distance-report.json')
const defaultMidpointPath = join(__dirname, '..', 'output', 'pair_midpoints.json')
const defaultReportPath = join(__dirname, 'closest-trio-bridge-selection-report.json')
const defaultQualifyingPairsPath = join(__dirname, '..', 'output', 'closest_trio_pairs.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
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

function pairKey(fromStationId, toStationId) {
  return `${fromStationId}__${toStationId}`
}

function isClosestTrioPair(pair) {
  return (
    CLOSEST_TRIO_STATION_IDS.has(pair.from_station_id) &&
    CLOSEST_TRIO_STATION_IDS.has(pair.to_station_id) &&
    (CLOSEST_TRIO_PAIR_KEYS.has(pairKey(pair.from_station_id, pair.to_station_id)) ||
      CLOSEST_TRIO_PAIR_KEYS.has(pairKey(pair.to_station_id, pair.from_station_id)))
  )
}

function trioPairDistanceQualifies(distanceKm) {
  return Number.isFinite(distanceKm) && distanceKm <= bridgePairDistanceThresholdKm
}

function buildClosestTrioCandidates(pairwiseDistances, midpointPairs) {
  const qualifyingPairs = []
  const rejectedPairs = []

  const trioPairs = pairwiseDistances.filter(isClosestTrioPair)

  for (const pair of trioPairs) {
    const key = pairKey(pair.from_station_id, pair.to_station_id)
    const distanceKm = Number(pair.distance_km)
    const midpoint = midpointPairs[key]
    const midpointDistanceKm = midpointDistanceFromEachStationKm(distanceKm)
    const midpointQualifies = midpointDistanceKm !== null && midpointDistanceKm <= bridgePairMidpointThresholdKm
    const bridgePairQualifies = trioPairDistanceQualifies(distanceKm)

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
      bridge_pair_distance_qualifies: trioPairDistanceQualifies(distanceKm),
      bridge_pair_midpoint_qualifies: midpointQualifies,
      bridge_pair_qualifies: bridgePairQualifies,
    }

    if (bridgePairQualifies) {
      qualifyingPairs.push(candidate)
    } else {
      rejectedPairs.push({
        ...candidate,
        bridge_pair_rejection_reason: 'midpoint_exceeds_threshold',
      })
    }
  }

  return { trioPairs, qualifyingPairs, rejectedPairs }
}

function main() {
  const [, , distanceReportPathArg, midpointPathArg, reportPathArg, qualifyingPairsOutputPathArg] = process.argv
  const distanceReportPath = distanceReportPathArg || defaultDistanceReportPath
  const midpointPath = midpointPathArg || defaultMidpointPath
  const reportPath = reportPathArg || defaultReportPath
  const qualifyingPairsOutputPath = qualifyingPairsOutputPathArg || defaultQualifyingPairsPath

  const pairwiseDistances = loadPairwiseDistances(distanceReportPath)
  const midpointPairs = loadMidpointPairs(midpointPath)
  const { trioPairs, qualifyingPairs, rejectedPairs } = buildClosestTrioCandidates(pairwiseDistances, midpointPairs)
  const generatedAt = new Date().toISOString()

  const report = {
    generated_at: generatedAt,
    source_distance_report: distanceReportPath,
    source_midpoint_report: midpointPath,
    trio_station_ids: [...CLOSEST_TRIO_STATION_IDS],
    trio_station_count: CLOSEST_TRIO_STATIONS.length,
    trio_pair_count: trioPairs.length,
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
  saveJson(qualifyingPairsOutputPath, {
    generated_at: generatedAt,
    source_distance_report: distanceReportPath,
    source_midpoint_report: midpointPath,
    trio_station_ids: [...CLOSEST_TRIO_STATION_IDS],
    trio_station_count: CLOSEST_TRIO_STATIONS.length,
    trio_pair_count: trioPairs.length,
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
    qualifying_pairs: qualifyingPairs,
  })

  console.log(`Wrote ${reportPath}`)
  console.log(`Wrote ${qualifyingPairsOutputPath}`)
  console.log(`Qualified trio pairs: ${qualifyingPairs.length} of ${CLOSEST_TRIO_PAIR_KEYS.size}`)
}

main()








