import { useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import circles3km from '../../public/data/circles_3km.json'
import closestTrioBridgePolygons from '../../public/data/closest_trio_bridge_polygons.json'
import type { CoverageStationSummary } from './CoverageLayer'
import { getBridgeStrokeStyle, type BridgeStyle } from './bridgeLayerStyle'
import type { TrioStationId } from '../context/StationContext'

type TrioBridgePolygonFeature = {
  type: 'Feature'
  properties?: {
    pair_key?: string
    station_id_a?: string
    station_id_b?: string
  }
  geometry?: unknown
}

type Circle3kmFeature = {
  type: 'Feature'
  properties?: {
    station_id?: string
    station_name?: string
  }
  geometry?: unknown
}

type TrioBridgePolygonsPayload = {
  type: 'FeatureCollection'
  features: TrioBridgePolygonFeature[]
}

type Circle3kmPayload = {
  type: 'FeatureCollection'
  features: Circle3kmFeature[]
}

type TrioStationColorMap = Readonly<Record<string, string>>
type TrioStationSummaryMap = Readonly<Record<string, CoverageStationSummary>>
type TrioStationsSelection = ReadonlySet<TrioStationId>

type ClosestTrioBridgeLayerProps = {
  visible: boolean
  selectedStationIds?: TrioStationsSelection
  stationColorMap?: TrioStationColorMap
  stationSummaries?: TrioStationSummaryMap
  pane?: string
}

const trioBridgePolygonData = closestTrioBridgePolygons as TrioBridgePolygonsPayload
const circle3kmData = circles3km as Circle3kmPayload
const trioStationIdSet = new Set<TrioStationId>(['site_5111', 'site_5126', 'site_5238'])

function hasRealColor(stationId: string, stationColorMap: TrioStationColorMap) {
  return typeof stationColorMap[stationId] === 'string' && stationColorMap[stationId].length > 0
}

function isStationStale(stationId: string | undefined, stationSummaries: TrioStationSummaryMap) {
  return stationId ? Boolean(stationSummaries[stationId]?.stale) : false
}

function getTrioStrokeStyle(
  feature: TrioBridgePolygonFeature | undefined,
  stationColorMap: TrioStationColorMap,
  stationSummaries: TrioStationSummaryMap,
  stationKey: 'station_id_a' | 'station_id_b',
  weight: number,
): BridgeStyle {
  const baseStyle = getBridgeStrokeStyle(feature, stationColorMap, stationKey, weight)
  const stationId = feature?.properties?.[stationKey]
  const stale = isStationStale(stationId, stationSummaries)

  return {
    ...baseStyle,
    opacity: stale ? 0.82 : 1,
    dashArray: stale ? '5 7' : undefined,
  }
}

function getCircleStyle(feature: Circle3kmFeature | undefined, stationColorMap: TrioStationColorMap, stationSummaries: TrioStationSummaryMap) {
  const stationId = feature?.properties?.station_id
  const color = stationId ? stationColorMap[stationId] : undefined
  const stale = isStationStale(stationId, stationSummaries)
  const resolvedColor = color ?? '#0f172a'

  return {
    color: resolvedColor,
    weight: 4.5,
    opacity: stale ? 0.82 : 1,
    fillColor: resolvedColor,
    fillOpacity: stale ? 0.42 : 0.6,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    dashArray: stale ? '5 7' : undefined,
  }
}

function filterSelectedTrioStationIds(selectedStationIds: TrioStationsSelection) {
  return [...selectedStationIds].filter((stationId) => trioStationIdSet.has(stationId))
}

function filterVisibleTrioFeatures(payload: TrioBridgePolygonsPayload, selectedStationIds: TrioStationsSelection) {
  const selectedStationIdSet = new Set(filterSelectedTrioStationIds(selectedStationIds))

  return payload.features.filter((feature) => {
    const stationIdA = feature?.properties?.station_id_a as TrioStationId | undefined
    const stationIdB = feature?.properties?.station_id_b as TrioStationId | undefined

    return Boolean(stationIdA && stationIdB && selectedStationIdSet.has(stationIdA) && selectedStationIdSet.has(stationIdB))
  })
}

function filterVisibleCircleFeatures(payload: Circle3kmPayload, selectedStationIds: TrioStationsSelection) {
  const selectedStationIdSet = new Set(filterSelectedTrioStationIds(selectedStationIds))

  return payload.features.filter((feature) => {
    const stationId = feature?.properties?.station_id as TrioStationId | undefined
    return Boolean(stationId && selectedStationIdSet.has(stationId))
  })
}

export function ClosestTrioBridgeLayer({
  visible,
  selectedStationIds = new Set<TrioStationId>(),
  stationColorMap = {},
  stationSummaries = {},
  pane,
}: ClosestTrioBridgeLayerProps) {
  const layerRefBridgeA = useRef<LeafletGeoJSON | null>(null)
  const layerRefBridgeB = useRef<LeafletGeoJSON | null>(null)
  const layerRefCircle = useRef<LeafletGeoJSON | null>(null)
  const warnedMissingColorSnapshotRef = useRef(false)

  const selectedTrioStationIds = useMemo(() => filterSelectedTrioStationIds(selectedStationIds), [selectedStationIds])
  const bridgeFeatures = useMemo(() => filterVisibleTrioFeatures(trioBridgePolygonData, selectedStationIds), [selectedStationIds])
  const circleFeatures = useMemo(() => filterVisibleCircleFeatures(circle3kmData, selectedStationIds), [selectedStationIds])
  const missingStationIds = useMemo(
    () => selectedTrioStationIds.filter((stationId) => !hasRealColor(stationId, stationColorMap)),
    [selectedTrioStationIds, stationColorMap],
  )

  const canRender = visible && selectedTrioStationIds.length > 0 && missingStationIds.length === 0
  const bridgeFeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: bridgeFeatures,
    }),
    [bridgeFeatures],
  )
  const circleFeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: circleFeatures,
    }),
    [circleFeatures],
  )

  if (!visible || selectedTrioStationIds.length === 0) {
    warnedMissingColorSnapshotRef.current = false
    return null
  }

  if (!canRender) {
    if (missingStationIds.length > 0 && !warnedMissingColorSnapshotRef.current) {
      warnedMissingColorSnapshotRef.current = true
      console.warn('[ClosestTrioBridgeLayer] trio bridge layer skipped because required station colors are not ready', {
        missingStationIds,
      })
    }
    return null
  }

  warnedMissingColorSnapshotRef.current = false

  const styleA = (feature?: TrioBridgePolygonFeature) =>
    getTrioStrokeStyle(feature, stationColorMap, stationSummaries, 'station_id_a', 5)
  const styleB = (feature?: TrioBridgePolygonFeature) =>
    getTrioStrokeStyle(feature, stationColorMap, stationSummaries, 'station_id_b', 3.5)
  const circleStyle = (feature?: Circle3kmFeature) => getCircleStyle(feature, stationColorMap, stationSummaries)

  // The trio overlays are derived directly from the current selection set so all three checked stations always resolve to the full set of trio circles and pair polygons.
  return (
    <>
      {circleFeatures.length > 0 ? (
        <GeoJSON ref={layerRefCircle} pane={pane} data={circleFeatureCollection as any} interactive={false} style={circleStyle as any} />
      ) : null}
      {bridgeFeatures.length > 0 ? (
        <>
          <GeoJSON ref={layerRefBridgeA} pane={pane} data={bridgeFeatureCollection as any} interactive={false} style={styleA as any} />
          <GeoJSON ref={layerRefBridgeB} pane={pane} data={bridgeFeatureCollection as any} interactive={false} style={styleB as any} />
        </>
      ) : null}
    </>
  )
}
