import { useEffect, useMemo, useState } from 'react'
import { resolveAppUrl } from '../utils/appUrl'
import { useStationContext, type CoverageMode } from '../context/StationContext'
import { TrioStationSelector } from './TrioStationSelector'
import { useWaqiLiveStation } from '../hooks/useWaqiLiveStation'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { getAqiCategory, getHistoricalRangeAqi } from '../utils/aqi'
import { LiveStationCard } from './LiveStationCard'
import { AnimatedNumber } from './AnimatedNumber'

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton rounded-full ${className}`} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>
}

/** AQI for one station in the current mode: live reading, or the date-range average. */
function useStationModeAqi(stationId: string) {
  const { mode, dateRange } = useStationContext()
  const isHistorical = mode === 'Historical'
  const { data: live, loading: liveLoading } = useLiveAqi(stationId, !isHistorical)
  const { data: history, status: historyStatus } = useStationHistory(isHistorical ? stationId : null)

  return useMemo(() => {
    if (isHistorical) {
      if (historyStatus !== 'ready' || !history) {
        return { loading: historyStatus === 'loading', value: null }
      }
      const range = getHistoricalRangeAqi(history.records, dateRange)
      return { loading: false, value: range?.value ?? null, readingCount: range?.readingCount ?? 0 }
    }

    return { loading: liveLoading, value: live?.aqi ?? null }
  }, [dateRange, history, historyStatus, isHistorical, live, liveLoading])
}

function AqiChip({ value, loading }: { value: number | null; loading: boolean }) {
  if (loading) {
    return <SkeletonLine className="h-5 w-10" />
  }

  if (value === null) {
    return <span className="text-xs text-slate-400">—</span>
  }

  const category = getAqiCategory(value)
  return (
    <span
      className="inline-flex min-w-[3.25rem] items-center justify-end gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-500"
      style={{ backgroundColor: `${category.color}1f`, color: category.color }}
      title={category.label}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full transition-colors duration-500" style={{ backgroundColor: category.color }} />
      <AnimatedNumber value={value} />
    </span>
  )
}

function StationListItem({
  station,
  selected,
  onSelect,
}: {
  station: StationGeo
  selected: boolean
  onSelect: () => void
}) {
  const aqi = useStationModeAqi(station.station_id)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 ${
        selected ? 'bg-slate-100' : 'hover:bg-slate-50'
      }`}
    >
      <span className={`min-w-0 truncate text-sm ${selected ? 'font-semibold text-slate-950' : 'text-slate-700'}`}>
        {station.station_name}
      </span>
      <AqiChip value={aqi.value} loading={aqi.loading} />
    </button>
  )
}

function HistoricalStationCard({ stationId }: { stationId: string }) {
  const { dateRange } = useStationContext()
  const { data, status } = useStationHistory(stationId)

  if (!dateRange.startDate || !dateRange.endDate) {
    return <p className="text-sm text-slate-500">Pick a start and end date above.</p>
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-2">
        <SkeletonLine className="h-10 w-20 rounded-lg" />
        <SkeletonLine className="h-3 w-3/4" />
      </div>
    )
  }

  if (status === 'error' || !data) {
    return <p className="text-sm text-rose-600">Historical data could not be loaded.</p>
  }

  const range = getHistoricalRangeAqi(data.records, dateRange)
  const rangeLabel =
    dateRange.startDate === dateRange.endDate
      ? formatDate(dateRange.startDate)
      : `${formatDate(dateRange.startDate)} – ${formatDate(dateRange.endDate)}`

  if (!range) {
    return <p className="text-sm text-slate-500">No readings for {rangeLabel}.</p>
  }

  return (
    <div>
      <SectionTitle>Average AQI</SectionTitle>
      <div className="mt-1 flex items-end gap-3">
        <AnimatedNumber value={range.value} className="text-5xl font-semibold leading-none tracking-tight text-slate-950" />
        <span className="mb-1 text-sm font-medium" style={{ color: range.category.color }}>
          {range.category.label}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        {rangeLabel} · {range.readingCount.toLocaleString('en-IN')} readings
      </p>
    </div>
  )
}

function LayerToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-1 py-1.5 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  )
}

export function StationSidebar() {
  const {
    selectedStationId,
    setSelectedStationId,
    mode,
    coverageMode,
    setCoverageMode,
    showCircle3km,
    setShowCircle3km,
    showBridgePolygons,
    setShowBridgePolygons,
  } = useStationContext()
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

  const isHistorical = mode === 'Historical'
  const { data: liveData, status: liveStatus, stale: liveStale } = useWaqiLiveStation(
    selectedStation,
    !isHistorical,
  )

  return (
    <aside className="card space-y-5">
      <section>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Stations</h2>
          <span className="text-xs text-slate-500">{isHistorical ? 'Average AQI' : 'Live AQI'}</span>
        </div>
        <div className="mt-2 space-y-0.5">
          {stations.length === 0
            ? Array.from({ length: 6 }, (_, index) => <SkeletonLine key={index} className="my-2 h-6 w-full" />)
            : stations.map((station) => (
                <StationListItem
                  key={station.station_id}
                  station={station}
                  selected={station.station_id === selectedStationId}
                  onSelect={() => setSelectedStationId(station.station_id)}
                />
              ))}
        </div>
      </section>

      <section className="rounded-xl bg-slate-50 p-3.5">
        {!selectedStation ? (
          <p className="text-sm leading-6 text-slate-500">Select a station to see its details.</p>
        ) : (
          // Keyed by station so the details fade in again on every switch.
          <div key={`${selectedStation.station_id}-${mode}`} className="animate-fade-up">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold leading-6 text-slate-900">{selectedStation.station_name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStationId(null)}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-800"
              >
                Clear
              </button>
            </div>

            {isHistorical ? (
              <HistoricalStationCard stationId={selectedStation.station_id} />
            ) : liveStatus === 'loading' ? (
              <div className="space-y-2">
                <SkeletonLine className="h-10 w-20 rounded-lg" />
                <SkeletonLine className="h-3 w-3/4" />
                <SkeletonLine className="h-24 w-full rounded-xl" />
              </div>
            ) : liveStatus === 'error' || !liveData ? (
              <p className="text-sm text-rose-600">Live AQI could not be loaded for this station.</p>
            ) : (
              <LiveStationCard liveData={liveData} stale={liveStale} />
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-base font-semibold text-slate-900">Map layers</h2>

        <div>
          <SectionTitle>Station coverage areas</SectionTitle>
          <div className="mt-2 flex rounded-full bg-slate-100 p-0.5">
            {(['voronoi', 'circles'] as CoverageMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCoverageMode(option)}
                aria-pressed={coverageMode === option}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
                  coverageMode === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {option === 'voronoi' ? 'Nearest-station zones' : 'Circles'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-0.5">
          <LayerToggle
            checked={showCircle3km}
            onChange={setShowCircle3km}
            label="3 km radius"
            description="A 3 km circle around every station."
          />
          <LayerToggle
            checked={showBridgePolygons}
            onChange={setShowBridgePolygons}
            label="Station-pair bridges"
            description="Areas linking neighbouring station pairs."
          />
        </div>

        <TrioStationSelector />
      </section>
    </aside>
  )
}
