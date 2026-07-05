#!/usr/bin/env node
// Re-run this splitter only when the road layer, the Voronoi boundaries, or the crossing report change.
// Phase 9.3.3 splits boundary-crossing roads at the relevant Voronoi cell edges.
// Phase 9.3.4 keeps roads that do not cross any boundary as a single unchanged segment.
// Phase 9.3.5 validates the resulting segment counts and writes a small spot-check set for manual inspection.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { length, lineSplit } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultRoadsPath = join(projectRoot, 'public', 'data', 'road_network_linestrings_simplified.geojson')
const defaultBoundariesPath = join(projectRoot, 'scripts', 'output', 'voronoi_cell_boundaries.geojson')
const defaultCrossingsPath = join(projectRoot, 'scripts', 'output', 'road_boundary_crossings.geojson')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments.geojson')
const defaultReportPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments.json')
const defaultSpotCheckPath = join(projectRoot, 'scripts', 'output', 'road_boundary_split_spotcheck.geojson')
const defaultSpotCheckReportPath = join(projectRoot, 'scripts', 'output', 'road_boundary_split_spotcheck.json')
const segmentLengthToleranceKm = 0.01
const spotCheckRoadLimit = 5

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
    const polygonIndex = Number(feature?.properties?.polygon_index ?? 0)
    const ringIndex = Number(feature?.properties?.ring_index ?? 0)

    if (typeof stationId !== 'string' || stationId.trim() === '') {
      continue
    }

    if (!feature.geometry || feature.geometry.type !== 'LineString' || !Array.isArray(feature.geometry.coordinates)) {
      continue
    }

    indexed.push({
      stationId,
      polygonIndex: Number.isFinite(polygonIndex) ? polygonIndex : 0,
      ringIndex: Number.isFinite(ringIndex) ? ringIndex : 0,
      feature,
    })
  }

  return indexed
}

function collectCrossingMap(crossingsPayload) {
  const features = Array.isArray(crossingsPayload?.features) ? crossingsPayload.features : []
  const map = new Map()

  for (const feature of features) {
    if (!isLineStringFeature(feature)) {
      continue
    }

    const osmId = feature?.properties?.osm_id
    if (typeof osmId !== 'number' && typeof osmId !== 'string') {
      continue
    }

    map.set(String(osmId), feature)
  }

  return map
}

function getRoadId(feature) {
  return String(feature?.properties?.osm_id ?? '')
}

function lineLengthKm(feature) {
  return Number(length(feature, { units: 'kilometers' }).toFixed(6))
}

function splitRoadWithBoundaries(roadFeature, boundaryFeatures) {
  let segments = [roadFeature]

  for (const boundaryFeature of boundaryFeatures) {
    const nextSegments = []

    for (const segment of segments) {
      const splitResult = lineSplit(segment, boundaryFeature)
      const splitSegments = Array.isArray(splitResult?.features) && splitResult.features.length > 0 ? splitResult.features : [segment]
      nextSegments.push(...splitSegments)
    }

    segments = nextSegments
  }

  return segments
}

function buildUnchangedSegment(roadFeature) {
  return {
    type: 'Feature',
    properties: {
      ...roadFeature.properties,
      boundary_split_applied: false,
      segment_index: 0,
      segment_count: 1,
      segment_kind: 'unchanged',
    },
    geometry: roadFeature.geometry,
  }
}

function buildSplitSegments(roadFeature, crossingFeature, boundaryIndex) {
  const boundaryStationIds = Array.isArray(crossingFeature?.properties?.boundary_station_ids)
    ? crossingFeature.properties.boundary_station_ids.filter((value) => typeof value === 'string' && value.trim() !== '')
    : []
  const boundaryIdSet = new Set(boundaryStationIds)
  const relevantBoundaries = boundaryIndex.filter((entry) => boundaryIdSet.has(entry.stationId))

  if (relevantBoundaries.length === 0) {
    return [buildUnchangedSegment(roadFeature)]
  }

  const splitSegments = splitRoadWithBoundaries(roadFeature, relevantBoundaries.map((entry) => entry.feature))
  const totalSegments = splitSegments.length

  return splitSegments.map((segment, index) => ({
    type: 'Feature',
    properties: {
      ...roadFeature.properties,
      boundary_split_applied: true,
      segment_index: index,
      segment_count: totalSegments,
      segment_kind: 'split',
      boundary_intersection_count: crossingFeature?.properties?.boundary_intersection_count ?? relevantBoundaries.length,
      boundary_station_ids: boundaryStationIds,
    },
    geometry: segment.geometry,
  }))
}

function buildSpotCheckCollection(roadStatsById, selectedRoadIds) {
  const features = []

  for (const roadId of selectedRoadIds) {
    const stats = roadStatsById.get(roadId)
    if (!stats) {
      continue
    }

    features.push({
      type: 'Feature',
      properties: {
        ...stats.sourceFeature.properties,
        inspection_role: 'source_road',
        inspection_road_id: roadId,
        expected_segment_count: stats.expectedSegmentCount,
        actual_segment_count: stats.actualSegmentCount,
        source_length_km: stats.sourceLengthKm,
        segment_length_km: stats.segmentLengthKm,
      },
      geometry: stats.sourceFeature.geometry,
    })

    for (const segment of stats.segments) {
      features.push({
        ...segment,
        properties: {
          ...segment.properties,
          inspection_role: 'split_segment',
          inspection_road_id: roadId,
        },
      })
    }
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      note: 'Use this small sample to visually inspect split roads for gaps or duplicate overlaps.',
      selected_road_count: selectedRoadIds.length,
      selected_road_ids: selectedRoadIds,
    },
    features,
  }
}

function main() {
  const roadsPath = process.argv[2] || defaultRoadsPath
  const boundariesPath = process.argv[3] || defaultBoundariesPath
  const crossingsPath = process.argv[4] || defaultCrossingsPath
  const outputPath = process.argv[5] || defaultOutputPath
  const reportPath = process.argv[6] || defaultReportPath
  const spotCheckPath = process.argv[7] || defaultSpotCheckPath
  const spotCheckReportPath = process.argv[8] || defaultSpotCheckReportPath

  const roadsPayload = loadJson(roadsPath)
  const boundariesPayload = loadJson(boundariesPath)
  const crossingsPayload = loadJson(crossingsPath)

  if (!roadsPayload || roadsPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${roadsPath}`)
  }

  if (!boundariesPayload || boundariesPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${boundariesPath}`)
  }

  if (!crossingsPayload || crossingsPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${crossingsPath}`)
  }

  const roads = Array.isArray(roadsPayload.features) ? roadsPayload.features : []
  const boundaryIndex = collectBoundaryIndex(boundariesPayload)
  const crossingMap = collectCrossingMap(crossingsPayload)
  const segments = []
  const roadStatsById = new Map()
  let skippedRoads = 0
  let roadsProcessed = 0
  let roadsSplit = 0
  let unchangedRoads = 0
  let totalSegments = 0

  for (const roadFeature of roads) {
    if (!isLineStringFeature(roadFeature)) {
      skippedRoads += 1
      continue
    }

    roadsProcessed += 1
    const roadKey = getRoadId(roadFeature)
    const crossingFeature = crossingMap.get(roadKey)
    const sourceLengthKm = lineLengthKm(roadFeature)

    if (!crossingFeature) {
      const unchangedSegment = buildUnchangedSegment(roadFeature)
      segments.push(unchangedSegment)
      unchangedRoads += 1
      totalSegments += 1
      roadStatsById.set(roadKey, {
        sourceFeature: roadFeature,
        segments: [unchangedSegment],
        sourceLengthKm,
        segmentLengthKm: lineLengthKm(unchangedSegment),
        expectedSegmentCount: 1,
        actualSegmentCount: 1,
        splitApplied: false,
      })
      continue
    }

    const roadSegments = buildSplitSegments(roadFeature, crossingFeature, boundaryIndex)
    if (roadSegments.length === 1 && roadSegments[0].properties.segment_kind === 'unchanged') {
      unchangedRoads += 1
    } else {
      roadsSplit += 1
    }

    segments.push(...roadSegments)
    totalSegments += roadSegments.length
    roadStatsById.set(roadKey, {
      sourceFeature: roadFeature,
      segments: roadSegments,
      sourceLengthKm,
      segmentLengthKm: Number(roadSegments.reduce((sum, segment) => sum + lineLengthKm(segment), 0).toFixed(6)),
      expectedSegmentCount: roadSegments[0]?.properties?.segment_count ?? roadSegments.length,
      actualSegmentCount: roadSegments.length,
      splitApplied: true,
    })
  }

  const lengthMismatches = []
  const segmentCountMismatches = []
  const splitRoadStats = []

  for (const [roadId, stats] of roadStatsById.entries()) {
    if (stats.actualSegmentCount !== stats.expectedSegmentCount) {
      segmentCountMismatches.push({
        road_id: roadId,
        expected_segment_count: stats.expectedSegmentCount,
        actual_segment_count: stats.actualSegmentCount,
      })
    }

    const lengthDifferenceKm = Math.abs(stats.segmentLengthKm - stats.sourceLengthKm)
    if (lengthDifferenceKm > segmentLengthToleranceKm) {
      lengthMismatches.push({
        road_id: roadId,
        source_length_km: stats.sourceLengthKm,
        segment_length_km: stats.segmentLengthKm,
        length_difference_km: Number(lengthDifferenceKm.toFixed(6)),
      })
    }

    if (stats.splitApplied) {
      splitRoadStats.push({
        road_id: roadId,
        segment_count: stats.actualSegmentCount,
        source_length_km: stats.sourceLengthKm,
        segment_length_km: stats.segmentLengthKm,
        length_difference_km: Number(lengthDifferenceKm.toFixed(6)),
      })
    }
  }

  if (segmentCountMismatches.length > 0) {
    throw new Error(
      `Segment count validation failed for ${segmentCountMismatches.length} road(s): ${segmentCountMismatches
        .slice(0, 5)
        .map((entry) => `${entry.road_id} expected ${entry.expected_segment_count} got ${entry.actual_segment_count}`)
        .join('; ')}`
    )
  }

  if (lengthMismatches.length > 0) {
    throw new Error(
      `Length validation failed for ${lengthMismatches.length} road(s) beyond ${segmentLengthToleranceKm} km tolerance: ${lengthMismatches
        .slice(0, 5)
        .map((entry) => `${entry.road_id} diff ${entry.length_difference_km} km`)
        .join('; ')}`
    )
  }

  splitRoadStats.sort((left, right) => right.segment_count - left.segment_count || right.source_length_km - left.source_length_km)
  const selectedRoadIds = splitRoadStats.slice(0, spotCheckRoadLimit).map((entry) => entry.road_id)
  const spotCheckCollection = buildSpotCheckCollection(roadStatsById, selectedRoadIds)

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_roads_path: roadsPath,
      source_boundaries_path: boundariesPath,
      source_crossings_path: crossingsPath,
      road_feature_count: roads.length,
      roads_processed: roadsProcessed,
      skipped_road_count: skippedRoads,
      split_road_count: roadsSplit,
      unchanged_road_count: unchangedRoads,
      output_segment_count: totalSegments,
      boundary_feature_count: boundaryIndex.length,
      segment_count_mismatch_count: segmentCountMismatches.length,
      length_mismatch_count: lengthMismatches.length,
      length_tolerance_km: segmentLengthToleranceKm,
      spotcheck_road_count: selectedRoadIds.length,
      spotcheck_road_ids: selectedRoadIds,
      note: 'Road segments split at Voronoi boundaries, with untouched roads carried through unchanged.',
    },
    features: segments,
  }

  saveJson(outputPath, outputValue)
  saveJson(reportPath, outputValue.metadata)
  saveJson(spotCheckPath, spotCheckCollection)
  saveJson(
    spotCheckReportPath,
    {
      generated_at: outputValue.metadata.generated_at,
      source_segments_path: outputPath,
      segment_count_mismatch_count: segmentCountMismatches.length,
      length_mismatch_count: lengthMismatches.length,
      length_tolerance_km: segmentLengthToleranceKm,
      selected_road_count: selectedRoadIds.length,
      selected_road_ids: selectedRoadIds,
      note: 'Open this GeoJSON alongside the road layer to visually inspect a few split roads for gaps or duplicates.',
    },
  )

  console.log(`Processed ${roadsProcessed} road LineString(s)`)
  console.log(`Split ${roadsSplit} crossing road(s) and preserved ${unchangedRoads} unchanged road(s)`)
  console.log(`Validated segment counts and lengths for ${roadStatsById.size} road(s)`)
  console.log(`Wrote ${spotCheckPath}`)
  console.log(`Wrote ${spotCheckReportPath}`)
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${reportPath}`)
}

main()