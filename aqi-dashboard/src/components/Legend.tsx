import { AQI_LEGEND_ITEMS } from '../utils/aqi'

// Index ranges for each band, in the same order as AQI_LEGEND_ITEMS (India's CPCB scale).
const BAND_RANGES = ['0–50', '51–100', '101–200', '201–300', '301–400', '401+']

export function Legend() {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">What the colours mean</h2>
      <p className="mt-0.5 text-xs text-slate-500">AQI categories on India's CPCB scale.</p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {AQI_LEGEND_ITEMS.map((item, index) => (
          <div key={item.label} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="h-1.5" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <div className="px-2.5 py-1.5">
              <p className="truncate text-xs font-semibold text-slate-800">{item.label}</p>
              <p className="text-[11px] tabular-nums text-slate-500">{BAND_RANGES[index]}</p>
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
        <div className="flex items-baseline gap-2">
          <dt className="flex shrink-0 items-center gap-1 font-semibold text-slate-800">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
          </dt>
          <dd>Measured right now by WAQI.</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="flex shrink-0 items-center gap-1 font-semibold text-slate-800">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Last known
          </dt>
          <dd>WAQI didn't report this pollutant, so the station's latest recorded value is shown.</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="shrink-0 font-semibold text-slate-800">Nearest sensor</dt>
          <dd>The station's own feed is offline, so the closest live sensor is used and named.</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="shrink-0 font-semibold text-slate-800">Shaded zones</dt>
          <dd>Each area is closest to the station inside it. Roads take that station's colour.</dd>
        </div>
      </dl>
    </section>
  )
}
