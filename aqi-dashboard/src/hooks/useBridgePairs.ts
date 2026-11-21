import { useEffect, useState } from 'react'
import { resolveAppUrl } from '../utils/appUrl'
import { buildBridgePairs, type BridgePair } from '../utils/bridges'

let request: Promise<BridgePair[]> | null = null

/** The 7 precomputed station-pair bridges joined to station names and coordinates (loaded once). */
function loadBridgePairs() {
  if (!request) {
    request = Promise.all([
      fetch(resolveAppUrl('/data/bridge_polygons.json')).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load bridge polygons (${response.status})`)
        }
        return response.json()
      }),
      fetch(resolveAppUrl('/data/station_master.json')).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load station list (${response.status})`)
        }
        return response.json()
      }),
    ])
      .then(([bridges, stations]) => buildBridgePairs(bridges.features ?? [], stations))
      .catch((error) => {
        request = null
        throw error
      })
  }
  return request
}

export function useBridgePairs(enabled = true) {
  const [pairs, setPairs] = useState<BridgePair[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }
    let active = true
    loadBridgePairs()
      .then((loaded) => {
        if (active) {
          setPairs(loaded)
          setError(null)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError : new Error('Failed to load bridges'))
        }
      })
    return () => {
      active = false
    }
  }, [enabled])

  return { pairs, error }
}
