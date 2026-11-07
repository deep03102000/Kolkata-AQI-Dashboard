import { type WaqiPollutantKey, type WaqiResolvedPollutants } from '../utils/waqi'

type Props = {
  pollutants: WaqiResolvedPollutants
}

const POLLUTANT_LABELS: Record<WaqiPollutantKey, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
  o3: 'O₃',
  nh3: 'NH₃',
}

const valueFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
})

/** Compact two-column list: pollutant, a thin bar scaled to 0–500, and the value. */
export function LivePollutantGrid({ pollutants }: Props) {
  const keys = Object.keys(POLLUTANT_LABELS) as WaqiPollutantKey[]
  const hasLastKnown = keys.some((key) => pollutants[key].source === 'last known')

  return (
    <div>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-1">
        {keys.map((key) => {
          const pollutant = pollutants[key]
          const value = typeof pollutant.value === 'number' && Number.isFinite(pollutant.value) ? pollutant.value : null
          const isLive = pollutant.source === 'live'

          return (
            <li key={key} className="grid grid-cols-[3.25rem_1fr_2.75rem] items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">{POLLUTANT_LABELS[key]}</span>
              <span className="h-1 overflow-hidden rounded-full bg-slate-200/70" aria-hidden="true">
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${isLive ? 'bg-slate-500' : 'bg-slate-300'}`}
                  style={{ width: `${value === null ? 0 : Math.min(100, (value / 500) * 100)}%` }}
                />
              </span>
              <span className={`text-right tabular-nums ${isLive ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                {value === null ? '—' : valueFormatter.format(value)}
                {!isLive && value !== null ? <span className="sr-only"> (last known)</span> : null}
              </span>
            </li>
          )
        })}
      </ul>
      {hasLastKnown ? (
        <p className="mt-2 text-[11px] text-slate-400">Grey values are last known; the live source didn't report them.</p>
      ) : null}
    </div>
  )
}
