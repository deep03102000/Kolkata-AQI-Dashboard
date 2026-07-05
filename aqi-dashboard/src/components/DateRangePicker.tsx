import { useStationContext } from '../context/StationContext'

const MIN_DATE = '2024-01-01'
const MAX_DATE = '2025-12-31'

export function DateRangePicker() {
  const { dateRange, setDateRange } = useStationContext()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/50 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Start
          <input
            type="date"
            min={MIN_DATE}
            max={dateRange.endDate ?? MAX_DATE}
            value={dateRange.startDate ?? ''}
            onChange={(event) => {
              setDateRange({
                ...dateRange,
                startDate: event.target.value || null,
              })
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium tracking-normal text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          End
          <input
            type="date"
            min={dateRange.startDate ?? MIN_DATE}
            max={MAX_DATE}
            value={dateRange.endDate ?? ''}
            onChange={(event) => {
              setDateRange({
                ...dateRange,
                endDate: event.target.value || null,
              })
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium tracking-normal text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>
    </div>
  )
}
