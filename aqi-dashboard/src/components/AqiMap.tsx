import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import { useStationContext } from '../context/StationContext'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { useRoadNetworkPayload } from '../hooks/useRoadNetworkPayload'
import { getAqiColor, getStationAqiSummary, type AqiSummary } from '../utils/aqi'
import { resolveAppUrl } from '../utils/appUrl'
import { getLiveWaqiSummary, type WaqiLiveStationData } from '../utils/waqi'
import type { CoverageStationSummary } from './CoverageLayer'

import { StationPopupContent } from './StationPopupContent'
import 'leaflet/dist/leaflet.css'

const LeafletMapContainer = MapContainer as unknown as ComponentType<any>
const LeafletTileLayer = TileLayer as unknown as ComponentType<any>
const LeafletMarker = Marker as unknown as ComponentType<any>
const LeafletPopup = Popup as unknown as ComponentType<any>
const LeafletCircle = Circle as unknown as ComponentType<any>
const CoverageLayer = lazy(() => import('./CoverageLayer').then((module) => ({ default: module.CoverageLayer })))
const LazyCircle3kmLayer = lazy(() => import('./Circle3kmLayer').then((module) => ({ default: module.Circle3kmLayer })))
const LazyRoadLayer = lazy(() => import('./RoadLayer').then((module) => ({ default: module.RoadLayer })))
const LazyBridgeLayer = lazy(() => import('./BridgeLayer').then((module) => ({ default: module.BridgeLayer })))
const LazyClosestTrioBridgeLayer = lazy(() => import('./ClosestTrioBridgeLayer').then((module) => ({ default: module.ClosestTrioBridgeLayer })))
const LazyClosestTrioRoadLayer = lazy(() => import('./ClosestTrioRoadLayer').then((module) => ({ default: module.ClosestTrioRoadLayer })))

function LayerLoadingFallback({ label }: { label: string }) {
  return (
    <div className="pointer-events-none flex justify-center p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/60">
        <div className="h-4 w-4 animate-pulse rounded-full bg-slate-200/80" />
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-2.5 w-40 animate-pulse rounded-full bg-slate-100" />
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
      </div>
    </div>
  )
}

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

type StationMarkerRef = {
  openPopup: () => void
}

const kolkataCenter: [number, number] = [22.5726, 88.3639]

function RoadPane() {
  const map = useMap()

  useEffect(() => {
    if (map.getPane('road-pane')) {
      return
    }

    const pane = map.createPane('road-pane')
    pane.style.zIndex = '450'
  }, [map])

  return null
}


function LayerPanes() {
  const map = useMap()

  useEffect(() => {
    if (!map.getPane('circle3km-pane')) {
      const circlePane = map.createPane('circle3km-pane')
      circlePane.style.zIndex = '390'
    }

    if (!map.getPane('bridge-pane')) {
      const bridgePane = map.createPane('bridge-pane')
      bridgePane.style.zIndex = '410'
    }

    if (!map.getPane('bridge-trio-pane')) {
      const bridgeTrioPane = map.createPane('bridge-trio-pane')
      bridgeTrioPane.style.zIndex = '420'
    }

    if (!map.getPane('bridge-trio-road-pane')) {
      const bridgeTrioRoadPane = map.createPane('bridge-trio-road-pane')
      bridgeTrioRoadPane.style.zIndex = '455'
    }
  }, [map])

  return null
}

function toPopupLiveData(station: StationGeo, liveData: ReturnType<typeof useLiveAqi>['data']): WaqiLiveStationData | null {
  if (!liveData || liveData.aqi === null) {
    return null
  }

  return {
    aqi: liveData.aqi,
    idx: liveData.stationUid,
    cityName: liveData.cityName ?? liveData.stationName,
    cityUrl: liveData.cityUrl,
    dominantPollutant: liveData.dominantPollutant,
    updatedAt: liveData.updatedAt,
    pollutants: liveData.pollutants,
    nearbySensor: liveData.nearbySensor,
    cpcbStation: liveData.cpcbStation,
    raw: liveData.raw ?? {
      aqi: liveData.aqi,
      idx: liveData.stationUid ?? undefined,
      iaqi: {},
      city: {
        name: liveData.cityName ?? liveData.stationName ?? station.station_name,
        url: liveData.cityUrl ?? undefined,
      },
      dominentpol: liveData.dominantPollutant ?? undefined,
      time: liveData.updatedAt ? { s: liveData.updatedAt } : undefined,
    },
  }
}

function MapSelectionFollower({
  stations,
  markerRefs,
}: {
  stations: StationGeo[]
  markerRefs: React.MutableRefObject<Map<string, StationMarkerRef | null>>
}) {
  const { selectedStationId } = useStationContext()
  const map = useMap()
  const moveEndRef = useRef<(() => void) | null>(null)
  const popupTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!selectedStationId) {
      return
    }

    const station = stations.find((entry) => entry.station_id === selectedStationId)
    if (!station) {
      return
    }

    if (moveEndRef.current) {
      map.off('moveend', moveEndRef.current)
      moveEndRef.current = null
    }
    if (popupTimeoutRef.current !== null) {
      window.clearTimeout(popupTimeoutRef.current)
      popupTimeoutRef.current = null
    }

    map.stop()

    const openSelectedPopup = () => {
      markerRefs.current.get(selectedStationId)?.openPopup()
    }

    moveEndRef.current = openSelectedPopup
    map.once('moveend', openSelectedPopup)
    map.flyTo([station.latitude, station.longitude], 13, {
      animate: true,
      duration: 1.45,
      easeLinearity: 0.25,
    })

    popupTimeoutRef.current = window.setTimeout(() => {
      markerRefs.current.get(selectedStationId)?.openPopup()
    }, 1550)

    return () => {
      if (moveEndRef.current) {
        map.off('moveend', moveEndRef.current)
        moveEndRef.current = null
      }
      if (popupTimeoutRef.current !== null) {
        window.clearTimeout(popupTimeoutRef.current)
        popupTimeoutRef.current = null
      }
    }
  }, [map, markerRefs, selectedStationId, stations])

  return null
}

function StationOverlay({
  station,
  registerMarker,
  registerCoverageSummary,
}: {
  station: StationGeo
  registerMarker: (stationId: string, marker: StationMarkerRef | null) => void
  registerCoverageSummary: (stationId: string, stationSummary: CoverageStationSummary | null) => void
}) {
  const { selectedStationId, setSelectedStationId, mode, dateRange, coverageMode } = useStationContext()
  const { data: liveData, loading: liveLoading, error: liveError, stale: liveStale } = useLiveAqi(station.station_id, true)
  const { data: historicalData } = useStationHistory(mode === 'Historical' ? station.station_id : null)
  const lastKnownLiveSummaryRef = useRef<AqiSummary | null>(null)

  const popupLiveData = useMemo(() => toPopupLiveData(station, liveData), [station, liveData])

  const liveSummary = useMemo(() => {
    return popupLiveData ? getLiveWaqiSummary(popupLiveData) : null
  }, [popupLiveData])

  const historicalSummary = useMemo(() => {
    return historicalData ? getStationAqiSummary(historicalData.records, 'Historical', dateRange) : null
  }, [dateRange, historicalData])

  useEffect(() => {
    if (liveSummary) {
      lastKnownLiveSummaryRef.current = liveSummary
    }
  }, [liveSummary])

  // 12.7.3/12.7.4: Live-mode coverage summaries and Historical date-range summaries both keep feeding the memoized color map, so the bridge and 3 km fills repaint with fresh AQI values.
  const coverageSummary =
    mode === 'Historical' ? historicalSummary : liveSummary ?? lastKnownLiveSummaryRef.current
  const coverageIsStale =
    mode === 'Live' && (liveStale || (!liveSummary && Boolean(lastKnownLiveSummaryRef.current)))

  const isSelected = selectedStationId === station.station_id
  const isLiveMode = mode === 'Live'
  const circleColor = coverageSummary ? getAqiColor(coverageSummary.value) : '#94a3b8'
  const circleStyle = {
    color: circleColor,
    fillColor: circleColor,
    fillOpacity: isSelected ? (coverageIsStale ? 0.2 : 0.34) : coverageIsStale ? 0.16 : 0.26,
    weight: isSelected ? (isLiveMode ? 5 : 4) : isLiveMode ? 3.75 : 2.5,
    opacity: coverageIsStale ? 0.75 : isLiveMode ? 1 : 0.95,
    dashArray: coverageIsStale ? '4 8' : '6 8',
  }
  const popupLoading = liveLoading
  const popupError = Boolean(liveError)

  useEffect(() => {
    registerCoverageSummary(
      station.station_id,
      coverageSummary
        ? {
            station: {
              station_id: station.station_id,
              station_name: station.station_name,
            },
            summary: coverageSummary,
            stale: coverageIsStale,
          }
        : null,
    )

    return () => {
      registerCoverageSummary(station.station_id, null)
    }
  }, [coverageIsStale, coverageSummary, registerCoverageSummary, station.station_id, station.station_name])

  return (
    <>
      {coverageMode === 'circles' ? (
        <LeafletCircle
          center={[station.latitude, station.longitude]}
          radius={1000}
          pathOptions={circleStyle}
        />
      ) : null}
      <LeafletMarker
        position={[station.latitude, station.longitude]}
        icon={stationMarkerIcon}
        ref={(marker: StationMarkerRef | null) => registerMarker(station.station_id, marker)}
        eventHandlers={{
          click: () => {
            setSelectedStationId(station.station_id)
          },
          popupopen: () => {
            setSelectedStationId(station.station_id)
          },
        }}
      >
        <LeafletPopup autoPan={false}>
          <StationPopupContent
            station={station}
            liveData={popupLiveData}
            liveLoading={popupLoading}
            liveError={popupError}
            liveStale={liveStale}
            historicalSummary={mode === 'Historical' ? historicalSummary : undefined}
          />
        </LeafletPopup>
      </LeafletMarker>
    </>
  )
}

const stationMarkerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** False until `flag` is first true, then true for good (used to defer heavy layers). */
function useStaysTrue(flag: boolean) {
  const [latched, setLatched] = useState(flag)
  useEffect(() => {
    if (flag) {
      setLatched(true)
    }
  }, [flag])
  return latched || flag
}

export function AqiMap() {
  const [stations, setStations] = useState<StationGeo[]>([])
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [showRoadNetwork, setShowRoadNetwork] = useState(false)
  const { mode, coverageMode, showCircle3km, showBridgePolygons, selectedTrioStations } = useStationContext()
  const { data: roadNetwork, status: roadNetworkStatus } = useRoadNetworkPayload(null, showRoadNetwork)
  const roadLayerRequested = useStaysTrue(showRoadNetwork)
  const circleLayerRequested = useStaysTrue(showCircle3km)
  const bridgeLayerRequested = useStaysTrue(showBridgePolygons)
  const trioLayersRequested = useStaysTrue(selectedTrioStations.size > 0)
  const markerRefs = useRef<Map<string, StationMarkerRef | null>>(new Map())
  const stationColorMapRecomputeCount = useRef(0)
  const [coverageSummaries, setCoverageSummaries] = useState<Record<string, CoverageStationSummary>>({})

  // 12.7.1: this memoized station_id -> color map feeds both the circle layers and the bridge borders, and it is passed read-only into the trio bridge layer too.
  const stationColorMap = useMemo(() => {
    return Object.values(coverageSummaries).reduce<Record<string, string>>((lookup, stationSummary) => {
      lookup[stationSummary.station.station_id] = getAqiColor(stationSummary.summary.value)
      return lookup
    }, {})
  }, [coverageSummaries])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    stationColorMapRecomputeCount.current += 1
    console.debug('[AqiMap] stationColorMap recomputed', {
      count: stationColorMapRecomputeCount.current,
      stationCount: Object.keys(stationColorMap).length,
    })
  }, [stationColorMap])

  const registerCoverageSummary = useMemo(() => {
    return (stationId: string, stationSummary: CoverageStationSummary | null) => {
      setCoverageSummaries((current) => {
        if (!stationSummary) {
          if (!(stationId in current)) {
            return current
          }

          const next = { ...current }
          delete next[stationId]
          return next
        }

        return {
          ...current,
          [stationId]: stationSummary,
        }
      })
    }
  }, [])

  useEffect(() => {
    let active = true

    fetch(resolveAppUrl('/data/station_master.json'))
      .then((response) => response.json() as Promise<StationGeo[]>)
      .then((data) => {
        if (active) {
          setStations(data)
        }
      })
      .catch(() => {
        if (active) {
          setStations([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  const registerMarker = useMemo(
    () => (stationId: string, marker: StationMarkerRef | null) => {
      if (marker) {
        markerRefs.current.set(stationId, marker)
        return
      }

      markerRefs.current.delete(stationId)
    },
    [],
  )

  const stationOverlays = useMemo(
    () => stations.map((station) => <StationOverlay key={station.station_id} station={station} registerMarker={registerMarker} registerCoverageSummary={registerCoverageSummary} />),
    [registerMarker, stations],
  )

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Map</h2>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setShowVoronoi((current) => !current)}
            aria-pressed={showVoronoi}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${showVoronoi ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            Zones
          </button>
          <button
            type="button"
            onClick={() => setShowRoadNetwork((current) => !current)}
            disabled={roadNetworkStatus === 'loading'}
            aria-pressed={showRoadNetwork}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 ${showRoadNetwork && roadNetwork ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            {roadNetworkStatus === 'loading' && showRoadNetwork
              ? 'Loading roads…'
              : roadNetworkStatus === 'error'
                ? 'Roads unavailable'
                : 'Roads'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl">
        <LeafletMapContainer
          center={kolkataCenter}
          zoom={11}
          scrollWheelZoom={true}
          className="h-[300px] w-full sm:h-[460px] xl:h-[520px]"
        >
          <LeafletTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RoadPane />
          <LayerPanes />
          <MapSelectionFollower stations={stations} markerRefs={markerRefs} />
          <Suspense fallback={<LayerLoadingFallback label="Coverage" />}>
            {coverageMode === 'voronoi' ? (
              <CoverageLayer
                visible={showVoronoi}
                mode={mode}
                roadNetworkVisible={showRoadNetwork}
                stationColorMap={stationColorMap}
                stationSummaries={coverageSummaries}
              />
            ) : null}
          </Suspense>
          {/*
            Optional layers mount the first time they are switched on (and then stay
            mounted, so toggling is instant). The road layers pull in the full road
            network (~16 MB raw), so they must not load while hidden.
          */}
          <Suspense fallback={<LayerLoadingFallback label="Roads" />}>
            {coverageMode === 'voronoi' && roadLayerRequested ? (
              <LazyRoadLayer visible={showRoadNetwork} stationColorMap={stationColorMap} stationSummaries={coverageSummaries} />
            ) : null}
          </Suspense>
          <Suspense fallback={<LayerLoadingFallback label="3km circles" />}>
            {circleLayerRequested ? (
              <LazyCircle3kmLayer visible={showCircle3km} stationColorMap={stationColorMap} pane="circle3km-pane" />
            ) : null}
          </Suspense>
          <Suspense fallback={<LayerLoadingFallback label="Bridge polygons" />}>
            {bridgeLayerRequested ? (
              <LazyBridgeLayer visible={showBridgePolygons} stationColorMap={stationColorMap} pane="bridge-pane" />
            ) : null}
          </Suspense>
          <Suspense fallback={<LayerLoadingFallback label="3-station roads" />}>
            {trioLayersRequested ? (
              <LazyClosestTrioRoadLayer
                visible={selectedTrioStations.size > 0}
                selectedStationIds={selectedTrioStations}
                stationColorMap={stationColorMap}
                stationSummaries={coverageSummaries}
                pane="bridge-trio-road-pane"
              />
            ) : null}
          </Suspense>
          <Suspense fallback={<LayerLoadingFallback label="3-station bridges" />}>
            {trioLayersRequested ? (
              <LazyClosestTrioBridgeLayer
                visible={selectedTrioStations.size > 0}
                selectedStationIds={selectedTrioStations}
                stationColorMap={stationColorMap}
                stationSummaries={coverageSummaries}
                pane="bridge-trio-pane"
              />
            ) : null}
          </Suspense>
          {stationOverlays}
        </LeafletMapContainer>
      </div>
    </section>
  )
}















