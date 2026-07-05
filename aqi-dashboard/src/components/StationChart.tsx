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
  type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'
import { useStationContext } from '../context/StationContext'
import { getStationChartPoints, type PollutantRecord } from '../utils/aqi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ChartLegend)

type Props = {
  stationName: string
  records: PollutantRecord[]
}

export function StationChart({ stationName, records }: Props) {
  const { mode, dateRange } = useStationContext()

  const points = useMemo(() => getStationChartPoints(records, mode, dateRange), [dateRange, mode, records])

  const chartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: `${stationName} AQI`,
          data: points.map((point) => point.value),
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.12)',
          pointBackgroundColor: '#0f766e',
          pointBorderColor: '#0f766e',
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: true,
        },
      ],
    }),
    [points, stationName],
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
          displayColors: false,
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 6,
            color: '#64748b',
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.15)',
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 500,
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AQI trend</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{stationName}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {mode}
        </span>
      </div>

      <div className="h-56">
        {points.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No AQI points available for this selection.
          </div>
        )}
      </div>
    </div>
  )
}