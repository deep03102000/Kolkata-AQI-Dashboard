import { useMemo } from 'react'
import { calculateRecordAqi, type PollutantRecord } from '../utils/aqi'
import { AnimatedNumber } from './AnimatedNumber'

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
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-xs text-slate-500">{stat.label} AQI</dt>
          <dd className="mt-0.5 text-xl font-semibold text-slate-900">
            {stat.value === null ? '—' : <AnimatedNumber value={stat.value} />}
          </dd>
        </div>
      ))}
    </dl>
  )
}
