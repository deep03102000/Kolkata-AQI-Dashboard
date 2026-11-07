import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react'

export type StationMode = 'Live' | 'Historical'

export type CoverageMode = 'circles' | 'voronoi'

export type DateRange = {
  startDate: string | null
  endDate: string | null
}

export type TrioStationId = 'site_5111' | 'site_5126' | 'site_5238'

export const TRIO_STATION_OPTIONS: Array<{ stationId: TrioStationId; label: string }> = [
  { stationId: 'site_5111', label: 'Jadavpur' },
  { stationId: 'site_5126', label: 'Rabindra Sarobar' },
  { stationId: 'site_5238', label: 'Ballygunge' },
]

export type StationContextValue = {
  selectedStationId: string | null
  setSelectedStationId: (stationId: string | null) => void
  mode: StationMode
  setMode: (mode: StationMode) => void
  coverageMode: CoverageMode
  setCoverageMode: (coverageMode: CoverageMode) => void
  showCircle3km: boolean
  setShowCircle3km: (visible: boolean) => void
  showBridgePolygons: boolean
  setShowBridgePolygons: (visible: boolean) => void
  selectedTrioStations: Set<TrioStationId>
  toggleTrioStationId: (stationId: TrioStationId) => void
  setSelectedTrioStations: (stationIds: Set<TrioStationId>) => void
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
}

const StationContext = createContext<StationContextValue | undefined>(undefined)

export function StationProvider({ children }: { children: ReactNode }) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [mode, setMode] = useState<StationMode>('Live')
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('voronoi')
  const [showCircle3km, setShowCircle3km] = useState(false)
  const [showBridgePolygons, setShowBridgePolygons] = useState(false)
  // Keep the trio overlay invisible until the user actively checks at least one station.
  const [selectedTrioStations, setSelectedTrioStations] = useState<Set<TrioStationId>>(() => new Set())
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  })

  // Keep trio selection reactive: each checkbox click updates the Set immediately, so the map repaints with no separate apply step.
  const toggleTrioStationId = useMemo(() => {
    return (stationId: TrioStationId) => {
      setSelectedTrioStations((current) => {
        const next = new Set(current)

        if (next.has(stationId)) {
          next.delete(stationId)
          return next
        }

        next.add(stationId)
        return next
      })
    }
  }, [])

  const value = useMemo<StationContextValue>(
    () => ({
      selectedStationId,
      setSelectedStationId,
      mode,
      setMode,
      coverageMode,
      setCoverageMode,
      showCircle3km,
      setShowCircle3km,
      showBridgePolygons,
      setShowBridgePolygons,
      selectedTrioStations,
      toggleTrioStationId,
      setSelectedTrioStations,
      dateRange,
      setDateRange,
    }),
    [
      coverageMode,
      dateRange,
      mode,
      selectedStationId,
      selectedTrioStations,
      showBridgePolygons,
      showCircle3km,
      toggleTrioStationId,
    ],
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


