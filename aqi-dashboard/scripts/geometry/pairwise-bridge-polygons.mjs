#!/usr/bin/env node
import { computeBridgeLensPolygon, isDegenerateTouchPair } from './bridge-polygon-geometry.mjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultQualifyingPairsPath = join(__dirname, '..', 'output', 'qualifying_pairs.json')
const defaultCirclesPath = join(__dirname, '..', '..', 'public', 'data', 'circles_3km.json')
const defaultReportPath = join(__dirname, 'pairwise-bridge-polygons-report.json')
const defaultInputsOutputPath = join(__dirname, '..', 'output', 'pairwise_bridge_polygon_inputs.json')
const defaultPolygonsOutputPath = join(__dirname, '..', 'output', 'pairwise_bridge_polygons.json')
const defaultGeoOutputPath = join(__dirname, '..', 'output', 'pairwise_bridge_polygons.geojson')
const defaultPublicGeoOutputPath = join(__dirname, '..', '..', 'public', 'data', 'bridge_polygons.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadQualifyingPairs(qualifyingPairsPath) {
  const payload = loadJson(qualifyingPairsPath)
  const qualifyingPairs = Array.isArray(payload?.qualifying_pairs) ? payload.qualifying_pairs : []

  if (qualifyingPairs.length === 0) {
    throw new Error(`No qualifying pairs were found in ${qualifyingPairsPath}`)
  }

  return {
    generatedAt: payload?.generated_at || null,
    sourceDistanceReport: payload?.source_distance_report || null,
    qualifyingPairs,
  }
}

function loadBaseCircles(circlesPath) {
  const payload = loadJson(circlesPath)
  const features = Array.isArray(payload?.features) ? payload.features : []

  if (features.length === 0) {
    throw new Error(`No 3 km circles were found in ${circlesPath}`)
  }

  const circleIndex = new Map()
  for (const feature of features) {
    const stationId = feature?.properties?.station_id
    if (typeof stationId !== 'string' || stationId.length === 0) {
      throw new Error(`Circle feature is missing station_id in ${circlesPath}`)
    }

    circleIndex.set(stationId, feature)
  }

  return {
    generatedAt: payload?.metadata?.generated_at || null,
    sourceStationMaster: payload?.metadata?.source_station_master || null,
    circleIndex,
  }
}

function buildBridgePolygonInputs(qualifyingPairs, circleIndex) {
  return qualifyingPairs.map((pair) => {
    const fromStationCircle = circleIndex.get(pair.from_station_id)
    const toStationCircle = circleIndex.get(pair.to_station_id)

    if (!fromStationCircle) {
      throw new Error(`Missing 3 km circle for station ${pair.from_station_id}`)
    }

    if (!toStationCircle) {
      throw new Error(`Missing 3 km circle for station ${pair.to_station_id}`)
    }

    return {
      ...pair,
      from_station_circle: fromStationCircle,
      to_station_circle: toStationCircle,
      station_id_a: pair.from_station_id,
      station_id_b: pair.to_station_id,
      bridge_polygon_source: 'qualifying_pairs.json',
      bridge_polygon_status: 'loaded_for_polygon_generation',
    }
  })
}

function buildBridgePolygons(bridgePolygonInputs) {
  const bridgePolygons = []
  const degenerateTouchPairs = []
  const nullIntersectionPairs = []

  for (const pair of bridgePolygonInputs) {
    if (isDegenerateTouchPair(pair)) {
      degenerateTouchPairs.push({
        ...pair,
        bridge_polygon_source: 'qualifying_pairs.json',
        bridge_polygon_status: 'filtered_degenerate_point_touch',
        bridge_polygon_skip_reason: 'inter_station_distance_exactly_6_km_creates_single_point_touch',
      })
      continue
    }

    const lensPolygon = computeBridgeLensPolygon(pair)

    if (!lensPolygon) {
      nullIntersectionPairs.push({
        ...pair,
        bridge_polygon_source: 'turf.intersect',
        bridge_polygon_status: 'filtered_null_intersection',
        bridge_polygon_skip_reason: 'turf_intersect_returned_null_despite_qualifying_distance_filter',
      })
      continue
    }

    bridgePolygons.push({
      ...pair,
      station_id_a: pair.from_station_id,
      station_id_b: pair.to_station_id,
      bridge_polygon: lensPolygon,
      bridge_polygon_source: 'turf.intersect',
      bridge_polygon_status: 'computed_lens_polygon',
    })
  }

  return {
    bridgePolygons,
    degenerateTouchPairs,
    nullIntersectionPairs,
  }
}

function validateExportedPolygonCount(bridgePolygonInputs, bridgePolygons, degenerateTouchPairs, nullIntersectionPairs) {
  const expectedExportedPolygonCount = bridgePolygonInputs.length - degenerateTouchPairs.length - nullIntersectionPairs.length

  if (bridgePolygons.length !== expectedExportedPolygonCount) {
    const droppedPairs = [
      ...degenerateTouchPairs.map((pair) => ({
        pair_key: pair.pair_key,
        from_station_id: pair.from_station_id,
        to_station_id: pair.to_station_id,
        bridge_polygon_status: pair.bridge_polygon_status,
        bridge_polygon_skip_reason: pair.bridge_polygon_skip_reason,
      })),
      ...nullIntersectionPairs.map((pair) => ({
        pair_key: pair.pair_key,
        from_station_id: pair.from_station_id,
        to_station_id: pair.to_station_id,
        bridge_polygon_status: pair.bridge_polygon_status,
        bridge_polygon_skip_reason: pair.bridge_polygon_skip_reason,
      })),
    ]

    console.error('Bridge polygon export count mismatch detected.')
    console.error(`Expected exported polygons: ${expectedExportedPolygonCount}`)
    console.error(`Actual exported polygons: ${bridgePolygons.length}`)
    console.error('Dropped pairs:')
    for (const pair of droppedPairs) {
      console.error(`- ${pair.pair_key} (${pair.from_station_id} -> ${pair.to_station_id}): ${pair.bridge_polygon_status} | ${pair.bridge_polygon_skip_reason}`)
    }

    throw new Error(
      `Exported bridge polygon count mismatch: expected ${expectedExportedPolygonCount} from ${bridgePolygonInputs.length} qualifying inputs minus ${degenerateTouchPairs.length} degenerate and ${nullIntersectionPairs.length} null-intersection pairs, but wrote ${bridgePolygons.length}.`
    )
  }

  return expectedExportedPolygonCount
}

function main() {
  const [, , qualifyingPairsPathArg, circlesPathArg, reportPathArg, inputsOutputPathArg, polygonsOutputPathArg, geoOutputPathArg] = process.argv
  const qualifyingPairsPath = qualifyingPairsPathArg || defaultQualifyingPairsPath
  const circlesPath = circlesPathArg || defaultCirclesPath
  const reportPath = reportPathArg || defaultReportPath
  const inputsOutputPath = inputsOutputPathArg || defaultInputsOutputPath
  const polygonsOutputPath = polygonsOutputPathArg || defaultPolygonsOutputPath
  const geoOutputPath = geoOutputPathArg || defaultGeoOutputPath
  const publicGeoOutputPath = defaultPublicGeoOutputPath

  const { generatedAt, sourceDistanceReport, qualifyingPairs } = loadQualifyingPairs(qualifyingPairsPath)
  const { generatedAt: circlesGeneratedAt, sourceStationMaster, circleIndex } = loadBaseCircles(circlesPath)
  const bridgePolygonInputs = buildBridgePolygonInputs(qualifyingPairs, circleIndex)
  const { bridgePolygons, degenerateTouchPairs, nullIntersectionPairs } = buildBridgePolygons(bridgePolygonInputs)
  const expectedExportedPolygonCount = validateExportedPolygonCount(bridgePolygonInputs, bridgePolygons, degenerateTouchPairs, nullIntersectionPairs)

  const report = {
    generated_at: new Date().toISOString(),
    source_qualifying_pairs_path: qualifyingPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    qualifying_pair_count: bridgePolygons.length,
    bridge_polygon_input_count: bridgePolygonInputs.length,
    expected_exported_polygon_count: expectedExportedPolygonCount,
    degenerate_touch_pair_count: degenerateTouchPairs.length,
    null_intersection_pair_count: nullIntersectionPairs.length,
    note: 'Phase 12.4.3 computes the turf.intersect() of each qualifying pair\'s two 3 km circles to produce the lens-shaped bridge polygon. Phase 12.4.5 filters exact 6 km circle-touch pairs before any zero-area geometry is emitted. Phase 12.4.6 silently filters any unexpected null intersect result. Phase 12.4.8 validates the exported polygon count against the filtered input counts.',
    source_qualifying_pairs_generated_at: generatedAt,
    source_3km_circles_generated_at: circlesGeneratedAt,
    source_3km_circles_station_master: sourceStationMaster,
  }

  saveJson(reportPath, report)
  saveJson(inputsOutputPath, {
    generated_at: report.generated_at,
    source_qualifying_pairs_path: qualifyingPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    qualifying_pair_count: bridgePolygonInputs.length,
    expected_exported_polygon_count: expectedExportedPolygonCount,
    bridge_polygon_inputs: bridgePolygonInputs,
  })
  saveJson(polygonsOutputPath, {
    generated_at: report.generated_at,
    source_qualifying_pairs_path: qualifyingPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    qualifying_pair_count: bridgePolygons.length,
    expected_exported_polygon_count: expectedExportedPolygonCount,
    degenerate_touch_pair_count: degenerateTouchPairs.length,
    null_intersection_pair_count: nullIntersectionPairs.length,
    bridge_polygons: bridgePolygons,
  })
  saveJson(geoOutputPath, {
    type: 'FeatureCollection',
    metadata: {
      generated_at: report.generated_at,
      source_qualifying_pairs_path: qualifyingPairsPath,
      source_3km_circles_path: circlesPath,
      source_distance_report: sourceDistanceReport,
      qualifying_pair_count: bridgePolygons.length,
      expected_exported_polygon_count: expectedExportedPolygonCount,
      degenerate_touch_pair_count: degenerateTouchPairs.length,
      null_intersection_pair_count: nullIntersectionPairs.length,
      note: 'Lens-shaped bridge polygons created by intersecting each qualifying pair\'s two 3 km circles. Exact 6 km point-touch pairs and unexpected null intersections are filtered out before rendering.',
    },
    features: bridgePolygons.map((pair) => pair.bridge_polygon),
  })
  saveJson(publicGeoOutputPath, {
    type: 'FeatureCollection',
    metadata: {
      generated_at: report.generated_at,
      source_qualifying_pairs_path: qualifyingPairsPath,
      source_3km_circles_path: circlesPath,
      source_distance_report: sourceDistanceReport,
      qualifying_pair_count: bridgePolygons.length,
      expected_exported_polygon_count: expectedExportedPolygonCount,
      degenerate_touch_pair_count: degenerateTouchPairs.length,
      null_intersection_pair_count: nullIntersectionPairs.length,
      note: 'Public GeoJSON export of surviving bridge polygons after filtering exact 6 km touch pairs and unexpected null intersections.',
    },
    features: bridgePolygons.map((pair) => pair.bridge_polygon),
  })

  console.log(`Wrote ${reportPath}`)
  console.log(`Wrote ${inputsOutputPath}`)
  console.log(`Wrote ${polygonsOutputPath}`)
  console.log(`Wrote ${geoOutputPath}`)
  console.log(`Wrote ${publicGeoOutputPath}`)
}

main()


