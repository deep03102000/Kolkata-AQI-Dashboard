import { AqiMap } from './components/AqiMap'
import { ComparisonTable } from './components/ComparisonTable'
import { Legend } from './components/Legend'
import { SelectedStationChartPanel } from './components/SelectedStationChartPanel'
import { StationSidebar } from './components/StationSidebar'
import { usePrefetchWaqiLiveStations } from './hooks/usePrefetchWaqiLiveStations'

export function App() {
  usePrefetchWaqiLiveStations()

  return (
    <main className="min-h-screen overflow-x-clip bg-gradient-to-b from-slate-50 via-white to-sky-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:px-6 sm:py-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">
            Kolkata AQI Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Live air quality for the six monitored stations
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            The dashboard now stays on the live WAQI feed so every station card, popup, and comparison row reflects current air-quality readings.
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-1 flex min-w-0 flex-col gap-4 sm:gap-6 xl:order-none">
            <AqiMap />
            <SelectedStationChartPanel />
            <ComparisonTable />
            <Legend />
          </div>
          <div className="order-2 min-w-0 xl:order-none">
            <StationSidebar />
          </div>
        </div>
      </div>
    </main>
  )
}
