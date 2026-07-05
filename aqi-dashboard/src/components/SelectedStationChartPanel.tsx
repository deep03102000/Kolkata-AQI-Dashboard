import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useStationContext } from '../context/StationContext'
import { useStationHistory } from '../hooks/useStationHistory'

const ChartPanel = lazy(() => import('./ChartPanel'))

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

export function SelectedStationChartPanel() {
  const { selectedStationId, mode } = useStationContext()
  const [stations, setStations] = useState<StationGeo[]>([])

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

  const selectedStation = useMemo(
    () => stations.find((station) => station.station_id === selectedStationId) ?? null,
    [selectedStationId, stations],
  )

  const { data: historicalData, status, error } = useStationHistory(selectedStation?.station_id ?? null)

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Chart Panel</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Selected Station Overview</h2>
        </div>
        <span className="inline-flex max-w-full self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:self-auto">
          <span className="truncate">{mode}</span>
        </span>
      </div>

      {!selectedStation ? (
        <p className="text-sm leading-6 text-slate-600">
          Select a station marker on the map to load its AQI trend here.
        </p>
      ) : status === 'loading' ? (
        <div className="space-y-4">
          <AlertBanner tone="loading">Loading chart data...</AlertBanner>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <SkeletonLine className="h-3 w-28" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="mt-3 h-8 w-16" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="mt-3 h-8 w-16" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="mt-3 h-8 w-16" />
              </div>
            </div>
            <SkeletonLine className="mt-4 h-10 w-full rounded-2xl" />
            <SkeletonLine className="mt-3 h-64 w-full rounded-2xl" />
          </div>
        </div>
      ) : status === 'error' || !historicalData ? (
        <AlertBanner tone="error">
          {error?.message ?? 'Chart data could not be loaded.'}
        </AlertBanner>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm shadow-slate-200/50">
              Loading chart panel...
            </div>
          }
        >
          <ChartPanel stationName={selectedStation.station_name} records={historicalData.records} />
        </Suspense>
      )}
    </section>
  )
}
