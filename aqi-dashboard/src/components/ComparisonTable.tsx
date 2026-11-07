import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveAppUrl } from '../utils/appUrl'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { useStationContext, type DateRange } from '../context/StationContext'
import { getAqiColor, getHistoricalRangeAqi } from '../utils/aqi'
import { AnimatedNumber } from './AnimatedNumber'
import { useStationWeather } from '../hooks/useStationWeather'
import { formatTemperature } from '../utils/weather'
import { getLiveWaqiSummary, type WaqiLiveStationData } from '../utils/waqi'

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

type MetricState = {
  value: number | null
  categoryLabel: string | null
  categoryClass: string | null
  sourceLabel: string
  detailLabel: string
  /** One short line for the table, e.g. "CPCB · 1:00 pm". The full detail goes in a tooltip. */
  shortLabel: string
  status: 'loading' | 'ready' | 'error' | 'empty'
}

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

function formatTime(value: string | null) {
  const parsed = value ? new Date(value) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? timeFormatter.format(parsed) : null
}

function shortLiveSource(data: WaqiLiveStationData, stale: boolean) {
  const time = formatTime(data.updatedAt)
  const base = data.cpcbStation
    ? `CPCB${time ? ` · ${time}` : ''}`
    : data.nearbySensor
      ? `Nearby sensor · ${data.nearbySensor.distanceKm.toFixed(1)} km`
      : `WAQI${time ? ` · ${time}` : ''}`
  return stale ? `${base} · stale` : base
}

const dateLabelFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : dateLabelFormatter.format(parsed)
}

function formatRangeLabel(dateRange: DateRange) {
  if (!dateRange.startDate || !dateRange.endDate) {
    return null
  }

  return dateRange.startDate === dateRange.endDate
    ? formatDateLabel(dateRange.startDate)
    : `${formatDateLabel(dateRange.startDate)} – ${formatDateLabel(dateRange.endDate)}`
}

function buildMetric(
  status: MetricState['status'],
  sourceLabel: string,
  detailLabel: string,
  value: number | null = null,
  category: { label: string; className: string } | null = null,
  shortLabel = detailLabel,
): MetricState {
  return {
    value,
    categoryLabel: category?.label ?? null,
    categoryClass: category?.className ?? null,
    sourceLabel,
    detailLabel,
    shortLabel,
    status,
  }
}

type SortKey = 'aqi' | 'station'
type SortDirection = 'asc' | 'desc'

function getSortIndicator(isActive: boolean, sortDirection: SortDirection) {
  if (!isActive) {
    return ''
  }

  return sortDirection === 'asc' ? '↑' : '↓'
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

function ComparisonRow({
  station,
  isHistorical,
  dateRange,
  selected,
  onSelect,
  onMetric,
}: {
  station: StationGeo
  isHistorical: boolean
  dateRange: DateRange
  selected: boolean
  onSelect: () => void
  onMetric: (stationId: string, metric: MetricState) => void
}) {
  // Only one source is active at a time: live polling stops in Historical mode,
  // and history files are only fetched once Historical mode is opened.
  const { data: liveData, loading: liveLoading, error: liveError, stale: liveStale } = useLiveAqi(
    station.station_id,
    !isHistorical,
  )
  const { data: historyData, status: historyStatus } = useStationHistory(isHistorical ? station.station_id : null)
  const popupLiveData = useMemo(() => toPopupLiveData(station, liveData), [station, liveData])
  // Current weather only makes sense next to live readings.
  const weather = useStationWeather(station.station_id, !isHistorical)

  const historicalMetric = useMemo<MetricState | null>(() => {
    if (!isHistorical) {
      return null
    }

    const rangeLabel = formatRangeLabel(dateRange)
    if (!rangeLabel) {
      return buildMetric('empty', 'Historical AQI', 'Select a start and end date')
    }

    if (historyStatus === 'error') {
      return buildMetric('error', 'Historical AQI', 'Historical data unavailable')
    }

    if (historyStatus !== 'ready' || !historyData) {
      return buildMetric('loading', 'Historical AQI', 'Loading historical data...')
    }

    const rangeAqi = getHistoricalRangeAqi(historyData.records, dateRange)
    if (!rangeAqi) {
      return buildMetric('empty', 'Historical AQI', `No readings for ${rangeLabel}`)
    }

    return buildMetric(
      'ready',
      'Historical AQI · range average',
      `${rangeLabel} | Average of ${rangeAqi.readingCount.toLocaleString('en-IN')} readings`,
      rangeAqi.value,
      rangeAqi.category,
      `${rangeAqi.readingCount.toLocaleString('en-IN')} readings`,
    )
  }, [dateRange, historyData, historyStatus, isHistorical])

  const liveMetric = useMemo<MetricState | null>(() => {
    if (isHistorical) {
      return null
    }

    if (liveLoading) {
      return buildMetric('loading', 'Live AQI', 'Loading live data...')
    }

    if (liveError || !popupLiveData) {
      return buildMetric('error', 'Live AQI', 'Live data unavailable')
    }

    const summary = getLiveWaqiSummary(popupLiveData)
    return buildMetric(
      'ready',
      summary.sourceLabel,
      liveStale ? `${summary.detailLabel} | Stale live data` : summary.detailLabel,
      summary.value,
      summary.category,
      shortLiveSource(popupLiveData, liveStale),
    )
  }, [isHistorical, liveError, liveLoading, liveStale, popupLiveData])

  const metric = (historicalMetric ?? liveMetric)!

  useEffect(() => {
    onMetric(station.station_id, metric)
  }, [metric, onMetric, station.station_id])

  return (
    <tr
      onClick={onSelect}
      aria-selected={selected}
      title={`${metric.sourceLabel}: ${metric.detailLabel}`}
      className={`cursor-pointer border-t border-slate-100 transition-colors duration-200 ${selected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
    >
      <td className="py-3 pr-3 pl-1 align-middle">
        <p className={`truncate text-sm ${selected ? 'font-semibold text-slate-950' : 'text-slate-800'}`}>{station.station_name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {metric.shortLabel}
          {weather ? (
            <span className="text-slate-500">
              {' · '}
              {formatTemperature(weather.temperature)} · {Math.round(weather.humidity)}%
            </span>
          ) : null}
        </p>
      </td>
      <td className="w-[46%] py-3 pr-1 align-middle sm:w-[55%]">
        {metric.status === 'ready' && metric.value !== null ? (
          <div className="flex items-center gap-3">
            <AnimatedNumber value={metric.value} className="w-9 text-right text-base font-semibold text-slate-950" />
            {/* Bar scaled to 0–300 so the usual Kolkata range uses most of the width. */}
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span
                className="block h-full rounded-full transition-[width,background-color] duration-700 ease-out"
                style={{ width: `${Math.max(4, Math.min(100, (metric.value / 300) * 100))}%`, backgroundColor: getAqiColor(metric.value) }}
              />
            </span>
            <span className="hidden w-24 truncate text-xs sm:inline" style={{ color: getAqiColor(metric.value) }}>
              {metric.categoryLabel}
            </span>
          </div>
        ) : metric.status === 'loading' ? (
          <span className="skeleton block h-1.5 w-full rounded-full" />
        ) : (
          <span className={`text-xs ${metric.status === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
            {metric.status === 'error' ? 'Unavailable' : 'No data'}
          </span>
        )}
      </td>
    </tr>
  )
}

export function ComparisonTable() {
  const { mode, dateRange, selectedStationId, setSelectedStationId } = useStationContext()
  const isHistorical = mode === 'Historical'
  const rangeLabel = formatRangeLabel(dateRange)
  const [stations, setStations] = useState<StationGeo[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('aqi')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [metrics, setMetrics] = useState<Record<string, MetricState>>({})

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

  const onMetric = useCallback((stationId: string, metric: MetricState) => {
    setMetrics((current) => {
      const previous = current[stationId]
      if (
        previous &&
        previous.value === metric.value &&
        previous.status === metric.status &&
        previous.detailLabel === metric.detailLabel &&
        previous.sourceLabel === metric.sourceLabel
      ) {
        return current
      }

      return {
        ...current,
        [stationId]: metric,
      }
    })
  }, [])

  const sortedStations = useMemo(() => {
    return [...stations].sort((left, right) => {
      if (sortKey === 'station') {
        const result = left.station_name.localeCompare(right.station_name)
        return sortDirection === 'asc' ? result : -result
      }

      const leftValue = metrics[left.station_id]?.value ?? Number.NEGATIVE_INFINITY
      const rightValue = metrics[right.station_id]?.value ?? Number.NEGATIVE_INFINITY
      const diff = leftValue - rightValue
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [metrics, sortDirection, sortKey, stations])

  const updateSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === 'station' ? 'asc' : 'desc')
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Compare stations</h2>
        <span className="truncate text-xs text-slate-500">
          {isHistorical ? `Average · ${rangeLabel ?? 'pick dates'}` : 'Live AQI'}
        </span>
      </div>

      <div className="mt-2">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="py-2 pr-3 pl-1 text-left text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => updateSort('station')}
                  className="inline-flex items-center gap-2 transition hover:text-slate-900"
                >
                  Station
                  <span className="text-slate-400" aria-hidden="true">
                    {getSortIndicator(sortKey === 'station', sortDirection)}
                  </span>
                </button>
              </th>
              <th className="w-[46%] py-2 text-left text-xs font-medium text-slate-400 sm:w-[55%]">
                <button
                  type="button"
                  onClick={() => updateSort('aqi')}
                  className="inline-flex items-center gap-2 transition hover:text-slate-900"
                >
                  {isHistorical ? 'Avg AQI' : 'Current AQI'}
                  <span className="text-slate-400" aria-hidden="true">
                    {getSortIndicator(sortKey === 'aqi', sortDirection)}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStations.map((station) => (
              <ComparisonRow
                key={station.station_id}
                station={station}
                isHistorical={isHistorical}
                dateRange={dateRange}
                selected={station.station_id === selectedStationId}
                onSelect={() => setSelectedStationId(station.station_id)}
                onMetric={onMetric}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
