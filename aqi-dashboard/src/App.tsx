import { AqiMap } from './components/AqiMap'
import { ComparisonTable } from './components/ComparisonTable'
import { ControlBar } from './components/ControlBar'
import { Legend } from './components/Legend'
import { SelectedStationChartPanel } from './components/SelectedStationChartPanel'
import { StationSidebar } from './components/StationSidebar'
import { usePrefetchWaqiLiveStations } from './hooks/usePrefetchWaqiLiveStations'

export function App() {
  usePrefetchWaqiLiveStations()

  return (
    <main className="min-h-screen overflow-x-clip bg-gradient-to-b from-slate-50 via-white to-sky-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:gap-4">
        <header className="px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Kolkata AQI Dashboard</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Air quality across six Kolkata monitoring stations
          </h1>
        </header>

        <ControlBar />

        {/*
          Phone: map → selected station → chart/table/legend.
          Desktop (xl): map and the rest in the left column, station panel on the right spanning both rows.
        */}
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0 xl:col-start-1 xl:row-start-1">
            <AqiMap />
          </div>
          <div className="min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <StationSidebar />
          </div>
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6 xl:col-start-1 xl:row-start-2">
            <SelectedStationChartPanel />
            <ComparisonTable />
            <Legend />
          </div>
        </div>
      </div>
    </main>
  )
}
