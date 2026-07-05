#!/usr/bin/env node
// Re-run this join only when the split road segments, Voronoi cells, or the station master table change.
// Phase 9.4.1 computes a midpoint for each split road segment and assigns it to the Voronoi cell that contains it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { booleanPointInPolygon, center, distance, point } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultSegmentsPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments.geojson')
const defaultVoronoiCellsPath = join(projectRoot, 'public', 'data', 'voronoi_cells.json')
const defaultStationsPath = join(projectRoot, 'public', 'data', 'station_master.json')
const defaultOutputPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments_station_join.geojson')
const defaultReportPath = join(projectRoot, 'scripts', 'output', 'road_boundary_segments_station_join.json')

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

function loadVoronoiCells(cellsPath) {
  const payload = loadJson(cellsPath)
  const features = Array.isArray(payload) ? payload : Array.isArray(payload?.features) ? payload.features : []
  const normalized = []

  for (const cell of features) {
    const stationId = cell?.station_id ?? cell?.properties?.station_id
    const stationName = cell?.station_name ?? cell?.properties?.station_name

    if (typeof stationId !== 'string' || stationId.trim() === '') {
      continue
    }

    if (!cell?.geometry || cell.geometry.type !== 'Polygon' || !Array.isArray(cell.geometry.coordinates)) {
      continue
    }

    normalized.push({
      stationId,
      stationName: typeof stationName === 'string' ? stationName : '',
      feature: {
        type: 'Feature',
        properties: {
          station_id: stationId,
          station_name: typeof stationName === 'string' ? stationName : '',
        },
        geometry: cell.geometry,
      },
    })
  }

  if (normalized.length === 0) {
    throw new Error(`No valid Voronoi cells could be loaded from ${cellsPath}`)
  }

  return normalized
}

function loadStations(stationsPath) {
  const payload = loadJson(stationsPath)
  const stations = Array.isArray(payload) ? payload : Array.isArray(payload?.features) ? payload.features : []

  const normalized = []

  for (const station of stations) {
    const stationId = station?.station_id ?? station?.properties?.station_id
    const stationName = station?.station_name ?? station?.properties?.station_name
    const latitude = Number(station?.latitude ?? station?.properties?.latitude)
    const longitude = Number(station?.longitude ?? station?.properties?.longitude)

    if (typeof stationId !== 'string' || stationId.trim() === '') {
      continue
    }

    if (typeof stationName !== 'string' || stationName.trim() === '') {
      continue
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue
    }

    normalized.push({
      stationId,
      stationName,
      latitude,
      longitude,
      feature: point([longitude, latitude], {
        station_id: stationId,
        station_name: stationName,
      }),
    })
  }

  if (normalized.length === 0) {
    throw new Error(`No valid station records could be loaded from ${stationsPath}`)
  }

  return normalized
}

function segmentMidpoint(segmentFeature) {
  // Use the full segment geometry so split polylines with interior vertices
  // are assigned from a representative point on the whole segment.
  const midpointFeature = center(segmentFeature)
  const [longitude, latitude] = midpointFeature.geometry.coordinates

  return {
    feature: midpointFeature,
    longitude,
    latitude,
  }
}

function assignNearestStation(midpointFeature, stations) {
  let bestStation = null
  let bestDistanceKm = Number.POSITIVE_INFINITY

  for (const station of stations) {
    const stationDistanceKm = distance(midpointFeature, station.feature, { units: 'kilometers' })

    if (
      stationDistanceKm < bestDistanceKm ||
      (stationDistanceKm === bestDistanceKm && bestStation && station.stationId < bestStation.stationId)
    ) {
      bestStation = station
      bestDistanceKm = stationDistanceKm
    }
  }

  if (!bestStation) {
    throw new Error('Could not assign a station to the segment midpoint')
  }

  return {
    stationId: bestStation.stationId,
    stationName: bestStation.stationName,
    distanceKm: Number(bestDistanceKm.toFixed(6)),
  }
}

function findContainingCells(midpointFeature, cells) {
  const containingCells = []

  for (const cell of cells) {
    if (booleanPointInPolygon(midpointFeature, cell.feature)) {
      containingCells.push(cell)
    }
  }

  return containingCells
}

function assignStationByCell(midpointFeature, cells, stationsById, stations) {
  const containingCells = findContainingCells(midpointFeature, cells)

  if (containingCells.length === 1) {
    const cell = containingCells[0]
    const station = stationsById.get(cell.stationId)
    const stationDistanceKm = station ? distance(midpointFeature, station.feature, { units: 'kilometers' }) : null

    return {
      stationId: cell.stationId,
      stationName: station?.stationName ?? cell.stationName ?? '',
      distanceKm: stationDistanceKm === null ? null : Number(stationDistanceKm.toFixed(6)),
      assignmentSource: 'voronoi_cell',
    }
  }

  if (containingCells.length > 1) {
    const candidateStations = containingCells
      .map((cell) => stationsById.get(cell.stationId))
      .filter((station) => station !== undefined)

    const fallbackStations = candidateStations.length > 0 ? candidateStations : stations
    const boundaryAssignment = assignNearestStation(midpointFeature, fallbackStations)

    return {
      ...boundaryAssignment,
      assignmentSource: 'boundary_line_tiebreaker',
    }
  }

  const fallbackAssignment = assignNearestStation(midpointFeature, stations)
  return {
    ...fallbackAssignment,
    assignmentSource: 'nearest_station_fallback',
  }
}

function buildJoinedFeature(segmentFeature, stationAssignment, midpointInfo) {
  return {
    type: 'Feature',
    properties: {
      ...segmentFeature.properties,
      station_id: stationAssignment.stationId,
      segment_midpoint_latitude: Number(midpointInfo.latitude.toFixed(7)),
      segment_midpoint_longitude: Number(midpointInfo.longitude.toFixed(7)),
      assigned_station_id: stationAssignment.stationId,
      assigned_station_name: stationAssignment.stationName,
      assigned_station_distance_km: stationAssignment.distanceKm,
      assigned_station_source: stationAssignment.assignmentSource,
      spatial_join_method: 'segment_midpoint_to_containing_voronoi_cell',
    },
    geometry: segmentFeature.geometry,
  }
}

function summarizeStationCounts(sortedAssignments) {
  if (sortedAssignments.length === 0) {
    return {
      minCount: 0,
      maxCount: 0,
      ratio: null,
      balanceWarning: false,
    }
  }

  const counts = sortedAssignments.map((entry) => entry.segment_count)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts)
  const ratio = minCount > 0 ? Number((maxCount / minCount).toFixed(3)) : null

  return {
    minCount,
    maxCount,
    ratio,
    balanceWarning: ratio !== null && ratio >= 3,
  }
}

function main() {
  const segmentsPath = process.argv[2] || defaultSegmentsPath
  const voronoiCellsPath = process.argv[3] || defaultVoronoiCellsPath
  const stationsPath = process.argv[4] || defaultStationsPath
  const outputPath = process.argv[5] || defaultOutputPath
  const reportPath = process.argv[6] || defaultReportPath

  const segmentsPayload = loadJson(segmentsPath)
  const cells = loadVoronoiCells(voronoiCellsPath)
  const stations = loadStations(stationsPath)
  const stationsById = new Map(stations.map((station) => [station.stationId, station]))

  if (!segmentsPayload || segmentsPayload.type !== 'FeatureCollection') {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${segmentsPath}`)
  }

  const segments = Array.isArray(segmentsPayload.features) ? segmentsPayload.features : []
  const joinedFeatures = []
  const stationCounts = new Map()
  let cellAssignments = 0
  let boundaryTieAssignments = 0
  let fallbackAssignments = 0
  const distanceValues = []
  let skippedSegments = 0

  for (const segmentFeature of segments) {
    if (!isLineStringFeature(segmentFeature)) {
      skippedSegments += 1
      continue
    }

    const midpointInfo = segmentMidpoint(segmentFeature)
    const stationAssignment = assignStationByCell(midpointInfo.feature, cells, stationsById, stations)
    const joinedFeature = buildJoinedFeature(segmentFeature, stationAssignment, midpointInfo)

    joinedFeatures.push(joinedFeature)
    if (typeof stationAssignment.distanceKm === 'number') {
      distanceValues.push(stationAssignment.distanceKm)
    }
    stationCounts.set(stationAssignment.stationId, (stationCounts.get(stationAssignment.stationId) ?? 0) + 1)
    if (stationAssignment.assignmentSource === 'voronoi_cell') {
      cellAssignments += 1
    } else if (stationAssignment.assignmentSource === 'boundary_line_tiebreaker') {
      boundaryTieAssignments += 1
    } else {
      fallbackAssignments += 1
    }
  }

  if (joinedFeatures.length === 0) {
    throw new Error(`No valid LineString segments could be joined from ${segmentsPath}`)
  }

  const sortedAssignments = Array.from(stationCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([stationId, segmentCount]) => ({ station_id: stationId, segment_count: segmentCount }))
  const stationBalance = summarizeStationCounts(sortedAssignments)

  const outputValue = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      source_segments_path: segmentsPath,
      source_cells_path: voronoiCellsPath,
      source_stations_path: stationsPath,
      source_segment_count: segments.length,
      joined_segment_count: joinedFeatures.length,
      skipped_segment_count: skippedSegments,
      cell_count: cells.length,
      station_count: stations.length,
      unique_station_assignment_count: stationCounts.size,
      voronoi_cell_assignment_count: cellAssignments,
      boundary_line_tiebreaker_count: boundaryTieAssignments,
      nearest_station_fallback_count: fallbackAssignments,
      min_assignment_distance_km: distanceValues.length > 0 ? Number(Math.min(...distanceValues).toFixed(6)) : null,
      max_assignment_distance_km: distanceValues.length > 0 ? Number(Math.max(...distanceValues).toFixed(6)) : null,
      average_assignment_distance_km:
        distanceValues.length > 0
          ? Number((distanceValues.reduce((sum, value) => sum + value, 0) / distanceValues.length).toFixed(6))
          : null,
      station_assignment_summary: sortedAssignments,
      station_assignment_min_count: stationBalance.minCount,
      station_assignment_max_count: stationBalance.maxCount,
      station_assignment_max_to_min_ratio: stationBalance.ratio,
      station_assignment_balance_warning: stationBalance.balanceWarning,
      note: 'Split road segments tagged with the Voronoi cell that contains the segment midpoint, with a nearest-station fallback for out-of-bounds midpoints and a nearest-station tiebreaker for midpoint boundary hits. Segment counts are summarized per station as a sanity check.',
    },
    features: joinedFeatures,
  }

  saveJson(outputPath, outputValue)
  saveJson(reportPath, outputValue.metadata)

  console.log(`Joined ${joinedFeatures.length} road segment(s) from ${segmentsPath}`)
  console.log(`Assigned ${cells.length} Voronoi cell(s) across ${stationCounts.size} unique station bucket(s)`)
  for (const assignment of sortedAssignments) {
    console.log(`Station ${assignment.station_id}: ${assignment.segment_count} segment(s)`)
  }
  if (stationBalance.balanceWarning) {
    console.warn(
      `Station assignment counts look skewed: min=${stationBalance.minCount}, max=${stationBalance.maxCount}, ratio=${stationBalance.ratio}`,
    )
  }
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${reportPath}`)
}

main()
