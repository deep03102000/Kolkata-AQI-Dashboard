import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import kolkataRoads from '../../public/data/kolkata_roads.json'
import type { CoverageStationSummary } from './CoverageLayer'
import { getRoadLayerStyle, type RoadFeatureProperties } from './roadLayerStyle'

type RoadLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  stationSummaries?: Record<string, CoverageStationSummary>
}

const roadLayerData = kolkataRoads as FeatureCollection<Geometry, RoadFeatureProperties>

export function RoadLayer({ visible, stationColorMap = {}, stationSummaries = {} }: RoadLayerProps) {
  const map = useMap()
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom())
    handleZoom()
    map.on('zoomend', handleZoom)

    return () => {
      map.off('zoomend', handleZoom)
    }
  }, [map])

  const style = useMemo(() => {
    return (feature?: { properties?: RoadFeatureProperties }) =>
      getRoadLayerStyle(feature?.properties as RoadFeatureProperties | undefined, stationColorMap, stationSummaries, zoom)
  }, [stationColorMap, stationSummaries, zoom])

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
