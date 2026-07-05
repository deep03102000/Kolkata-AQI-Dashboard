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
      const labels = displayRecords.map((record) => record.date.slice(5, 16).replace('T', ' '))
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
            maxTicksLimit: 6,
            color: '#64748b',
            maxRotation: 0,
            autoSkip: true,
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
    [],
  )

  const visibleSeriesCount = SERIES.filter((series) => activeSeries[series.key]).length

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Historical chart</p>
          <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">{stationName}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {mode}
        </span>
      </div>

      <SummaryStats records={displayRecords} />

      <div className="mb-4 mt-4 flex flex-wrap gap-2">
        {SERIES.map((series) => {
          const checked = activeSeries[series.key]

          return (
            <label
              key={series.key}
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${checked ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-slate-200 bg-white text-slate-400'}`}
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
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
            </label>
          )
        })}
      </div>

      <div className="h-64 min-w-0">
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
