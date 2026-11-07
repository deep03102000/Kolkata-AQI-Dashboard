import { AQI_LEGEND_ITEMS } from '../utils/aqi'

// Index ranges for each band, in the same order as AQI_LEGEND_ITEMS (India's CPCB scale).
const BAND_RANGES = ['0–50', '51–100', '101–200', '201–300', '301–400', '401+']

export function Legend() {
  return (
    <section className="card">
      <h2 className="text-base font-semibold text-slate-900">What the colours mean</h2>
      <p className="mt-0.5 text-xs text-slate-500">AQI categories on India's CPCB scale.</p>

      {/* One continuous colour scale with each band's name and range underneath. */}
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        {AQI_LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex-1" style={{ backgroundColor: item.color }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-y-2 sm:grid-cols-6">
        {AQI_LEGEND_ITEMS.map((item, index) => (
          <div key={item.label} className="min-w-0 pr-1">
            <p className="truncate text-xs font-medium text-slate-800">{item.label}</p>
            <p className="text-[11px] tabular-nums text-slate-400">{BAND_RANGES[index]}</p>
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-1.5 text-xs leading-5 text-slate-500">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-medium text-slate-700">CPCB</dt>
          <dd>Official hourly reading from the station itself.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-medium text-slate-700">Nearby sensor</dt>
          <dd>Used only when a station's own feed is offline; the sensor is named.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-medium text-slate-700">Weather</dt>
          <dd>
            Temperature and humidity are 15-minute model estimates for each station's location from{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700">
              Open-Meteo
            </a>
            , not the station's own sensors.
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-medium text-slate-700">Zones</dt>
          <dd>Each shaded area is closest to the station inside it.</dd>
        </div>
      </dl>
    </section>
  )
}
