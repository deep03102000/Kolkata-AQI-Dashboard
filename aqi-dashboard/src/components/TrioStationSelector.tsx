import { useMemo } from 'react'
import { useStationContext, TRIO_STATION_OPTIONS, type DateRange, type StationMode, type TrioStationId } from '../context/StationContext'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { getAqiColor, getStationAqiSummary } from '../utils/aqi'
import { getLiveWaqiSummary, type WaqiLiveStationData } from '../utils/waqi'

type TrioStationRowProps = {
  stationId: TrioStationId
  label: string
  checked: boolean
  mode: StationMode
  dateRange: DateRange
  onToggle: (stationId: TrioStationId) => void
}

function toWaqiLiveStationData(data: ReturnType<typeof useLiveAqi>['data']): WaqiLiveStationData | null {
  if (!data || data.aqi === null) {
    return null
  }

  return {
    aqi: data.aqi,
    idx: data.stationUid,
    cityName: data.cityName ?? data.stationName,
    cityUrl: data.cityUrl,
    dominantPollutant: data.dominantPollutant,
    updatedAt: data.updatedAt,
    pollutants: data.pollutants,
    nearbySensor: data.nearbySensor,
    cpcbStation: data.cpcbStation,
    raw: data.raw ?? {
      aqi: data.aqi,
      idx: data.stationUid ?? undefined,
      iaqi: {},
      city: {
        name: data.cityName ?? data.stationName ?? undefined,
        url: data.cityUrl ?? undefined,
      },
      dominentpol: data.dominantPollutant ?? undefined,
      time: data.updatedAt ? { s: data.updatedAt } : undefined,
    },
  }
}

function TrioStationRow({ stationId, label, checked, mode, dateRange, onToggle }: TrioStationRowProps) {
  const { data: liveData, loading: liveLoading, stale: liveStale } = useLiveAqi(stationId, mode === 'Live')
  const { data: historicalData } = useStationHistory(mode === 'Historical' ? stationId : null)

  const liveSummary = useMemo(() => {
    const liveStationData = toWaqiLiveStationData(liveData)
    return liveStationData ? getLiveWaqiSummary(liveStationData) : null
  }, [liveData])
  const historicalSummary = useMemo(
    () => (historicalData ? getStationAqiSummary(historicalData.records, 'Historical', dateRange) : null),
    [dateRange, historicalData],
  )

  const summary = mode === 'Historical' ? historicalSummary : liveSummary
  const swatchColor = summary ? getAqiColor(summary.value) : '#cbd5e1'
  const stale = mode === 'Live' && (liveStale || (!liveSummary && liveLoading))

  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-1 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(stationId)}
        className="h-4 w-4 shrink-0 accent-sky-600"
      />
      <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-slate-900/10 ${stale ? 'opacity-70' : ''}`}
          style={{ backgroundColor: swatchColor }}
          title={summary ? `${summary.category.label} AQI` : 'AQI unavailable'}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs font-normal text-slate-500">
        {summary ? summary.category.label : liveLoading ? 'Loading' : 'No AQI'}
      </span>
    </label>
  )
}

export function TrioStationSelector() {
  const { selectedTrioStations, toggleTrioStationId, mode, dateRange } = useStationContext()

  return (
    <section className="min-w-0">
      <p className="eyebrow">Three-station bridges</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Tick stations to draw the shared area and roads between them.
      </p>

      <div className="mt-1.5 space-y-0.5">
        {TRIO_STATION_OPTIONS.map((option) => (
          <TrioStationRow
            key={option.stationId}
            stationId={option.stationId}
            label={option.label}
            checked={selectedTrioStations.has(option.stationId)}
            mode={mode}
            dateRange={dateRange}
            onToggle={toggleTrioStationId}
          />
        ))}
      </div>
    </section>
  )
}
