#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeBridgeLensPolygon, isDegenerateTouchPair } from './bridge-polygon-geometry.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultTrioPairsPath = join(__dirname, '..', 'output', 'closest_trio_pairs.json')
const defaultCirclesPath = join(__dirname, '..', '..', 'public', 'data', 'circles_3km.json')
const defaultReportPath = join(__dirname, 'closest-trio-bridge-polygons-report.json')
const defaultInputsOutputPath = join(__dirname, '..', 'output', 'closest_trio_bridge_polygon_inputs.json')
const defaultPolygonsOutputPath = join(__dirname, '..', 'output', 'closest_trio_bridge_polygons.json')
const defaultGeoOutputPath = join(__dirname, '..', 'output', 'closest_trio_bridge_polygons.geojson')
const defaultPublicGeoOutputPath = join(__dirname, '..', '..', 'public', 'data', 'closest_trio_bridge_polygons.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadTrioPairs(trioPairsPath) {
  const payload = loadJson(trioPairsPath)
  const qualifyingPairs = Array.isArray(payload?.qualifying_pairs) ? payload.qualifying_pairs : []

  if (qualifyingPairs.length === 0) {
    throw new Error(`No trio qualifying pairs were found in ${trioPairsPath}`)
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
      bridge_polygon_source: 'closest_trio_pairs.json',
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
        bridge_polygon_source: 'closest_trio_pairs.json',
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

    console.error('Trio bridge polygon export count mismatch detected.')
    console.error(`Expected exported polygons: ${expectedExportedPolygonCount}`)
    console.error(`Actual exported polygons: ${bridgePolygons.length}`)
    console.error('Dropped pairs:')
    for (const pair of droppedPairs) {
      console.error(`- ${pair.pair_key} (${pair.from_station_id} -> ${pair.to_station_id}): ${pair.bridge_polygon_status} | ${pair.bridge_polygon_skip_reason}`)
    }

    throw new Error(
      `Exported trio bridge polygon count mismatch: expected ${expectedExportedPolygonCount} from ${bridgePolygonInputs.length} qualifying inputs minus ${degenerateTouchPairs.length} degenerate and ${nullIntersectionPairs.length} null-intersection pairs, but wrote ${bridgePolygons.length}.`,
    )
  }

  return expectedExportedPolygonCount
}

function validateExportedPolygonMatchesQualifyingCount(qualifyingPairs, bridgePolygons) {
  if (bridgePolygons.length !== qualifyingPairs.length) {
    throw new Error(
      `Exported trio bridge polygon count mismatch: expected ${qualifyingPairs.length} qualifying pairs from 12.9.3.5, but wrote ${bridgePolygons.length}.`,
    )
  }
}

function main() {
  const [, , trioPairsPathArg, circlesPathArg, reportPathArg, inputsOutputPathArg, polygonsOutputPathArg, geoOutputPathArg] = process.argv
  const trioPairsPath = trioPairsPathArg || defaultTrioPairsPath
  const circlesPath = circlesPathArg || defaultCirclesPath
  const reportPath = reportPathArg || defaultReportPath
  const inputsOutputPath = inputsOutputPathArg || defaultInputsOutputPath
  const polygonsOutputPath = polygonsOutputPathArg || defaultPolygonsOutputPath
  const geoOutputPath = geoOutputPathArg || defaultGeoOutputPath
  const publicGeoOutputPath = defaultPublicGeoOutputPath

  const { generatedAt, sourceDistanceReport, qualifyingPairs } = loadTrioPairs(trioPairsPath)
  const { generatedAt: circlesGeneratedAt, sourceStationMaster, circleIndex } = loadBaseCircles(circlesPath)
  const bridgePolygonInputs = buildBridgePolygonInputs(qualifyingPairs, circleIndex)
  const { bridgePolygons, degenerateTouchPairs, nullIntersectionPairs } = buildBridgePolygons(bridgePolygonInputs)
  const expectedExportedPolygonCount = validateExportedPolygonCount(bridgePolygonInputs, bridgePolygons, degenerateTouchPairs, nullIntersectionPairs)
  validateExportedPolygonMatchesQualifyingCount(qualifyingPairs, bridgePolygons)

  const report = {
    generated_at: new Date().toISOString(),
    source_trio_pairs_path: trioPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    source_trio_qualifying_pair_count: qualifyingPairs.length,
    qualifying_pair_count: bridgePolygons.length,
    bridge_polygon_input_count: bridgePolygonInputs.length,
    expected_exported_polygon_count: expectedExportedPolygonCount,
    degenerate_touch_pair_count: degenerateTouchPairs.length,
    null_intersection_pair_count: nullIntersectionPairs.length,
    note: 'Phase 12.9.4 reuses the shared turf.intersect() lens intersection helper from the general bridge polygon pipeline, applies the same 12.4.5/12.4.6 degenerate-touch and null-intersection handling, and writes the trio result to closest_trio_bridge_polygons.json instead of bridge_polygons.json.',
    public_geo_output_path: publicGeoOutputPath,
    source_trio_pairs_generated_at: generatedAt,
    source_3km_circles_generated_at: circlesGeneratedAt,
    source_3km_circles_station_master: sourceStationMaster,
  }

  saveJson(reportPath, report)
  saveJson(inputsOutputPath, {
    generated_at: report.generated_at,
    source_trio_pairs_path: trioPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    source_trio_qualifying_pair_count: qualifyingPairs.length,
    qualifying_pair_count: bridgePolygonInputs.length,
    expected_exported_polygon_count: expectedExportedPolygonCount,
    bridge_polygon_inputs: bridgePolygonInputs,
  })
  saveJson(polygonsOutputPath, {
    generated_at: report.generated_at,
    source_trio_pairs_path: trioPairsPath,
    source_3km_circles_path: circlesPath,
    source_distance_report: sourceDistanceReport,
    source_trio_qualifying_pair_count: qualifyingPairs.length,
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
      source_trio_pairs_path: trioPairsPath,
      source_3km_circles_path: circlesPath,
      source_distance_report: sourceDistanceReport,
      source_trio_qualifying_pair_count: qualifyingPairs.length,
      qualifying_pair_count: bridgePolygons.length,
      expected_exported_polygon_count: expectedExportedPolygonCount,
      degenerate_touch_pair_count: degenerateTouchPairs.length,
      null_intersection_pair_count: nullIntersectionPairs.length,
      note: 'Trio bridge polygons created by intersecting each trio qualifying pair\'s two 3 km circles. Exact 6 km point-touch pairs are filtered before intersect, and unexpected null intersections are filtered after intersect, matching Phase 12.4.5/12.4.6 and writing to closest_trio_bridge_polygons.json instead of bridge_polygons.json.',
    },
    features: bridgePolygons.map((pair) => pair.bridge_polygon),
  })
  saveJson(publicGeoOutputPath, {
    type: 'FeatureCollection',
    metadata: {
      generated_at: report.generated_at,
      source_trio_pairs_path: trioPairsPath,
      source_3km_circles_path: circlesPath,
      source_distance_report: sourceDistanceReport,
      source_trio_qualifying_pair_count: qualifyingPairs.length,
      qualifying_pair_count: bridgePolygons.length,
      expected_exported_polygon_count: expectedExportedPolygonCount,
      degenerate_touch_pair_count: degenerateTouchPairs.length,
      null_intersection_pair_count: nullIntersectionPairs.length,
      note: 'Public GeoJSON export of surviving trio bridge polygons after applying the same degenerate-point and null-intersection filtering as Phase 12.4.5/12.4.6, written to closest_trio_bridge_polygons.json instead of bridge_polygons.json.',
    },
    features: bridgePolygons.map((pair) => pair.bridge_polygon),
  })

  console.log(`Wrote ${reportPath}`)
  console.log(`Wrote ${inputsOutputPath}`)
  console.log(`Wrote ${polygonsOutputPath}`)
  console.log(`Wrote ${geoOutputPath}`)
  console.log(`Wrote ${publicGeoOutputPath}`)
  console.log(`Qualified trio bridge polygons: ${bridgePolygons.length} of ${bridgePolygonInputs.length}`)
}

main()
