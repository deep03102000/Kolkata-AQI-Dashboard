import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Polygon, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import type { Polygon as LeafletPolygon } from 'leaflet'
import { useStationContext } from '../context/StationContext'
import { useBridgePairs } from '../hooks/useBridgePairs'
import { BRIDGE_RADIUS_KM, splitLensAtTips, type BridgePair } from '../utils/bridges'
import type { CoverageStationSummary } from './CoverageLayer'
import { bridgeLayerBaseStyle, getBridgeColor } from './bridgeLayerStyle'

type BridgeLayerProps = {
  visible: boolean
  stationColorMap?: Record<string, string>
  stationSummaries?: Readonly<Record<string, CoverageStationSummary>>
  pane?: string
}

/** Both stations' current AQI for a pair, plus which side is worse. */
function describePair(pair: BridgePair, stationSummaries: Readonly<Record<string, CoverageStationSummary>>) {
  const a = stationSummaries[pair.stationIdA]?.summary ?? null
  const b = stationSummaries[pair.stationIdB]?.summary ?? null
  const gap = a && b ? Math.abs(a.value - b.value) : null
  const worse = a && b && a.value !== b.value ? (a.value > b.value ? 'A' : 'B') : null
  return { a, b, gap, worse }
}

function StationReading({
  name,
  summary,
  color,
  worse,
}: {
  name: string
  summary: CoverageStationSummary['summary'] | null
  color: string
  worse: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {name}
      </p>
      {summary ? (
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tabular-nums text-slate-950">{summary.value}</span>
          <span className="text-[11px] font-medium" style={{ color: summary.category.color }}>
            {summary.category.label}
          </span>
          {worse ? <span className="text-[10px] font-semibold uppercase text-rose-600">worse</span> : null}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-slate-400">AQI loading…</p>
      )}
    </div>
  )
}

function BridgePopupContent({
  pair,
  stationSummaries,
  colorA,
  colorB,
  modeLabel,
}: {
  pair: BridgePair
  stationSummaries: Readonly<Record<string, CoverageStationSummary>>
  colorA: string
  colorB: string
  modeLabel: string
}) {
  const { a, b, gap, worse } = describePair(pair, stationSummaries)

  return (
    <div className="w-[230px] space-y-2.5">
      <div>
        <p className="text-[11px] font-medium text-slate-500">Station-pair bridge</p>
        <p className="text-sm font-semibold leading-5 text-slate-900">
          {pair.stationNameA} ↔ {pair.stationNameB}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StationReading name={pair.stationNameA} summary={a} color={colorA} worse={worse === 'A'} />
        <StationReading name={pair.stationNameB} summary={b} color={colorB} worse={worse === 'B'} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px]">
        <dt className="text-slate-500">Distance apart</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">{pair.distanceKm.toFixed(2)} km</dd>
        <dt className="text-slate-500">Shared area</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">{pair.overlapKm2.toFixed(2)} km²</dd>
        <dt className="text-slate-500">Of each 3 km circle</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">{(pair.overlapShare * 100).toFixed(1)}%</dd>
        <dt className="text-slate-500">AQI gap</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">{gap === null ? '—' : gap}</dd>
      </dl>

      <p className="text-[11px] leading-4 text-slate-500">
        {gap === null
          ? 'Readings for both stations are loading.'
          : gap === 0
            ? 'Both stations read the same here.'
            : gap <= 25
              ? 'Readings agree closely, so air in the shared area is likely similar.'
              : `Readings differ by ${gap}; air in the shared area likely varies between the two sides.`}{' '}
        <span className="text-slate-400">({modeLabel})</span>
      </p>
    </div>
  )
}

/**
 * Station-pair bridges (Phase 12). Draws the precomputed lens where two stations'
 * 3 km circles overlap, for every pair ≤ 6 km apart:
 * - a two-tone border split at the lens tips, each half in the nearer station's AQI colour (12.1.4)
 * - weight 5, fully opaque, no fill by default (12.1a)
 * - hover: light fill, both 3 km circles outlined, name and distance label
 * - click (or pick in the sidebar list): details popup with both stations' AQI
 * - with a station selected, its bridges stay bold and the rest fade
 */
export function BridgeLayer({ visible, stationColorMap = {}, stationSummaries = {}, pane }: BridgeLayerProps) {
  const map = useMap()
  const { selectedStationId, mode, dateRange, focusedBridge } = useStationContext()
  const { pairs } = useBridgePairs(visible)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const polygonRefs = useRef(new Map<string, LeafletPolygon>())
  const handledFocusAt = useRef<number | null>(null)

  // Geometry never changes, so split each lens once.
  const halves = useMemo(() => {
    const byKey = new Map<string, ReturnType<typeof splitLensAtTips>>()
    for (const pair of pairs ?? []) {
      byKey.set(pair.key, splitLensAtTips(pair.ring, pair.coordsA, pair.coordsB))
    }
    return byKey
  }, [pairs])

  // Sidebar list → zoom to the bridge and open its details.
  useEffect(() => {
    if (!visible || !pairs || !focusedBridge || handledFocusAt.current === focusedBridge.at) {
      return
    }
    const pair = pairs.find((candidate) => candidate.key === focusedBridge.key)
    if (!pair) {
      return
    }
    handledFocusAt.current = focusedBridge.at
    map.fitBounds(pair.bounds, { padding: [70, 70], maxZoom: 14 })
    // Open once the zoom animation has settled so the popup isn't panned away.
    map.once('moveend', () => polygonRefs.current.get(pair.key)?.openPopup())
  }, [focusedBridge, map, pairs, visible])

  if (!visible || !pairs) {
    return null
  }

  const modeLabel =
    mode === 'Historical' && dateRange.startDate && dateRange.endDate
      ? `average, ${dateRange.startDate} to ${dateRange.endDate}`
      : 'live AQI'

  return (
    <>
      {pairs.map((pair) => {
        const split = halves.get(pair.key)
        if (!split) {
          return null
        }

        const colorA = getBridgeColor(pair.stationIdA, stationColorMap)
        const colorB = getBridgeColor(pair.stationIdB, stationColorMap)
        const involvesSelected =
          !selectedStationId || pair.stationIdA === selectedStationId || pair.stationIdB === selectedStationId
        const active = hoveredKey === pair.key || openKey === pair.key
        const opacity = involvesSelected || active ? bridgeLayerBaseStyle.opacity : 0.3
        const { worse } = describePair(pair, stationSummaries)
        // Hover fill takes the worse station's colour (station A when they read the same).
        const fillColor = worse === 'B' ? colorB : colorA
        const staleA = Boolean(stationSummaries[pair.stationIdA]?.stale)
        const staleB = Boolean(stationSummaries[pair.stationIdB]?.stale)

        return (
          <Fragment key={pair.key}>
            {active ? (
              <>
                <Circle
                  center={[pair.coordsA[1], pair.coordsA[0]]}
                  radius={BRIDGE_RADIUS_KM * 1000}
                  pane={pane}
                  interactive={false}
                  pathOptions={{ color: colorA, weight: 1.5, opacity: 0.9, dashArray: '4 6', fill: false }}
                />
                <Circle
                  center={[pair.coordsB[1], pair.coordsB[0]]}
                  radius={BRIDGE_RADIUS_KM * 1000}
                  pane={pane}
                  interactive={false}
                  pathOptions={{ color: colorB, weight: 1.5, opacity: 0.9, dashArray: '4 6', fill: false }}
                />
              </>
            ) : null}

            {/* Hit area + hover fill. Practically invisible until hovered or opened. */}
            <Polygon
              ref={(layer) => {
                if (layer) {
                  polygonRefs.current.set(pair.key, layer)
                } else {
                  polygonRefs.current.delete(pair.key)
                }
              }}
              positions={pair.ring.map(([lon, lat]) => [lat, lon] as [number, number])}
              pane={pane}
              pathOptions={{
                stroke: false,
                fill: true,
                fillColor,
                fillOpacity: active ? 0.22 : 0.001,
              }}
              eventHandlers={{
                mouseover: () => setHoveredKey(pair.key),
                mouseout: () => setHoveredKey((current) => (current === pair.key ? null : current)),
                popupopen: () => setOpenKey(pair.key),
                popupclose: () => setOpenKey((current) => (current === pair.key ? null : current)),
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -6]} opacity={1}>
                <span className="text-xs">
                  <strong>
                    {pair.stationNameA} ↔ {pair.stationNameB}
                  </strong>{' '}
                  · {pair.distanceKm.toFixed(1)} km apart
                </span>
              </Tooltip>
              <Popup autoPan>
                <BridgePopupContent
                  pair={pair}
                  stationSummaries={stationSummaries}
                  colorA={colorA}
                  colorB={colorB}
                  modeLabel={modeLabel}
                />
              </Popup>
            </Polygon>

            {/* Two-tone border: each half of the lens in its nearer station's colour. */}
            <Polyline
              positions={split.nearA}
              pane={pane}
              interactive={false}
              pathOptions={{
                color: colorA,
                weight: active ? 6 : bridgeLayerBaseStyle.weight,
                opacity,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: staleA ? '6 8' : undefined,
              }}
            />
            <Polyline
              positions={split.nearB}
              pane={pane}
              interactive={false}
              pathOptions={{
                color: colorB,
                weight: active ? 6 : bridgeLayerBaseStyle.weight,
                opacity,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: staleB ? '6 8' : undefined,
              }}
            />
          </Fragment>
        )
      })}
    </>
  )
}
