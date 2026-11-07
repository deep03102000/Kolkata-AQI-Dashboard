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

export function LivePollutantGrid({ pollutants }: Props) {
  const keys = Object.keys(POLLUTANT_LABELS) as WaqiPollutantKey[]
  const hasLastKnown = keys.some((key) => pollutants[key].source === 'last known')

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
        {keys.map((key) => {
          const pollutant = pollutants[key]
          const hasValue = typeof pollutant.value === 'number' && Number.isFinite(pollutant.value)
          const isLive = pollutant.source === 'live'

          return (
            <div
              key={key}
              className={`rounded-xl border px-2.5 py-2 ${
                isLive ? 'border-emerald-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
              }`}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
                {POLLUTANT_LABELS[key]}
              </p>
              <p className={`mt-0.5 text-base font-semibold tabular-nums ${isLive ? 'text-slate-900' : 'text-slate-500'}`}>
                {hasValue && pollutant.value !== null ? valueFormatter.format(pollutant.value) : '—'}
              </p>
              <span className="sr-only">{isLive ? 'live value' : 'last known value'}</span>
            </div>
          )
        })}
      </div>
      {hasLastKnown ? (
        <p className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Last known (live value unavailable)
          </span>
        </p>
      ) : null}
    </div>
  )
}
