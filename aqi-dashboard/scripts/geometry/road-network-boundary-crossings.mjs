#!/usr/bin/env node
// Re-run this checker only when the road layer or the clipped Voronoi boundaries change.
// Phase 9.3.2 tests every road LineString against the Voronoi boundary linework and keeps
// the roads that actually intersect a cell edge so the next phase can split them cleanly.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { booleanCrosses, bbox as turfBbox, lineIntersect } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultRoadsPath = join(projectRoot, 'public', 'data', 'road_network_linestrings_simplified.geojson')
const defaultBoundariesPath = join(projectRoot, 'scripts', 'output', 'voronoi_cell_boundaries.geojson')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'road_boundary_crossings.geojson')
const defaultReportPath = join(projectRoot, 'scripts', 'output', 'road_boundary_crossings.json')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isFeature(value) {
  return value && typeof value === 'object' && value.type === 'Feature'
}

function isLineStringFeature(feature) {
  return isFeature(feature) && feature.geometry?.type === 'LineString' && Array.isArray(feature.geometry.coordinates)
}

function collectBoundaryIndex(boundaryPayload) {
  const features = Array.isArray(boundaryPayload?.features) ? boundaryPayload.features : []
  const indexed = []

  for (const feature of features) {
    const stationId = feature?.properties?.station_id
    if (typeof stationId !== 'string' || stationId.trim() === '') {
      continue
    }

    if (!feature.geometry || feature.geometry.type !== 'LineString' || !Array.isArray(feature.geometry.coordinates)) {
      continue
    }

    indexed.push({
      stationId,
      feature,
      bbox: turfBbox(feature),
    })
  }

  return indexed
}

function bboxOverlaps(left, right) {
  return left[0] <= right[2] && left[2] >= right[0] && left[1] <= right[3] && left[3] >= right[1]
}

function boundaryStationIdsForRoad(roadFeature, boundaryIndex) {
  const intersectionStationIds = new Set()
  let intersectionCount = 0
  const roadBBox = turfBbox(roadFeature)

  for (const boundaryEntry of boundaryIndex) {
    if (!bboxOverlaps(roadBBox, boundaryEntry.bbox)) {
      continue
    }

    if (!booleanCrosses(roadFeature, boundaryEntry.feature)) {
      continue
    }

    const intersections = lineIntersect(roadFeature, boundaryEntry.feature)
    const points = Array.isArray(intersections?.features) ? intersections.features : []
    if (points.length === 0) {
      continue
    }

    intersectionStationIds.add(boundaryEntry.stationId)
    intersectionCount += points.length
  }

  return {
    crossesBoundary: intersectionCount > 0,
    intersectionCount,
    boundaryStationIds: Array.from(intersectionStationIds).sort(),
  }
}

function main() {
  const roadsPath = process.argv[2] || defaultRoadsPath
  const boundariesPath = process.argv[3] || defaultBoundariesPath
  const outputPath = process.argv[4] || defaultOutputPath
  const reportPath = process.argv[5] || defaultReportPath

  const roadsPayload = loadJson(roadsPath)
  const boundariesPayload = loadJson(boundariesPath)

  if (!roadsPayload || roadsPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${roadsPath}`)
  }

  if (!boundariesPayload || boundariesPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${boundariesPath}`)
  }

  const roads = Array.isArray(roadsPayload.features) ? roadsPayload.features : []
  const boundaryIndex = collectBoundaryIndex(boundariesPayload)
  const crossingFeatures = []
  let skippedRoads = 0
  let roadsTested = 0
  let roadsWithCrossings = 0
  let totalIntersections = 0

  for (const roadFeature of roads) {
    if (!isLineStringFeature(roadFeature)) {
      skippedRoads += 1
      continue
    }

    roadsTested += 1
    const crossingInfo = boundaryStationIdsForRoad(roadFeature, boundaryIndex)
    if (!crossingInfo.crossesBoundary) {
      continue
    }

    roadsWithCrossings += 1
    totalIntersections += crossingInfo.intersectionCount

    crossingFeatures.push({
      type: 'Feature',
      properties: {
        ...roadFeature.properties,
        crosses_voronoi_boundary: true,
        boundary_intersection_count: crossingInfo.intersectionCount,
        boundary_station_ids: crossingInfo.boundaryStationIds,
      },
      geometry: roadFeature.geometry,
    })
  }

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_roads_path: roadsPath,
      source_boundaries_path: boundariesPath,
      road_feature_count: roads.length,
      roads_tested: roadsTested,
      skipped_road_count: skippedRoads,
      crossing_road_count: roadsWithCrossings,
      total_intersection_count: totalIntersections,
      boundary_feature_count: boundaryIndex.length,
      note: 'Road features that cross at least one Voronoi cell boundary line.',
    },
    features: crossingFeatures,
  }

  saveJson(outputPath, outputValue)
  saveJson(reportPath, outputValue.metadata)

  console.log(`Tested ${roadsTested} road LineString(s) against ${boundaryIndex.length} Voronoi boundary line(s)`)
  console.log(`Found ${roadsWithCrossings} crossing road(s) with ${totalIntersections} intersection point(s)`)
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${reportPath}`)
}

main()
