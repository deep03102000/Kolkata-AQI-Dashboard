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
    <main className="min-h-screen overflow-x-clip bg-slate-50 px-3 py-5 text-slate-900 sm:px-5 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
        <header className="animate-fade-up px-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Kolkata air quality</h1>
          <p className="mt-0.5 text-sm text-slate-500">Six CPCB monitoring stations · live and 2024–2025 history</p>
        </header>

        <ControlBar />

        {/*
          Phone: map → selected station → chart/table/legend.
          Desktop (xl): map and the rest in the left column, station panel on the right spanning both rows.
        */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="animate-fade-up min-w-0 xl:col-start-1 xl:row-start-1" style={{ animationDelay: '80ms' }}>
            <AqiMap />
          </div>
          <div className="animate-fade-up min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1" style={{ animationDelay: '140ms' }}>
            <StationSidebar />
          </div>
          <div className="stagger flex min-w-0 flex-col gap-4 sm:gap-5 xl:col-start-1 xl:row-start-2">
            <SelectedStationChartPanel />
            <ComparisonTable />
            <Legend />
          </div>
        </div>
      </div>
    </main>
  )
}
