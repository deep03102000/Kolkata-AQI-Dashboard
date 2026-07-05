import { useEffect, useState } from 'react'

export type RoadNetworkFeature = {
  type: 'Feature'
  properties: Record<string, string | number | boolean | null>
  geometry: {
    type: 'LineString' | 'MultiLineString'
    coordinates: number[][] | number[][][]
  }
}

export type RoadNetworkGeoJson = {
  type: 'FeatureCollection'
  features: RoadNetworkFeature[]
}

export type RoadNetworkStatus = 'idle' | 'loading' | 'ready' | 'error'

const roadNetworkCache = new Map<string, Promise<RoadNetworkGeoJson>>()

function buildRoadNetworkUrls(stationId: string | null | undefined) {
  const urls = [] as string[]

  if (stationId) {
    urls.push(`/data/roads_station_${stationId}.json`)
  }

  urls.push('/data/kolkata_roads.json')
  return urls
}

function loadRoadNetwork(stationId: string | null | undefined) {
  const cacheKey = stationId ?? '__combined__'
  const cached = roadNetworkCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const request = (async () => {
    let lastError: unknown = null

    for (const url of buildRoadNetworkUrls(stationId)) {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          lastError = new Error(`Failed to load ${url}`)
          continue
        }

        return response.json() as Promise<RoadNetworkGeoJson>
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Road network is unavailable')
  })()

  roadNetworkCache.set(cacheKey, request)
  return request
}

export function useRoadNetworkPayload(stationId: string | null | undefined, enabled = true) {
  const [data, setData] = useState<RoadNetworkGeoJson | null>(null)
  const [status, setStatus] = useState<RoadNetworkStatus>(enabled ? 'loading' : 'idle')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setStatus('idle')
      setError(null)
      return
    }

    let cancelled = false

    setStatus('loading')
    setError(null)

    loadRoadNetwork(stationId)
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setStatus('ready')
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setData(null)
          setStatus('error')
          setError(loadError instanceof Error ? loadError : new Error('Failed to load road network'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, stationId])

  return { data, status, error }
}
