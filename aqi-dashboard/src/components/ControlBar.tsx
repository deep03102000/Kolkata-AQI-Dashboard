import { useEffect, useState } from 'react'
import { resolveAppUrl } from '../utils/appUrl'
import { useStationContext, type DateRange, type StationMode } from '../context/StationContext'

type StationGeo = {
  station_id: string
  station_name: string
}

// Bounds of the bundled historical dataset (15-minute readings).
export const HISTORY_MIN_DATE = '2024-01-01'
export const HISTORY_MAX_DATE = '2025-12-31'

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const PRESETS: Array<{ label: string; range: DateRange }> = [
  { label: 'Last 7 days', range: { startDate: shiftDate(HISTORY_MAX_DATE, -6), endDate: HISTORY_MAX_DATE } },
  { label: 'Last 30 days', range: { startDate: shiftDate(HISTORY_MAX_DATE, -29), endDate: HISTORY_MAX_DATE } },
  { label: 'Last 90 days', range: { startDate: shiftDate(HISTORY_MAX_DATE, -89), endDate: HISTORY_MAX_DATE } },
  { label: '2025', range: { startDate: '2025-01-01', endDate: '2025-12-31' } },
  { label: '2024', range: { startDate: '2024-01-01', endDate: '2024-12-31' } },
]

const DEFAULT_HISTORICAL_RANGE = PRESETS[1].range

const dateInputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100'

export function ControlBar() {
  const { mode, setMode, dateRange, setDateRange, selectedStationId, setSelectedStationId } = useStationContext()
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
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const switchMode = (next: StationMode) => {
    setMode(next)
    // Never land on an empty Historical view: start from the last 30 days of data.
    if (next === 'Historical' && (!dateRange.startDate || !dateRange.endDate)) {
      setDateRange(DEFAULT_HISTORICAL_RANGE)
    }
  }

  const isHistorical = mode === 'Historical'

  return (
    <div className="sticky top-2 z-[1100] rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md shadow-slate-200/70 backdrop-blur sm:p-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center gap-2.5">
          <div role="group" aria-label="Data view" className="flex shrink-0 rounded-full bg-slate-100 p-0.5">
            {(['Live', 'Historical'] as StationMode[]).map((option) => {
              const active = mode === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchMode(option)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    active
                      ? option === 'Live'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option === 'Live' ? (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse bg-white' : 'bg-emerald-500'}`}
                    />
                  ) : null}
                  {option}
                </button>
              )
            })}
          </div>

          <label className="flex min-w-0 flex-1 items-center gap-2 lg:w-60 lg:flex-none">
            <span className="sr-only">Station</span>
            <select
              value={selectedStationId ?? ''}
              onChange={(event) => setSelectedStationId(event.target.value || null)}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Choose a station…</option>
              {stations.map((station) => (
                <option key={station.station_id} value={station.station_id}>
                  {station.station_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isHistorical ? (
          <div className="flex min-w-0 flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center lg:gap-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 lg:w-80 lg:shrink-0">
              <label className="min-w-0">
                <span className="sr-only">Start date</span>
                <input
                  type="date"
                  min={HISTORY_MIN_DATE}
                  max={dateRange.endDate ?? HISTORY_MAX_DATE}
                  value={dateRange.startDate ?? ''}
                  onChange={(event) => setDateRange({ ...dateRange, startDate: event.target.value || null })}
                  className={dateInputClass}
                />
              </label>
              <span className="text-xs text-slate-400" aria-hidden="true">
                to
              </span>
              <label className="min-w-0">
                <span className="sr-only">End date</span>
                <input
                  type="date"
                  min={dateRange.startDate ?? HISTORY_MIN_DATE}
                  max={HISTORY_MAX_DATE}
                  value={dateRange.endDate ?? ''}
                  onChange={(event) => setDateRange({ ...dateRange, endDate: event.target.value || null })}
                  className={dateInputClass}
                />
              </label>
            </div>

            <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 lg:flex-wrap lg:overflow-visible lg:pb-0">
              {PRESETS.map((preset) => {
                const active =
                  dateRange.startDate === preset.range.startDate && dateRange.endDate === preset.range.endDate
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDateRange(preset.range)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs leading-5 text-slate-500 lg:flex-1">
            Official CPCB station readings, published hourly about 30–40 minutes after each hour. Switch to Historical
            to compare stations over any dates in 2024–2025.
          </p>
        )}
      </div>
    </div>
  )
}
