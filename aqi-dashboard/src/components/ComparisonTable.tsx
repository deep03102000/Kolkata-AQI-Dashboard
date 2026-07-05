import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveAqi } from '../hooks/useLiveAqi'
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
  status: 'loading' | 'ready' | 'error'
}

type SortKey = 'aqi' | 'station'
type SortDirection = 'asc' | 'desc'

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

function ComparisonRow({
  station,
  onMetric,
}: {
  station: StationGeo
  onMetric: (stationId: string, metric: MetricState) => void
}) {
  const { data: liveData, loading: liveLoading, error: liveError, stale: liveStale } = useLiveAqi(station.station_id, true)
  const popupLiveData = useMemo(() => toPopupLiveData(station, liveData), [station, liveData])

  const metric = useMemo<MetricState>(() => {
    if (liveLoading) {
      return {
        value: null,
        categoryLabel: null,
        categoryClass: null,
        sourceLabel: 'Live AQI',
        detailLabel: 'Loading live data...',
        status: 'loading',
      }
    }

    if (liveError || !popupLiveData) {
      return {
        value: null,
        categoryLabel: null,
        categoryClass: null,
        sourceLabel: 'Live AQI',
        detailLabel: 'Live data unavailable',
        status: 'error',
      }
    }

    const summary = getLiveWaqiSummary(popupLiveData)
    return {
      value: summary.value,
      categoryLabel: summary.category.label,
      categoryClass: summary.category.className,
      sourceLabel: summary.sourceLabel,
      detailLabel: liveStale ? `${summary.detailLabel} | Stale live data` : summary.detailLabel,
      status: 'ready',
    }
  }, [liveData, liveError, liveLoading, liveStale, popupLiveData])

  useEffect(() => {
    onMetric(station.station_id, metric)
  }, [metric, onMetric, station.station_id])

  return (
    <tr className="border-t border-slate-200/70">
      <td className="px-3 py-3 align-top sm:px-4">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900">{station.station_name}</p>
          <p className="break-all text-xs text-slate-500">{station.station_id}</p>
        </div>
      </td>
      <td className="px-3 py-3 align-top sm:px-4">
        {metric.status === 'loading' ? (
          <span className="text-sm text-slate-500">Loading...</span>
        ) : metric.status === 'error' ? (
          <span className="text-sm text-rose-600">Unavailable</span>
        ) : metric.value !== null ? (
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-slate-950">{metric.value}</span>
            {metric.categoryLabel && metric.categoryClass ? (
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ${metric.categoryClass}`}>
                {metric.categoryLabel}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-slate-500">-</span>
        )}
      </td>
      <td className="px-3 py-3 align-top sm:px-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{metric.sourceLabel}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{metric.detailLabel}</p>
      </td>
    </tr>
  )
}

export function ComparisonTable() {
  const [stations, setStations] = useState<StationGeo[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('aqi')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [metrics, setMetrics] = useState<Record<string, MetricState>>({})

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
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Comparison Table</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">All six station AQIs</h2>
        </div>
        <span className="inline-flex max-w-full self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:self-auto">
          <span className="truncate">Live AQI only</span>
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Click a header to sort the six stations by current live AQI or station name.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-slate-100/80">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:px-4">
                <button
                  type="button"
                  onClick={() => updateSort('station')}
                  className="inline-flex items-center gap-2"
                >
                  Station
                  <span className="text-slate-400">{sortKey === 'station' ? (sortDirection === 'asc' ? 'â†‘' : 'â†“') : 'â†•'}</span>
                </button>
              </th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:px-4">
                <button
                  type="button"
                  onClick={() => updateSort('aqi')}
                  className="inline-flex items-center gap-2"
                >
                  Current AQI
                  <span className="text-slate-400">{sortKey === 'aqi' ? (sortDirection === 'asc' ? 'â†‘' : 'â†“') : 'â†•'}</span>
                </button>
              </th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:px-4">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStations.map((station) => (
              <ComparisonRow key={station.station_id} station={station} onMetric={onMetric} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
