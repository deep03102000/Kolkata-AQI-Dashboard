import type { CoverageStationSummary } from './CoverageLayer'

export type RoadFeatureProperties = {
  station_id?: string
  name?: string
  highway?: string
}

export type RoadLayerStyle = {
  color: string
  weight: number
  opacity: number
  dashArray?: string
  lineCap: 'round'
  lineJoin: 'round'
}

const roadLayerBaseColor = '#0f766e'

const roadLayerBaseStyle: RoadLayerStyle = {
  color: roadLayerBaseColor,
  weight: 3.5,
  opacity: 0.96,
  lineCap: 'round',
  lineJoin: 'round',
}

export function blendHexWithWhite(hexColor: string, mix = 0.35) {
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

export function getRoadLayerStyle(
  feature: RoadFeatureProperties | undefined,
  stationColorMap: Record<string, string>,
  stationSummaries: Record<string, CoverageStationSummary>,
  zoom = 11,
): RoadLayerStyle {
  const stationId = feature?.station_id
  const baseColor = stationId ? stationColorMap[stationId] ?? roadLayerBaseColor : roadLayerBaseColor
  const isStale = stationId ? Boolean(stationSummaries[stationId]?.stale) : false
  const strokeColor = isStale ? blendHexWithWhite(baseColor, 0.3) : blendHexWithWhite(baseColor, -0.14)
  const zoomFactor = Math.max(0.28, Math.min(1, (zoom - 10) / 5))

  return {
    ...roadLayerBaseStyle,
    color: strokeColor,
    weight: 1.25 + zoomFactor * 2.25,
    opacity: 0.28 + zoomFactor * 0.68,
    dashArray: isStale ? '5 7' : undefined,
  }
}

