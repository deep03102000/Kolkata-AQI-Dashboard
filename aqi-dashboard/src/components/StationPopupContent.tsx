import { useMemo } from 'react'
import { useStationContext } from '../context/StationContext'
import { getLiveWaqiSummary, type WaqiLiveStationData } from '../utils/waqi'

type StationIdentity = {
  station_id: string
  station_name: string
}

type Props = {
  station: StationIdentity
  liveData: WaqiLiveStationData | null
  liveLoading: boolean
  liveError: boolean
  liveStale: boolean
}

type StationSummaryCardProps = {
  station: StationIdentity
  summary: ReturnType<typeof getLiveWaqiSummary>
  sourceLabel?: string
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
}

function AlertBanner({ tone, children }: { tone: 'error' | 'loading'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-sky-200 bg-sky-50 text-sky-700'

  return <div className={`rounded-2xl border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

export function StationSummaryCard({ station, summary, sourceLabel }: StationSummaryCardProps) {
  return (
    <div className="min-w-0 max-w-[250px] space-y-2 sm:max-w-[280px]">
      <div className="space-y-1">
        <p className="break-words text-sm font-semibold text-slate-900">{station.station_name}</p>
        <p className="break-all text-xs text-slate-500">{station.station_id}</p>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {sourceLabel ?? summary.sourceLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${summary.category.className}`}
          >
            {summary.category.label}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">{summary.value}</p>
          <span className="text-right text-xs leading-5 text-slate-500">{summary.detailLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function StationPopupContent({
  station,
  liveData,
  liveLoading,
  liveError,
  liveStale,
}: Props) {
  const { selectedStationId } = useStationContext()

  const summary = useMemo(() => {
    return liveData ? getLiveWaqiSummary(liveData) : null
  }, [liveData])

  const isSelected = selectedStationId === station.station_id
  const liveUpdatedAt = liveData?.updatedAt ?? null

  return (
    <div className="min-w-0 max-w-[250px] space-y-3 sm:max-w-[280px]">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="break-words text-sm font-semibold text-slate-900">{station.station_name}</p>
          {isSelected ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Selected
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all text-xs text-slate-500">{station.station_id}</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
            Live AQI
          </span>
        </div>
      </div>

      {liveLoading ? <AlertBanner tone="loading">Loading live AQI data...</AlertBanner> : null}
      {liveError ? <AlertBanner tone="error">Live AQI data could not be loaded.</AlertBanner> : null}

      {liveLoading ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <SkeletonBlock className="h-3 w-24" />
          <div className="flex items-end justify-between gap-3">
            <SkeletonBlock className="h-10 w-16" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      ) : summary ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {summary.sourceLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${summary.category.className}`}
            >
              {summary.category.label}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{summary.value}</p>
            <div className="flex flex-col items-end gap-1">
              {liveUpdatedAt ? (
                <span className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-500/20">
                  <span className="truncate">Last updated {liveUpdatedAt}</span>
                </span>
              ) : null}
              {liveStale ? (
                <span className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  <span className="truncate">Stale live data</span>
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">{summary.detailLabel}</p>
        </div>
      ) : null}
    </div>
  )
}
