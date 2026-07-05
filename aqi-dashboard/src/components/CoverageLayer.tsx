import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GeoJSON as LeafletGeoJSON } from 'leaflet'
import voronoiCells from '../../public/data/voronoi_cells.json'
import { StationSummaryCard } from './StationPopupContent'
import type { AqiSummary } from '../utils/aqi'

type CoverageFeature = {
  properties?: {
    station_id?: string
  }
}

export type CoverageStationSummary = {
  station: {
    station_id: string
    station_name: string
  }
  summary: AqiSummary
  stale?: boolean
}

type CoverageLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  stationSummaries?: Record<string, CoverageStationSummary>
}

function blendHexWithWhite(hexColor: string, mix = 0.45) {
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

function getCoverageStyle(
  feature?: CoverageFeature,
  stationColorMap?: Record<string, string>,
  stationSummaries?: Record<string, CoverageStationSummary>,
) {
  const stationId = feature?.properties?.station_id
  const baseColor = stationId ? stationColorMap?.[stationId] ?? '#38bdf8' : '#38bdf8'
  const isStale = stationId ? Boolean(stationSummaries?.[stationId]?.stale) : false
  const strokeColor = isStale ? blendHexWithWhite(baseColor, 0.3) : baseColor
  const fillColor = isStale ? blendHexWithWhite(baseColor, 0.5) : baseColor

  return {
    fillColor,
    color: strokeColor,
    weight: 1,
    fillOpacity: isStale ? 0.05 : 0.08,
    opacity: isStale ? 0.72 : 0.95,
  }
}

function renderCoveragePopup(stationSummary: CoverageStationSummary) {
  return renderToStaticMarkup(
    <div className="space-y-2">
      {stationSummary.stale ? (
        <div className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
          <span className="truncate">Stale live data</span>
        </div>
      ) : null}
      <StationSummaryCard station={stationSummary.station} summary={stationSummary.summary} />
    </div>,
  )
}

function syncCoveragePopupContent(layer: any, feature: CoverageFeature | undefined, stationSummaries: Record<string, CoverageStationSummary>) {
  const stationId = feature?.properties?.station_id
  if (!stationId) {
    return
  }

  const stationSummary = stationSummaries[stationId]
  if (!stationSummary) {
    layer.unbindTooltip?.()
    layer.unbindPopup?.()
    return
  }

  const popupMarkup = renderCoveragePopup(stationSummary)
  layer.bindTooltip(popupMarkup, {
    direction: 'center',
    sticky: true,
    opacity: 0.96,
    className: 'coverage-cell-tooltip',
  })
  layer.bindPopup(popupMarkup, {
    autoPan: false,
    closeButton: false,
    className: 'coverage-cell-popup',
  })
}

export function CoverageLayer({
  visible,
  stationColorMap = {},
  stationSummaries = {},
}: CoverageLayerProps) {
  const layerRef = useRef<LeafletGeoJSON | null>(null)

  const style = useMemo(() => {
    return (feature?: CoverageFeature) => getCoverageStyle(feature, stationColorMap, stationSummaries)
  }, [stationColorMap, stationSummaries])

  useEffect(() => {
    if (!layerRef.current) {
      return
    }

    // Keep the GeoJSON source stable and repaint the existing Leaflet layer when colors change.
    layerRef.current.setStyle(style)
  }, [style])

  useEffect(() => {
    if (!layerRef.current) {
      return
    }

    layerRef.current.eachLayer((layer: any) => {
      syncCoveragePopupContent(layer, layer.feature as CoverageFeature | undefined, stationSummaries)
    })
  }, [stationSummaries])

  if (!visible) {
    return null
  }

  return (
    <GeoJSON
      ref={layerRef}
      data={voronoiCells as any}
      interactive={true}
      style={style as any}
      onEachFeature={(feature, layer) => {
        syncCoveragePopupContent(layer, feature as CoverageFeature | undefined, stationSummaries)
      }}
    />
  )
}
