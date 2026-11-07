import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveAppUrl } from '../utils/appUrl'
import { useLiveAqi } from '../hooks/useLiveAqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { useStationContext, type DateRange } from '../context/StationContext'
import { getHistoricalRangeAqi } from '../utils/aqi'
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
  status: 'loading' | 'ready' | 'error' | 'empty'
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
): MetricState {
  return {
    value,
    categoryLabel: category?.label ?? null,
    categoryClass: category?.className ?? null,
    sourceLabel,
    detailLabel,
    status,
  }
}

type SortKey = 'aqi' | 'station'
type SortDirection = 'asc' | 'desc'

function getSortIndicator(isActive: boolean, sortDirection: SortDirection) {
  if (!isActive) {
    return '-'
  }

  return sortDirection === 'asc' ? '^' : 'v'
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
      className={`cursor-pointer border-t border-slate-200/70 transition ${selected ? 'bg-sky-50' : 'hover:bg-white'}`}
    >
      <td className="px-2.5 py-2.5 align-top sm:px-3">
        <div className="min-w-0">
          <p className={`break-words text-sm leading-5 ${selected ? 'font-semibold text-sky-900' : 'font-medium text-slate-900'}`}>
            {station.station_name}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:hidden">{metric.detailLabel}</p>
        </div>
      </td>
      <td className="px-2.5 py-2.5 align-top sm:px-3">
        {metric.status === 'loading' ? (
          <span className="text-[13px] text-slate-500">Loading...</span>
        ) : metric.status === 'error' ? (
          <span className="text-[13px] text-rose-600">Unavailable</span>
        ) : metric.status === 'empty' ? (
          <span className="text-[13px] text-slate-500">No data</span>
        ) : metric.value !== null ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold leading-5 text-slate-950 tabular-nums sm:text-[17px]">{metric.value}</span>
            {metric.categoryLabel && metric.categoryClass ? (
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${metric.categoryClass}`}>
                {metric.categoryLabel}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-[13px] text-slate-500">-</span>
        )}
      </td>
      <td className="hidden px-2.5 py-2.5 align-top sm:table-cell sm:px-3">
        <p className="text-[10px] uppercase tracking-[0.14em] leading-4 text-slate-500">{metric.sourceLabel}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{metric.detailLabel}</p>
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
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Compare all stations</h2>
        </div>
        {isHistorical ? (
          <span className="inline-flex max-w-full self-start rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 sm:self-auto">
            <span className="truncate">Historical · {rangeLabel ?? 'no date range'}</span>
          </span>
        ) : (
          <span className="inline-flex max-w-full self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 sm:self-auto">
            <span className="truncate">Live AQI</span>
          </span>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-5 text-slate-600">
        {isHistorical
          ? rangeLabel
            ? `Average AQI for each station from ${rangeLabel}. Click a header to sort by AQI or station name.`
            : 'Pick a start and end date in the calendar to compare average AQI across the six stations.'
          : 'Click a header to sort the six stations by current live AQI or station name.'}
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-slate-100/80">
            <tr>
              <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:px-3">
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
              <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:px-3">
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
              <th className="hidden px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:table-cell sm:px-3">
                Source
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
