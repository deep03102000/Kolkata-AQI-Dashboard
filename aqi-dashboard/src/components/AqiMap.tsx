import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import { useStationContext } from '../context/StationContext'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useRoadNetworkPayload } from '../hooks/useRoadNetworkPayload'
import { getAqiColor, type AqiSummary } from '../utils/aqi'
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
const LazyRoadLayer = lazy(() => import('./RoadLayer').then((module) => ({ default: module.RoadLayer })))

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
  const { selectedStationId, setSelectedStationId, coverageMode } = useStationContext()
  const { data: liveData, loading: liveLoading, error: liveError, stale: liveStale } = useLiveAqi(station.station_id, true)
  const lastKnownLiveSummaryRef = useRef<AqiSummary | null>(null)

  const popupLiveData = useMemo(() => toPopupLiveData(station, liveData), [station, liveData])

  const summary = useMemo(() => {
    return popupLiveData ? getLiveWaqiSummary(popupLiveData) : null
  }, [popupLiveData])

  useEffect(() => {
    if (summary) {
      lastKnownLiveSummaryRef.current = summary
    }
  }, [summary])

  const coverageSummary = summary ?? lastKnownLiveSummaryRef.current
  const coverageIsStale = liveStale || (!summary && Boolean(lastKnownLiveSummaryRef.current))

  const isSelected = selectedStationId === station.station_id
  const circleColor = coverageSummary ? getAqiColor(coverageSummary.value) : '#94a3b8'
  const circleStyle = {
    color: circleColor,
    fillColor: circleColor,
    fillOpacity: isSelected ? (coverageIsStale ? 0.18 : 0.3) : coverageIsStale ? 0.14 : 0.24,
    weight: isSelected ? 4 : 2.5,
    opacity: coverageIsStale ? 0.68 : 0.95,
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

export function AqiMap() {
  const [stations, setStations] = useState<StationGeo[]>([])
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [showRoadNetwork, setShowRoadNetwork] = useState(false)
  const { coverageMode } = useStationContext()
  const { data: roadNetwork, status: roadNetworkStatus } = useRoadNetworkPayload(null, showRoadNetwork)
  const markerRefs = useRef<Map<string, StationMarkerRef | null>>(new Map())
  const stationColorMapRecomputeCount = useRef(0)
  const [coverageSummaries, setCoverageSummaries] = useState<Record<string, CoverageStationSummary>>({})

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

    fetch('/data/station_master.json')
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
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
            Phase 3.4
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Kolkata AQI Map</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVoronoi((current) => !current)}
            disabled={false}
            className="inline-flex max-w-full items-center rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            {showVoronoi ? 'Hide Voronoi' : 'Show Voronoi'}
          </button>
          <button
            type="button"
            onClick={() => setShowRoadNetwork((current) => !current)}
            disabled={roadNetworkStatus === 'loading'}
            className="inline-flex max-w-full items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            {roadNetworkStatus === 'loading' && showRoadNetwork
              ? 'Loading Roads'
              : roadNetworkStatus === 'error'
                ? 'Roads unavailable'
                : roadNetwork
                  ? showRoadNetwork
                    ? 'Hide Roads'
                    : 'Show Roads'
                  : 'Show Roads'}
          </button>
          <span className="inline-flex max-w-full self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:self-auto">
            OpenStreetMap
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
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
          <MapSelectionFollower stations={stations} markerRefs={markerRefs} />
          <Suspense fallback={<LayerLoadingFallback label="Coverage" />}>
            {coverageMode === 'voronoi' ? (
              <CoverageLayer visible={showVoronoi} stationColorMap={stationColorMap} stationSummaries={coverageSummaries} />
            ) : null}
          </Suspense>
          <Suspense fallback={<LayerLoadingFallback label="Roads" />}>
            {coverageMode === 'voronoi' ? (
              <LazyRoadLayer visible={showRoadNetwork} stationColorMap={stationColorMap} stationSummaries={coverageSummaries} />
            ) : null}
          </Suspense>
          {stationOverlays}
        </LeafletMapContainer>
      </div>
    </section>
  )
}
