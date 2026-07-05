import { AQI_LEGEND_ITEMS } from '../utils/aqi'

const SOURCE_ITEMS = [
  {
    label: 'Live',
    description: 'Came directly from WAQI for the current station node.',
    pillClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  {
    label: 'Last known',
    description: 'Filled from the most recent historical value when WAQI omits a pollutant.',
    pillClass: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  {
    label: 'Voronoi',
    description: 'Generated build-time coverage cells used to show station catchments on the map.',
    pillClass: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
]

export function Legend() {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
            AQI Legend
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">CPCB category colors</h3>
          <div className="mt-2 flex items-center gap-2 text-[11px] leading-5 text-slate-500">
            <span className="inline-flex h-2.5 w-6 shrink-0 items-center rounded-full bg-slate-200 px-0.5">
              <span className="h-0.5 w-full rounded-full bg-slate-500/70" aria-hidden="true" />
            </span>
            <span>Roads colored by nearest station</span>
          </div>
        </div>
        <p className="max-w-md text-xs leading-5 text-slate-500 sm:text-right">
          Stays readable against both station circles and Voronoi coverage fills.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AQI_LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <span
              className="h-4 w-4 shrink-0 rounded-md ring-1 ring-black/10"
              style={{
                backgroundColor: item.color,
                opacity: 0.9,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
              }}
              aria-hidden="true"
            />
            <span className="min-w-0 truncate text-xs font-medium text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {SOURCE_ITEMS.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1 ${item.pillClass}`}>
                {item.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
