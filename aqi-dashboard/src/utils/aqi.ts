import type { DateRange, StationMode } from '../context/StationContext'

export type PollutantRecord = {
  date: string
  pm25: number
  pm10: number
  no2: number
  so2: number
  co: number
  o3: number
  nh3?: number
}

type Breakpoint = {
  lowConcentration: number
  highConcentration: number
  lowIndex: number
  highIndex: number
}

type AqiCategory = {
  label: string
  className: string
  color: string
}

export type AqiSummary = {
  value: number
  category: AqiCategory
  sourceLabel: string
  detailLabel: string
}

export type AqiChartPoint = {
  label: string
  value: number
}

const BREAKPOINTS: Record<keyof Pick<PollutantRecord, 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3'>, Breakpoint[]> = {
  pm25: [
    { lowConcentration: 0, highConcentration: 30, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 31, highConcentration: 60, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 61, highConcentration: 90, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 91, highConcentration: 120, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 121, highConcentration: 250, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 251, highConcentration: 500, lowIndex: 401, highIndex: 500 },
  ],
  pm10: [
    { lowConcentration: 0, highConcentration: 50, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 51, highConcentration: 100, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 101, highConcentration: 250, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 251, highConcentration: 350, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 351, highConcentration: 430, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 431, highConcentration: 1000, lowIndex: 401, highIndex: 500 },
  ],
  no2: [
    { lowConcentration: 0, highConcentration: 40, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 41, highConcentration: 80, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 81, highConcentration: 180, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 181, highConcentration: 280, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 281, highConcentration: 400, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 401, highConcentration: 1000, lowIndex: 401, highIndex: 500 },
  ],
  so2: [
    { lowConcentration: 0, highConcentration: 40, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 41, highConcentration: 80, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 81, highConcentration: 380, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 381, highConcentration: 800, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 801, highConcentration: 1600, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 1601, highConcentration: 5000, lowIndex: 401, highIndex: 500 },
  ],
  co: [
    { lowConcentration: 0, highConcentration: 1, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 1.1, highConcentration: 2, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 2.1, highConcentration: 10, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 10.1, highConcentration: 17, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 17.1, highConcentration: 34, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 34.1, highConcentration: 60, lowIndex: 401, highIndex: 500 },
  ],
  o3: [
    { lowConcentration: 0, highConcentration: 50, lowIndex: 0, highIndex: 50 },
    { lowConcentration: 51, highConcentration: 100, lowIndex: 51, highIndex: 100 },
    { lowConcentration: 101, highConcentration: 168, lowIndex: 101, highIndex: 200 },
    { lowConcentration: 169, highConcentration: 208, lowIndex: 201, highIndex: 300 },
    { lowConcentration: 209, highConcentration: 748, lowIndex: 301, highIndex: 400 },
    { lowConcentration: 749, highConcentration: 1200, lowIndex: 401, highIndex: 500 },
  ],
}

const AQI_CATEGORIES: Array<{ ceiling: number; label: string; className: string; color: string }> = [
  { ceiling: 50, label: 'Good', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#10b981' },
  { ceiling: 100, label: 'Satisfactory', className: 'bg-lime-50 text-lime-700 ring-lime-200', color: '#84cc16' },
  { ceiling: 200, label: 'Moderate', className: 'bg-amber-50 text-amber-700 ring-amber-200', color: '#f59e0b' },
  { ceiling: 300, label: 'Poor', className: 'bg-orange-50 text-orange-700 ring-orange-200', color: '#f97316' },
  { ceiling: 400, label: 'Very Poor', className: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#f43f5e' },
  { ceiling: Number.POSITIVE_INFINITY, label: 'Severe', className: 'bg-red-50 text-red-700 ring-red-200', color: '#dc2626' },
]

function interpolate(value: number, breakpoint: Breakpoint) {
  const span = breakpoint.highConcentration - breakpoint.lowConcentration
  if (span <= 0) {
    return breakpoint.highIndex
  }

  const ratio = (value - breakpoint.lowConcentration) / span
  return breakpoint.lowIndex + ratio * (breakpoint.highIndex - breakpoint.lowIndex)
}

function getSubIndex(value: number, pollutant: keyof typeof BREAKPOINTS) {
  if (!Number.isFinite(value)) {
    return null
  }

  const breakpoint = BREAKPOINTS[pollutant].find(
    (entry) => value >= entry.lowConcentration && value <= entry.highConcentration,
  )

  if (!breakpoint) {
    return value > BREAKPOINTS[pollutant][BREAKPOINTS[pollutant].length - 1].highConcentration ? 500 : null
  }

  return interpolate(value, breakpoint)
}

export function calculateRecordAqi(record: PollutantRecord) {
  const indices = [
    getSubIndex(record.pm25, 'pm25'),
    getSubIndex(record.pm10, 'pm10'),
    getSubIndex(record.no2, 'no2'),
    getSubIndex(record.so2, 'so2'),
    getSubIndex(record.co, 'co'),
    getSubIndex(record.o3, 'o3'),
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (indices.length === 0) {
    return null
  }

  return Math.max(...indices)
}

export const AQI_LEGEND_ITEMS = AQI_CATEGORIES.map(({ label, className, color }) => ({
  label,
  className,
  color,
}))

export function getAqiCategory(value: number): AqiCategory {
  return AQI_CATEGORIES.find((entry) => value <= entry.ceiling) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
}

export function getAqiColor(value: number) {
  return getAqiCategory(value).color
}

function filterRecordsByRange(records: PollutantRecord[], dateRange: DateRange) {
  const { startDate, endDate } = dateRange

  if (!startDate || !endDate) {
    return []
  }

  return records.filter((record) => {
    const recordDate = record.date.slice(0, 10)
    return recordDate >= startDate && recordDate <= endDate
  })
}

export function getStationAqiSummary(records: PollutantRecord[], mode: StationMode, dateRange: DateRange) {
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date))
  const latestRecord = sortedRecords[sortedRecords.length - 1]

  if (!latestRecord) {
    return null
  }

  const latestAqi = calculateRecordAqi(latestRecord)
  if (latestAqi === null) {
    return null
  }

  if (mode === 'Historical') {
    const filtered = filterRecordsByRange(sortedRecords, dateRange)
    if (filtered.length > 0) {
      const values = filtered
        .map((record) => calculateRecordAqi(record))
        .filter((value): value is number => typeof value === 'number')

      if (values.length > 0) {
        const average = values.reduce((sum, value) => sum + value, 0) / values.length
        return {
          value: Math.round(average),
          category: getAqiCategory(average),
          sourceLabel: 'Historical AQI',
          detailLabel: `${dateRange.startDate} to ${dateRange.endDate}`,
        } satisfies AqiSummary
      }
    }
  }

  return {
    value: Math.round(latestAqi),
    category: getAqiCategory(latestAqi),
    sourceLabel: mode === 'Live' ? 'Live AQI' : 'Historical AQI',
    detailLabel: 'Latest available reading',
  } satisfies AqiSummary
}

export function getStationChartPoints(
  records: PollutantRecord[],
  mode: StationMode,
  dateRange: DateRange,
  maxPoints = 96,
) {
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date))
  const filteredRecords =
    mode === 'Historical' ? filterRecordsByRange(sortedRecords, dateRange) : sortedRecords.slice(-maxPoints)
  const activeRecords = filteredRecords.length > 0 ? filteredRecords : sortedRecords.slice(-maxPoints)

  if (activeRecords.length === 0) {
    return []
  }

  const stride = Math.max(1, Math.ceil(activeRecords.length / maxPoints))

  return activeRecords
    .filter((_, index) => index % stride === 0)
    .map((record) => ({
      label: record.date.slice(5, 16).replace('T', ' '),
      value: Math.round(calculateRecordAqi(record) ?? 0),
    }))
    .filter((point) => Number.isFinite(point.value))
}