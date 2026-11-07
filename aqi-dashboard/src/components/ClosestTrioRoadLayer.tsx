import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import kolkataRoads from '../../public/data/kolkata_roads.json'
import type { CoverageStationSummary } from './CoverageLayer'
import type { RoadFeatureProperties } from './roadLayerStyle'
import type { TrioStationId } from '../context/StationContext'

type RoadNetworkPayload = FeatureCollection<Geometry, RoadFeatureProperties>
type TrioStationsSelection = ReadonlySet<TrioStationId>

type TrioRoadLayerProps = {
  visible: boolean
  selectedStationIds?: TrioStationsSelection
  stationColorMap?: Record<string, string>
  stationSummaries?: Record<string, CoverageStationSummary>
  pane?: string
}

type TrioRoadStyle = {
  color: string
  weight: number
  opacity: number
  dashArray?: string
  lineCap: 'round'
  lineJoin: 'round'
}

const roadLayerData = kolkataRoads as RoadNetworkPayload
const trioRoadBaseColor = '#0f766e'
const trioRoadBaseStyle: TrioRoadStyle = {
  color: trioRoadBaseColor,
  weight: 3.5,
  opacity: 0.96,
  lineCap: 'round',
  lineJoin: 'round',
}
const trioStationIdSet = new Set<TrioStationId>(['site_5111', 'site_5126', 'site_5238'])

function hasRealColor(stationId: string, stationColorMap: Record<string, string>) {
  return typeof stationColorMap[stationId] === 'string' && stationColorMap[stationId].length > 0
}

function filterSelectedTrioStationIds(selectedStationIds: TrioStationsSelection) {
  return [...selectedStationIds].filter((stationId) => trioStationIdSet.has(stationId))
}

function filterVisibleRoadFeatures(payload: RoadNetworkPayload, selectedStationIds: TrioStationsSelection) {
  const selectedStationIdSet = new Set(filterSelectedTrioStationIds(selectedStationIds))

  return payload.features.filter((feature) => {
    const stationId = feature?.properties?.station_id as TrioStationId | undefined
    return Boolean(stationId && selectedStationIdSet.has(stationId))
  })
}

function getTrioRoadStyle(
  feature: RoadFeatureProperties | undefined,
  stationColorMap: Record<string, string>,
  stationSummaries: Record<string, CoverageStationSummary>,
  zoom = 11,
): TrioRoadStyle {
  const stationId = feature?.station_id
  const baseColor = stationId ? stationColorMap[stationId] ?? trioRoadBaseColor : trioRoadBaseColor
  const isStale = stationId ? Boolean(stationSummaries[stationId]?.stale) : false
  const zoomFactor = Math.max(0.28, Math.min(1, (zoom - 10) / 5))

  return {
    ...trioRoadBaseStyle,
    color: baseColor,
    weight: 1.15 + zoomFactor * 2.15,
    opacity: 0.26 + zoomFactor * 0.68,
    dashArray: isStale ? '5 7' : undefined,
  }
}

export function ClosestTrioRoadLayer({
  visible,
  selectedStationIds = new Set<TrioStationId>(),
  stationColorMap = {},
  stationSummaries = {},
  pane,
}: TrioRoadLayerProps) {
  const map = useMap()
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  const [zoom, setZoom] = useState(map.getZoom())

  const selectedTrioStationIds = useMemo(() => filterSelectedTrioStationIds(selectedStationIds), [selectedStationIds])
  const missingStationIds = useMemo(
    () => selectedTrioStationIds.filter((stationId) => !hasRealColor(stationId, stationColorMap)),
    [selectedTrioStationIds, stationColorMap],
  )
  const roadFeatures = useMemo(() => filterVisibleRoadFeatures(roadLayerData, selectedStationIds), [selectedStationIds])

  const canRender = visible && selectedTrioStationIds.length > 0 && missingStationIds.length === 0

  const roadFeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: roadFeatures,
    }),
    [roadFeatures],
  )

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom())
    handleZoom()
    map.on('zoomend', handleZoom)

    return () => {
      map.off('zoomend', handleZoom)
    }
  }, [map])

  const roadStyle = useMemo(() => {
    return (feature?: { properties?: RoadFeatureProperties }) =>
      getTrioRoadStyle(feature?.properties as RoadFeatureProperties | undefined, stationColorMap, stationSummaries, zoom)
  }, [stationColorMap, stationSummaries, zoom])

  if (!canRender) {
    if (missingStationIds.length > 0) {
      console.warn('[ClosestTrioRoadLayer] trio road layer skipped because required station colors are not ready', {
        missingStationIds,
      })
    }
    return null
  }

  return <GeoJSON ref={layerRef} pane={pane} data={roadFeatureCollection as any} interactive={false} style={roadStyle as any} />
}
