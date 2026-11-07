export type BridgeStyle = {
  color: string
  weight: number
  opacity: number
  fillColor: string
  fillOpacity: number
  lineCap: 'round'
  lineJoin: 'round'
  dashArray?: string
}

// 12.1a visibility styling: keep the bridge outlines legible with a thick, fully opaque, two-tone border treatment.
export const bridgeLayerBaseStyle: BridgeStyle = {
  color: '#0f172a',
  weight: 5,
  opacity: 1,
  fillColor: '#ffffff',
  fillOpacity: 0,
  lineCap: 'round',
  lineJoin: 'round',
}

export function getBridgeColor(stationId: string | undefined, stationColorMap: Record<string, string>) {
  if (!stationId) {
    return bridgeLayerBaseStyle.color
  }

  return stationColorMap[stationId] ?? bridgeLayerBaseStyle.color
}

export function getBridgeStrokeStyle<Feature extends { properties?: Record<string, string | undefined> }>(
  feature: Feature | undefined,
  stationColorMap: Record<string, string>,
  stationKey: string,
  weight: number,
): BridgeStyle {
  const stationId = feature?.properties?.[stationKey]
  const color = getBridgeColor(stationId, stationColorMap)

  return {
    ...bridgeLayerBaseStyle,
    color,
    weight,
  }
}
