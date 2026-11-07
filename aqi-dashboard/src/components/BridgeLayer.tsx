import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import { resolveAppUrl } from '../utils/appUrl'
import { getBridgeStrokeStyle } from './bridgeLayerStyle'

type BridgePolygonFeature = {
  type: 'Feature'
  properties?: {
    pair_key?: string
    station_id_a?: string
    station_id_b?: string
  }
  geometry?: unknown
}

type BridgePolygonsPayload = {
  type: 'FeatureCollection'
  features: BridgePolygonFeature[]
}

type BridgeLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  pane?: string
}

// 12.6.1: this layer reads the precomputed public GeoJSON, not client-side geometry output.
export function BridgeLayer({ visible, stationColorMap = {}, pane }: BridgeLayerProps) {
  const [payload, setPayload] = useState<BridgePolygonsPayload | null>(null)
  const layerRefA = useRef<LeafletGeoJSON | null>(null)
  const layerRefB = useRef<LeafletGeoJSON | null>(null)

  useEffect(() => {
    if (!visible || payload) {
      return
    }

    const controller = new AbortController()
    let active = true

    fetch(resolveAppUrl('/data/bridge_polygons.json'), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load bridge polygons: ${response.status}`)
        }

        return response.json() as Promise<BridgePolygonsPayload>
      })
      .then((data) => {
        if (active) {
          setPayload(data)
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || !active) {
          return
        }

        console.error('[BridgeLayer] Failed to load bridge polygons', error)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [payload, visible])

  const featureCollection = useMemo(() => payload, [payload])
  const styleA = useMemo(() => {
    return (feature?: BridgePolygonFeature) =>
      getBridgeStrokeStyle(feature, stationColorMap, 'station_id_a', 5)
  }, [stationColorMap])
  const styleB = useMemo(() => {
    return (feature?: BridgePolygonFeature) =>
      getBridgeStrokeStyle(feature, stationColorMap, 'station_id_b', 3.5)
  }, [stationColorMap])

  useEffect(() => {
    if (layerRefA.current) {
      layerRefA.current.setStyle(styleA as any)
    }
    if (layerRefB.current) {
      layerRefB.current.setStyle(styleB as any)
    }
  }, [styleA, styleB])

  if (!visible || !featureCollection) {
    return null
  }

  return (
    <>
      <GeoJSON ref={layerRefA} pane={pane} data={featureCollection as any} interactive={false} style={styleA as any} />
      <GeoJSON ref={layerRefB} pane={pane} data={featureCollection as any} interactive={false} style={styleB as any} />
    </>
  )
}

