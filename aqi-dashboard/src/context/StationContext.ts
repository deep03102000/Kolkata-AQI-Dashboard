import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react'

export type StationMode = 'Live' | 'Historical'

export type CoverageMode = 'circles' | 'voronoi'

export type DateRange = {
  startDate: string | null
  endDate: string | null
}

export type StationContextValue = {
  selectedStationId: string | null
  setSelectedStationId: (stationId: string | null) => void
  mode: StationMode
  setMode: (mode: StationMode) => void
  coverageMode: CoverageMode
  setCoverageMode: (coverageMode: CoverageMode) => void
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
}

const StationContext = createContext<StationContextValue | undefined>(undefined)

export function StationProvider({ children }: { children: ReactNode }) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('voronoi')
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  })

  const mode: StationMode = 'Live'
  const setMode = (_mode: StationMode) => {
    // Live AQI is the primary dashboard state, so the mode is locked here.
  }

  const value = useMemo<StationContextValue>(
    () => ({
      selectedStationId,
      setSelectedStationId,
      mode,
      setMode,
      coverageMode,
      setCoverageMode,
      dateRange,
      setDateRange,
    }),
    [coverageMode, dateRange, selectedStationId],
  )

  return createElement(StationContext.Provider, { value }, children)
}

export function useStationContext() {
  const context = useContext(StationContext)

  if (!context) {
    throw new Error('useStationContext must be used within a StationProvider')
  }

  return context
}
