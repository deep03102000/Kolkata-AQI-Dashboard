import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useStationContext } from '../context/StationContext'
import { resolveAppUrl } from '../utils/appUrl'
import { useStationHistory } from '../hooks/useStationHistory'

const ChartPanel = lazy(() => import('./ChartPanel'))

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton rounded-full ${className}`} />
}

function AlertBanner({ tone, children }: { tone: 'error' | 'loading'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-sky-200 bg-sky-50 text-sky-700'

  return <div className={`rounded-2xl border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'Not selected'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function SelectedStationChartPanel() {
  const { selectedStationId, mode, dateRange } = useStationContext()
  const [stations, setStations] = useState<StationGeo[]>([])

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

  const selectedStation = useMemo(
    () => stations.find((station) => station.station_id === selectedStationId) ?? null,
    [selectedStationId, stations],
  )

  const { data: historicalData, status, error } = useStationHistory(selectedStation?.station_id ?? null)

  const historicalRangeLabel = useMemo(() => {
    const start = formatDateLabel(dateRange.startDate)
    const end = formatDateLabel(dateRange.endDate)
    return `${start} to ${end}`
  }, [dateRange.endDate, dateRange.startDate])

  return (
    <section className="card">
      <div className="mb-3 min-w-0">
        <h2 className="text-base font-semibold text-slate-900">
          Pollutant trend{selectedStation ? ` · ${selectedStation.station_name}` : ''}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {mode === 'Historical'
            ? dateRange.startDate && dateRange.endDate
              ? historicalRangeLabel
              : 'Pick a date range at the top'
            : 'Last recorded day of history · switch to Historical for any range'}
        </p>
      </div>

      {!selectedStation ? (
        <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">Select a station to see its trend.</p>
      ) : status === 'loading' ? (
        <div className="space-y-3" aria-label="Loading chart">
          <div className="flex gap-8">
            <SkeletonLine className="h-9 w-16 rounded-lg" />
            <SkeletonLine className="h-9 w-16 rounded-lg" />
            <SkeletonLine className="h-9 w-16 rounded-lg" />
          </div>
          <SkeletonLine className="h-64 w-full rounded-xl" />
        </div>
      ) : status === 'error' || !historicalData ? (
        <AlertBanner tone="error">
          {error?.message ?? 'Chart data could not be loaded.'}
        </AlertBanner>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm shadow-slate-200/50">
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
