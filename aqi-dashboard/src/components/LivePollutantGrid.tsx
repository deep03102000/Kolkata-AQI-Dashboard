import { type CSSProperties } from 'react'
import { type WaqiPollutantKey, type WaqiResolvedPollutants } from '../utils/waqi'

type Props = {
  pollutants: WaqiResolvedPollutants
  accentColor: string
  accentLabelClassName: string
}

const POLLUTANT_LABELS: Record<WaqiPollutantKey, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO2',
  so2: 'SO2',
  co: 'CO',
  o3: 'O3',
  nh3: 'NH3',
}

const valueFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
})

export function LivePollutantGrid({ pollutants, accentColor, accentLabelClassName }: Props) {
  const cardStyle = { '--accent-color': accentColor } as CSSProperties

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(Object.keys(POLLUTANT_LABELS) as WaqiPollutantKey[]).map((key) => {
        const pollutant = pollutants[key]
        const hasValue = typeof pollutant.value === 'number' && Number.isFinite(pollutant.value)

        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm shadow-slate-200/40 ring-1 ring-transparent transition"
            style={{
              ...cardStyle,
              borderLeftColor: accentColor,
              borderLeftWidth: '4px',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {POLLUTANT_LABELS[key]}
              </p>
              {pollutant.source === 'last known' ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ring-1 ${accentLabelClassName}`}>
                  Last known
                </span>
              ) : (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ring-1"
                  style={{ backgroundColor: `${accentColor}14`, color: accentColor, borderColor: `${accentColor}33` }}
                >
                  Live
                </span>
              )}
            </div>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {hasValue && pollutant.value !== null ? valueFormatter.format(pollutant.value) : '—'}
            </p>
            <div
              className="mt-2 h-1.5 w-full rounded-full bg-slate-100"
              aria-hidden="true"
            >
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: hasValue && pollutant.value !== null ? '100%' : '35%',
                  backgroundColor: accentColor,
                  opacity: pollutant.source === 'last known' ? 0.55 : 0.9,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
