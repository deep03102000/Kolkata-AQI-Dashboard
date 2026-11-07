import { useMemo } from 'react'
import { calculateRecordAqi, type PollutantRecord } from '../utils/aqi'

type Props = {
  records: PollutantRecord[]
}

type StatCard = {
  label: string
  value: number | null
  accentClass: string
}

export function SummaryStats({ records }: Props) {
  const stats = useMemo(() => {
    const values = records
      .map((record) => calculateRecordAqi(record))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    if (values.length === 0) {
      return [
        { label: 'Average', value: null, accentClass: 'text-sky-600' },
        { label: 'Maximum', value: null, accentClass: 'text-rose-600' },
        { label: 'Minimum', value: null, accentClass: 'text-emerald-600' },
      ] satisfies StatCard[]
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length

    return [
      { label: 'Average', value: Math.round(average), accentClass: 'text-sky-600' },
      { label: 'Maximum', value: Math.round(Math.max(...values)), accentClass: 'text-rose-600' },
      { label: 'Minimum', value: Math.round(Math.min(...values)), accentClass: 'text-emerald-600' },
    ] satisfies StatCard[]
  }, [records])

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-3.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {stat.label}
            </p>
            <span className={`text-sm font-semibold leading-none ${stat.accentClass}`}>
              {stat.value ?? '—'}
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Filtered range</p>
        </div>
      ))}
    </div>
  )
}
