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
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {stat.label}
          </p>
          <div className={`mt-2 text-3xl font-semibold tracking-tight ${stat.accentClass}`}>
            {stat.value ?? '—'}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">AQI for the filtered range</p>
        </div>
      ))}
    </div>
  )
}
