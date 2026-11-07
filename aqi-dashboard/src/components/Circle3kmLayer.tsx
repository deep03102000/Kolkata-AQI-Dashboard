import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import circles3km from '../../public/data/circles_3km.json'

type Circle3kmFeature = {
  type: 'Feature'
  properties?: {
    station_id?: string
    station_name?: string
  }
  geometry?: unknown
}

type Circle3kmPayload = {
  type: 'FeatureCollection'
  features: Circle3kmFeature[]
}

const circle3kmData = circles3km as Circle3kmPayload
type Circle3kmLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  pane?: string
}

type Circle3kmStyle = {
  color: string
  weight: number
  opacity: number
  fillColor: string
  fillOpacity: number
  lineCap: 'round'
  lineJoin: 'round'
}

// 12.6.3: this layer reads the precomputed public GeoJSON, so the 3 km circles stay static until station coordinates change.
const circle3kmBaseStyle: Circle3kmStyle = {
  color: '#0f172a',
  weight: 4.5,
  opacity: 1,
  fillColor: '#94a3b8',
  fillOpacity: 0.6,
  lineCap: 'round',
  lineJoin: 'round',
}

function getCircleColor(stationId: string | undefined, stationColorMap: Record<string, string>) {
  if (!stationId) {
    return circle3kmBaseStyle.color
  }

  return stationColorMap[stationId] ?? circle3kmBaseStyle.color
}

// 12.7.2: reuse the shared station_id -> color map so the 3 km fills stay in sync with current AQI colors.
function getCircleStyle(feature: Circle3kmFeature | undefined, stationColorMap: Record<string, string>): Circle3kmStyle {
  const stationId = feature?.properties?.station_id
  const color = getCircleColor(stationId, stationColorMap)

  return {
    ...circle3kmBaseStyle,
    color,
    fillColor: color,
  }
}

export function Circle3kmLayer({ visible, stationColorMap = {}, pane }: Circle3kmLayerProps) {
  const layerRef = useRef<LeafletGeoJSON | null>(null)

  const style = useMemo(() => {
    return (feature?: Circle3kmFeature) => getCircleStyle(feature, stationColorMap)
  }, [stationColorMap])

  useEffect(() => {
    if (!layerRef.current) {
      return
    }

    layerRef.current.setStyle(style)
  }, [style])

  if (!visible) {
    return null
  }

  return <GeoJSON ref={layerRef} data={circle3kmData as any} interactive={false} pane={pane} style={style as any} />
}





