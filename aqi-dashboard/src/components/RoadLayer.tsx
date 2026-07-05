import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import kolkataRoads from '../../public/data/kolkata_roads.json'
import type { CoverageStationSummary } from './CoverageLayer'

type RoadFeatureProperties = {
  station_id?: string
  name?: string
  highway?: string
}

type RoadLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  stationSummaries?: Record<string, CoverageStationSummary>
}

const roadLayerData = kolkataRoads as FeatureCollection<Geometry, RoadFeatureProperties>

function blendHexWithWhite(hexColor: string, mix = 0.35) {
  const normalized = hexColor.replace('#', '')
  if (normalized.length !== 6) {
    return hexColor
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return hexColor
  }

  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  const blend = (channel: number) => clamp(channel + (255 - channel) * mix)

  return `rgb(${blend(red)}, ${blend(green)}, ${blend(blue)})`
}

function getRoadLayerStyle(
  feature: RoadFeatureProperties | undefined,
  stationColorMap: Record<string, string>,
  stationSummaries: Record<string, CoverageStationSummary>,
) {
  const stationId = feature?.station_id
  const baseColor = stationId ? stationColorMap[stationId] ?? '#0f766e' : '#0f766e'
  const isStale = stationId ? Boolean(stationSummaries[stationId]?.stale) : false
  const strokeColor = isStale ? blendHexWithWhite(baseColor, 0.4) : baseColor

  return {
    color: strokeColor,
    weight: 2.5,
    opacity: isStale ? 0.48 : 0.8,
    dashArray: isStale ? '4 8' : undefined,
  }
}

export function RoadLayer({ visible, stationColorMap = {}, stationSummaries = {} }: RoadLayerProps) {
  const layerRef = useRef<LeafletGeoJSON | null>(null)

  const style = useMemo(() => {
    return (feature?: { properties?: RoadFeatureProperties }) =>
      getRoadLayerStyle(feature?.properties as RoadFeatureProperties | undefined, stationColorMap, stationSummaries)
  }, [stationColorMap, stationSummaries])

  useEffect(() => {
    if (!layerRef.current) {
      return
    }

    // Keep the GeoJSON source stable and repaint the existing Leaflet layer when colors change.
    layerRef.current.setStyle(style)
  }, [style])

  if (!visible) {
    return null
  }

  return (
    <GeoJSON
      ref={layerRef}
      pane="road-pane"
      data={roadLayerData as any}
      interactive={false}
      style={style as any}
    />
  )
}
