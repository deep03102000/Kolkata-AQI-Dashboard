#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { featureCollection, length, lineOverlap, point, pointToLineDistance } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultMidpointPath = join(__dirname, '..', 'output', 'pair_midpoints.json')
const defaultClippedCellsPath = join(__dirname, '..', 'output', 'voronoi_cells_clipped_featurecollection.json')
const defaultOutputPath = join(__dirname, 'voronoi-midpoint-validation-report.json')
const defaultGeoOutputPath = join(__dirname, '..', 'output', 'voronoi_midpoint_shared_edges.geojson')
const midpointToleranceKm = 0.75
const manualInspectionThresholdKm = 0.5

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadClippedCells(filePath) {
  const payload = loadJson(filePath)
  const features = Array.isArray(payload?.features) ? payload.features : []

  if (features.length === 0) {
    throw new Error(`Expected clipped Voronoi features in ${filePath}`)
  }

  return features
}

function buildCellIndex(features) {
  return new Map(
    features.map((feature) => {
      const stationId = feature?.properties?.station_id
      if (!stationId) {
        throw new Error('Clipped Voronoi cell is missing station_id')
      }

      return [stationId, feature]
    }),
  )
}

function buildSharedEdge(leftCell, rightCell) {
  const overlap = lineOverlap(leftCell, rightCell)

  if (!overlap || !Array.isArray(overlap.features) || overlap.features.length === 0) {
    return null
  }

  return overlap
}

function buildMidpointPoint(pair) {
  return point([pair.midpoint_longitude, pair.midpoint_latitude], {
    pair_key: pair.pair_key,
    from_station_id: pair.from_station_id,
    to_station_id: pair.to_station_id,
  })
}

function measureMidpointDistanceKm(pair, sharedEdge) {
  const midpointPoint = buildMidpointPoint(pair)
  const distancesKm = sharedEdge.features.map((feature) =>
    pointToLineDistance(midpointPoint, feature, { units: 'kilometers' })
  )

  return Number(Math.min(...distancesKm).toFixed(3))
}

function main() {
  const [, , midpointPathArg, clippedCellsPathArg, outputPathArg, geoOutputPathArg] = process.argv
  const midpointPath = midpointPathArg || defaultMidpointPath
  const clippedCellsPath = clippedCellsPathArg || defaultClippedCellsPath
  const outputPath = outputPathArg || defaultOutputPath
  const geoOutputPath = geoOutputPathArg || defaultGeoOutputPath

  const midpointPayload = loadJson(midpointPath)
  const clippedCells = loadClippedCells(clippedCellsPath)
  const cellIndex = buildCellIndex(clippedCells)
  const midpointPairs = midpointPayload?.midpoint_pairs || {}
  const sharedEdgeFeatures = []
  const validatedPairs = {}
  const manualInspectionPairs = []
  const midpointEntries = Object.entries(midpointPairs)
  const neighborPairs = midpointEntries.filter(([, pair]) => pair?.voronoi_neighbor)

  for (const [pairKey, pair] of neighborPairs) {
    const leftCell = cellIndex.get(pair.from_station_id)
    const rightCell = cellIndex.get(pair.to_station_id)

    if (!leftCell || !rightCell) {
      throw new Error(`Missing clipped Voronoi cell for pair ${pairKey}`)
    }

    const sharedEdge = buildSharedEdge(leftCell, rightCell)
    if (!sharedEdge) {
      throw new Error(`No shared edge found for neighboring pair ${pairKey}`)
    }

    const midpointToEdgeDistanceKm = measureMidpointDistanceKm({ ...pair, pair_key: pairKey }, sharedEdge)
    const midpointWithinTolerance = midpointToEdgeDistanceKm <= midpointToleranceKm
    const needsManualInspection = midpointToEdgeDistanceKm > manualInspectionThresholdKm

    if (!midpointWithinTolerance) {
      throw new Error(
        `Midpoint for pair ${pairKey} is ${midpointToEdgeDistanceKm} km from the shared edge, beyond tolerance ${midpointToleranceKm} km`
      )
    }

    if (needsManualInspection) {
      manualInspectionPairs.push({
        pair_key: pairKey,
        from_station_id: pair.from_station_id,
        from_station_name: pair.from_station_name,
        to_station_id: pair.to_station_id,
        to_station_name: pair.to_station_name,
        midpoint_to_edge_distance_km: midpointToEdgeDistanceKm,
        manual_inspection_reason: 'Shared edge is offset enough to suggest a boundary clipping artifact from Phase 8.5',
      })
    }

    for (const feature of sharedEdge.features) {
      sharedEdgeFeatures.push({
        type: 'Feature',
        properties: {
          pair_key: pairKey,
          from_station_id: pair.from_station_id,
          from_station_name: pair.from_station_name,
          to_station_id: pair.to_station_id,
          to_station_name: pair.to_station_name,
          midpoint_latitude: pair.midpoint_latitude,
          midpoint_longitude: pair.midpoint_longitude,
          midpoint_to_edge_distance_km: midpointToEdgeDistanceKm,
          midpoint_within_tolerance: midpointWithinTolerance,
          needs_manual_inspection: needsManualInspection,
          voronoi_neighbor: true,
        },
        geometry: feature.geometry,
      })
    }

    const sharedEdgeLengthKm = Number(
      sharedEdge.features.reduce((sum, feature) => sum + length(feature, { units: 'kilometers' }), 0).toFixed(3)
    )

    validatedPairs[pairKey] = {
      ...pair,
      shared_edge_segment_count: sharedEdge.features.length,
      shared_edge_length_km: sharedEdgeLengthKm,
      midpoint_to_edge_distance_km: midpointToEdgeDistanceKm,
      midpoint_within_tolerance: midpointWithinTolerance,
      needs_manual_inspection: needsManualInspection,
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    source: midpointPath,
    clipped_cells_source: clippedCellsPath,
    station_count: cellIndex.size,
    midpoint_pair_count: midpointEntries.length,
    neighbor_pair_count: neighborPairs.length,
    shared_edge_pair_count: Object.keys(validatedPairs).length,
    midpoint_tolerance_km: midpointToleranceKm,
    manual_inspection_threshold_km: manualInspectionThresholdKm,
    manual_inspection_pair_count: manualInspectionPairs.length,
    manual_inspection_pairs: manualInspectionPairs,
    validated_pairs: validatedPairs,
  }

  saveJson(outputPath, report)
  saveJson(geoOutputPath, featureCollection(sharedEdgeFeatures))

  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${geoOutputPath}`)
}

main()