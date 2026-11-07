import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend as ChartLegend,
  type ChartData,
  type ChartDataset,
  type ChartOptions,
} from 'chart.js'
import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useStationContext } from '../context/StationContext'
import type { PollutantRecord } from '../utils/aqi'
import { SummaryStats } from './SummaryStats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ChartLegend)

type Props = {
  stationName: string
  records: PollutantRecord[]
}

type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3' | 'nh3'

type SeriesConfig = {
  key: PollutantKey
  label: string
  color: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SERIES: SeriesConfig[] = [
  { key: 'pm25', label: 'PM2.5', color: '#0f766e' },
  { key: 'pm10', label: 'PM10', color: '#2563eb' },
  { key: 'no2', label: 'NO2', color: '#7c3aed' },
  { key: 'so2', label: 'SO2', color: '#d97706' },
  { key: 'co', label: 'CO', color: '#dc2626' },
  { key: 'o3', label: 'O3', color: '#0891b2' },
  { key: 'nh3', label: 'NH3', color: '#16a34a' },
]

function filterRecords(
  records: PollutantRecord[],
  mode: 'Live' | 'Historical',
  startDate: string | null,
  endDate: string | null,
  maxPoints = 96,
) {
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date))

  const filteredRecords =
    mode === 'Historical' && startDate && endDate
      ? sortedRecords.filter((record) => {
          const recordDate = record.date.slice(0, 10)
          return recordDate >= startDate && recordDate <= endDate
        })
      : sortedRecords.slice(-maxPoints)

  const activeRecords = filteredRecords.length > 0 ? filteredRecords : sortedRecords.slice(-maxPoints)
  const stride = Math.max(1, Math.ceil(activeRecords.length / maxPoints))

  return activeRecords.filter((_, index) => index % stride === 0)
}

export default function ChartPanel({ stationName, records }: Props) {
  const { mode, dateRange } = useStationContext()
  const [activeSeries, setActiveSeries] = useState<Record<PollutantKey, boolean>>({
    pm25: true,
    pm10: true,
    no2: true,
    so2: true,
    co: true,
    o3: true,
    nh3: true,
  })

  const displayRecords = useMemo(
    () => filterRecords(records, mode, dateRange.startDate, dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, mode, records],
  )

  const chartData = useMemo<ChartData<'line'>>(
    () => {
      // Full label ("1 Nov, 06:00") is used by the tooltip; the axis shortens it below.
      const labels = displayRecords.map((record) => {
        const day = Number(record.date.slice(8, 10))
        const month = MONTHS[Number(record.date.slice(5, 7)) - 1] ?? ''
        return `${day} ${month}, ${record.date.slice(11, 16)}`
      })
      const visibleSeries = SERIES.filter((series) => activeSeries[series.key])

      const datasets: ChartDataset<'line'>[] = visibleSeries.map((series) => ({
        label: series.label,
        data: displayRecords.map((record) => {
          const value = record[series.key]
          return typeof value === 'number' ? value : null
        }),
        borderColor: series.color,
        backgroundColor: `${series.color}20`,
        pointBackgroundColor: series.color,
        pointBorderColor: series.color,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 2,
        tension: 0.28,
        fill: false,
        spanGaps: true,
      }))

      return { labels, datasets }
    },
    [activeSeries, displayRecords],
  )

  const spansMultipleDays =
    displayRecords.length > 1 &&
    displayRecords[0].date.slice(0, 10) !== displayRecords[displayRecords.length - 1].date.slice(0, 10)
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
          displayColors: true,
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: isNarrow ? 4 : 7,
            color: '#64748b',
            maxRotation: 0,
            autoSkip: true,
            callback(value) {
              const label = String(this.getLabelForValue(Number(value)))
              const [datePart, timePart] = label.split(', ')
              return spansMultipleDays ? datePart : timePart
            },
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#64748b',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
          },
        },
      },
    }),
    [isNarrow, spansMultipleDays],
  )

  const visibleSeriesCount = SERIES.filter((series) => activeSeries[series.key]).length

  return (
    <div className="min-w-0" aria-label={`${stationName} pollutant chart`}>

      <SummaryStats records={displayRecords} />

      <div className="mb-3.5 mt-3.5 flex flex-wrap gap-1.5">
        {SERIES.map((series) => {
          const checked = activeSeries[series.key]

          return (
            <label
              key={series.key}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${checked ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-slate-200 bg-white text-slate-400'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const nextChecked = event.target.checked
                  setActiveSeries((current) => ({
                    ...current,
                    [series.key]: nextChecked,
                  }))
                }}
                className="h-3 w-3 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
            </label>
          )
        })}
      </div>

      <div className="h-56 min-w-0 sm:h-60">
        {displayRecords.length > 0 && visibleSeriesCount > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {displayRecords.length === 0
              ? 'No historical data available for this selection.'
              : 'Select at least one parameter series.'}
          </div>
        )}
      </div>
    </div>
  )
}
