import { useEffect, useMemo, useRef, useState } from 'react'
import { useStationContext, type CoverageMode } from '../context/StationContext'
import { useWaqiLiveStation } from '../hooks/useWaqiLiveStation'
import { formatWaqiTimestamp, getLiveWaqiSummary, getWaqiAccessLabel } from '../utils/waqi'
import { LiveStationCard } from './LiveStationCard'

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />
}

function AlertBanner({ tone, children }: { tone: 'error' | 'loading'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-sky-200 bg-sky-50 text-sky-700'

  return <div className={`rounded-2xl border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

export function StationSidebar() {
  const { selectedStationId, setSelectedStationId, coverageMode, setCoverageMode } = useStationContext()
  const [stations, setStations] = useState<StationGeo[]>([])
  const [stationFilter, setStationFilter] = useState('')
  const stationButtonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map())

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

  const filteredStations = useMemo(() => {
    const query = stationFilter.trim().toLowerCase()

    if (!query) {
      return stations
    }

    return stations.filter((station) => {
      return (
        station.station_name.toLowerCase().includes(query) ||
        station.station_id.toLowerCase().includes(query)
      )
    })
  }, [stationFilter, stations])

  useEffect(() => {
    if (!selectedStationId) {
      return
    }

    const button = stationButtonRefs.current.get(selectedStationId)
    button?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [filteredStations, selectedStationId])

  const selectedStation = useMemo(
    () => stations.find((station) => station.station_id === selectedStationId) ?? null,
    [selectedStationId, stations],
  )
  const waqiAccessLabel = getWaqiAccessLabel()

  const { data: liveData, status: liveStatus, stale: liveStale } = useWaqiLiveStation(selectedStation, true)
  const liveSummary = useMemo(() => (liveData ? getLiveWaqiSummary(liveData) : null), [liveData])
  const liveUpdatedAt = formatWaqiTimestamp(liveData?.updatedAt ?? null)
  const isLoading = liveStatus === 'loading'
  const isError = liveStatus === 'error'

  return (
    <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Selected Station</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">Live AQI summary</h2>
      <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        <span className="min-w-0 truncate">WAQI {waqiAccessLabel}</span>
      </div>
      <div className="mt-2 inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
        <span className="min-w-0 truncate">Live only</span>
      </div>

      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm shadow-slate-200/40 sm:p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Coverage</p>
          <div className="mt-2 flex rounded-full bg-slate-100 p-0.5 sm:p-1">
            {(['voronoi', 'circles'] as CoverageMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCoverageMode(option)}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                  coverageMode === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {option === 'voronoi' ? 'Voronoi' : 'Circles'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm shadow-slate-200/40 sm:p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Filter stations
            <input
              type="text"
              value={stationFilter}
              onChange={(event) => setStationFilter(event.target.value)}
              placeholder="Search by name or ID"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <p className="mt-2 text-[11px] text-slate-500">Showing {filteredStations.length} of {stations.length} stations</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-200/40 sm:p-2">
          <div className="max-h-44 space-y-2 overflow-y-auto pr-1 sm:max-h-56">
            {filteredStations.length > 0 ? (
              filteredStations.map((station) => {
                const isSelected = station.station_id === selectedStationId

                return (
                  <button
                    key={station.station_id}
                    ref={(element) => {
                      stationButtonRefs.current.set(station.station_id, element)
                    }}
                    type="button"
                    onClick={() => setSelectedStationId(station.station_id)}
                    className={`w-full rounded-2xl border px-2.5 py-2.5 text-left transition ${
                      isSelected
                        ? 'border-sky-300 bg-sky-50 shadow-sm shadow-sky-100'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-900">{station.station_name}</p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">{station.station_id}</p>
                      </div>
                      {isSelected ? (
                        <span className="shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          Active
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="px-3 py-6 text-sm text-slate-500">No stations match your filter.</p>
            )}
          </div>
        </div>
      </div>

      {!selectedStation ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Click any map marker or choose a station above to update <span className="font-medium text-slate-900">selectedStation</span>.
        </p>
      ) : (
        <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="break-words text-sm font-semibold text-slate-900">{selectedStation.station_name}</p>
            <p className="mt-1 break-all text-xs text-slate-500">{selectedStation.station_id}</p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}
            </p>
          </div>

          {isLoading ? <AlertBanner tone="loading">Loading live AQI summary...</AlertBanner> : null}
          {isError ? <AlertBanner tone="error">Live AQI summary could not be loaded.</AlertBanner> : null}

          {isLoading ? (
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <SkeletonLine className="h-3 w-24" />
              <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
                <SkeletonLine className="h-10 w-16 rounded-none" />
                <SkeletonLine className="h-6 w-20" />
              </div>
              <SkeletonLine className="mt-3 h-3 w-full" />
              <SkeletonLine className="mt-2 h-3 w-4/5" />
            </div>
          ) : liveSummary ? (
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {liveSummary.sourceLabel}
              </p>
              <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
                <p className="min-w-0 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{liveSummary.value}</p>
                <div className="flex min-w-0 flex-col items-end gap-1">
                  {liveUpdatedAt ? (
                    <span className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-500/20">
                      <span className="truncate">Last updated {liveUpdatedAt}</span>
                    </span>
                  ) : null}
                  {liveStale ? (
                    <span className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      <span className="truncate">Stale live data</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{liveSummary.detailLabel}</p>
            </div>
          ) : null}

          {liveData && liveSummary ? (
            <div className="min-w-0 overflow-hidden rounded-2xl">
              <LiveStationCard stationName={selectedStation.station_name} liveData={liveData} stale={liveStale} />
            </div>
          ) : null}
        </div>
      )}
    </aside>
  )
}
