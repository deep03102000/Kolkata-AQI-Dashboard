import { useEffect, useMemo, useRef, useState } from "react";
import { WAQI_STATION_UIDS } from "../data/waqiStationUids";
import {
  buildResolvedWaqiPollutants,
  buildWaqiGeoFeedUrl,
  buildWaqiUidFeedUrl,
  hasWaqiLiveAccess,
  isWaqiTimestampStale,
  normalizeWaqiPollutants,
  type LiveAqiData,
  type WaqiFeedResponse,
  type WaqiNormalizedPollutants,
} from "../utils/waqi";
import type { PollutantRecord } from "../utils/aqi";

type StationGeo = {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
};

type LiveAqiResult = {
  payload: LiveAqiData;
  stale: boolean;
};

const LIVE_POLL_INTERVAL_MS = 15_000;
const LIVE_CACHE_DB_NAME = "aqi-dashboard-live-cache";
const LIVE_CACHE_STORE_NAME = "responses";
const LIVE_CACHE_DB_VERSION = 1;

const stationMasterCache = new Map<string, StationGeo>();
let stationMasterRequest: Promise<StationGeo[]> | null = null;
const stationFallbackCache = new Map<
  string,
  Promise<Partial<WaqiNormalizedPollutants>>
>();
const waqiUidCache = new Map<string, number | null>();
const waqiLiveCache = new Map<string, LiveAqiResult>();
const waqiLiveRequestCache = new Map<string, Promise<LiveAqiResult>>();
let liveCacheDbPromise: Promise<IDBDatabase | null> | null = null;

async function openLiveCacheDb() {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  if (!liveCacheDbPromise) {
    liveCacheDbPromise = new Promise((resolve) => {
      const request = indexedDB.open(LIVE_CACHE_DB_NAME, LIVE_CACHE_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LIVE_CACHE_STORE_NAME)) {
          db.createObjectStore(LIVE_CACHE_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  return liveCacheDbPromise;
}

function getLiveCacheKey(stationId: string) {
  return `station:${stationId}`;
}

async function readLiveCacheFromIndexedDb(stationId: string) {
  const db = await openLiveCacheDb();
  if (!db) {
    return null;
  }

  return new Promise<LiveAqiResult | null>((resolve) => {
    const transaction = db.transaction(LIVE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(LIVE_CACHE_STORE_NAME);
    const request = store.get(getLiveCacheKey(stationId));

    request.onsuccess = () => {
      resolve((request.result as LiveAqiResult | undefined) ?? null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

async function writeLiveCacheToIndexedDb(
  stationId: string,
  payload: LiveAqiResult,
) {
  const db = await openLiveCacheDb();
  if (!db) {
    return;
  }

  return new Promise<void>((resolve) => {
    const transaction = db.transaction(LIVE_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LIVE_CACHE_STORE_NAME);
    store.put(payload, getLiveCacheKey(stationId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

async function getCachedLiveAqi(stationId: string) {
  const memoryCached = waqiLiveCache.get(stationId);
  if (memoryCached) {
    return memoryCached;
  }

  const indexedDbCached = await readLiveCacheFromIndexedDb(stationId);
  if (indexedDbCached) {
    waqiLiveCache.set(stationId, indexedDbCached);
    return indexedDbCached;
  }

  return null;
}

async function loadStationMaster() {
  if (!stationMasterRequest) {
    stationMasterRequest = fetch("/data/station_master.json", {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load station master (${response.status})`);
        }

        return response.json() as Promise<StationGeo[]>;
      })
      .then((stations) => {
        stationMasterCache.clear();
        for (const station of stations) {
          stationMasterCache.set(station.station_id, station);
        }

        return stations;
      })
      .catch((error) => {
        stationMasterRequest = null;
        throw error;
      });
  }

  return stationMasterRequest;
}

async function resolveStationGeo(stationId: string) {
  const cachedStation = stationMasterCache.get(stationId);
  if (cachedStation) {
    return cachedStation;
  }

  const stations = await loadStationMaster();
  return stations.find((station) => station.station_id === stationId) ?? null;
}

function getLatestHistoricalPollutants(
  records: PollutantRecord[],
): Partial<WaqiNormalizedPollutants> {
  const latest = [...records]
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);

  if (!latest) {
    return {};
  }

  return {
    pm25: latest.pm25 ?? null,
    pm10: latest.pm10 ?? null,
    no2: latest.no2 ?? null,
    so2: latest.so2 ?? null,
    co: latest.co ?? null,
    o3: latest.o3 ?? null,
    nh3: latest.nh3 ?? null,
  };
}

async function loadHistoricalFallbackPollutants(stationId: string) {
  const cached = stationFallbackCache.get(stationId);
  if (cached) {
    return cached;
  }

  const request = fetch(`/data/station_${stationId}.json`, {
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load history for station ${stationId}`);
      }

      return response.json() as Promise<{ records: PollutantRecord[] }>;
    })
    .then((payload) => getLatestHistoricalPollutants(payload.records ?? []))
    .catch((error) => {
      stationFallbackCache.delete(stationId);
      throw error;
    });

  stationFallbackCache.set(stationId, request);
  return request;
}

async function resolveWaqiUidFromGeo(station: StationGeo) {
  const response = await fetch(
    buildWaqiGeoFeedUrl(station.latitude, station.longitude),
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`WAQI geo request failed with ${response.status}`);
  }

  const payload = (await response.json()) as WaqiFeedResponse;
  if (payload.status !== "ok" || !payload.data || Array.isArray(payload.data)) {
    return null;
  }

  return typeof payload.data.idx === "number" ? payload.data.idx : null;
}

async function fetchWaqiStationByUid(
  uid: number,
  station: StationGeo,
  stationId: string,
  fallbackPollutants: Partial<WaqiNormalizedPollutants>,
) {
  const response = await fetch(buildWaqiUidFeedUrl(uid), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WAQI request failed with ${response.status}`);
  }

  const payload = (await response.json()) as WaqiFeedResponse;
  if (payload.status !== "ok" || !payload.data || Array.isArray(payload.data)) {
    throw new Error("WAQI direct feed returned an error response");
  }

  const rawAqi =
    typeof payload.data.aqi === "string"
      ? Number(payload.data.aqi)
      : payload.data.aqi;
  if (typeof rawAqi !== "number" || !Number.isFinite(rawAqi)) {
    throw new Error("WAQI response did not contain a numeric AQI value");
  }

  const livePollutants = normalizeWaqiPollutants(payload.data);

  return {
    payload: {
      stationId,
      stationName: station.station_name,
      stationUid: typeof payload.data.idx === "number" ? payload.data.idx : uid,
      aqi: Math.round(rawAqi),
      pollutants: buildResolvedWaqiPollutants(
        livePollutants,
        fallbackPollutants,
      ),
      dominantPollutant:
        typeof payload.data.dominentpol === "string"
          ? payload.data.dominentpol
          : null,
      updatedAt:
        typeof payload.data.time?.s === "string" ? payload.data.time.s : null,
      cityName:
        typeof payload.data.city?.name === "string"
          ? payload.data.city.name
          : null,
      cityUrl:
        typeof payload.data.city?.url === "string"
          ? payload.data.city.url
          : null,
      raw: payload.data,
    } satisfies LiveAqiData,
    stale: false,
  } satisfies LiveAqiResult;
}

async function resolveWaqiUid(station: StationGeo) {
  const cachedUid = waqiUidCache.get(station.station_id);
  if (typeof cachedUid === "number" || cachedUid === null) {
    return cachedUid;
  }

  const mappedUid = WAQI_STATION_UIDS[station.station_id];
  if (typeof mappedUid === "number") {
    waqiUidCache.set(station.station_id, mappedUid);
    return mappedUid;
  }

  const geoUid = await resolveWaqiUidFromGeo(station);
  waqiUidCache.set(station.station_id, geoUid);
  return geoUid;
}

async function loadLiveAqi(stationId: string, forceRefresh = false) {
  const cached = waqiLiveCache.get(stationId);
  if (cached && !forceRefresh) {
    return cached;
  }

  const inFlight = waqiLiveRequestCache.get(stationId);
  if (inFlight && !forceRefresh) {
    return inFlight;
  }

  const request = (async () => {
    const [station, fallbackPollutants] = await Promise.all([
      resolveStationGeo(stationId),
      loadHistoricalFallbackPollutants(stationId),
    ]);

    if (!station) {
      throw new Error(
        `Station ${stationId} was not found in the station master`,
      );
    }

    const uid = await resolveWaqiUid(station);
    if (uid === null) {
      throw new Error("WAQI node could not be resolved");
    }

    try {
      const result = await fetchWaqiStationByUid(
        uid,
        station,
        stationId,
        fallbackPollutants,
      );
      const isFeedFresh = !isWaqiTimestampStale(result.payload.updatedAt)
      const normalizedResult = isFeedFresh ? result : { ...result, stale: true }
      waqiUidCache.set(stationId, uid);
      waqiLiveCache.set(stationId, normalizedResult);
      void writeLiveCacheToIndexedDb(stationId, normalizedResult);
      return normalizedResult;
    } catch (error) {
      const cachedFallback = await getCachedLiveAqi(stationId);
      if (cachedFallback) {
        return { ...cachedFallback, stale: true };
      }

      throw error;
    }
  })();

  waqiLiveRequestCache.set(stationId, request);

  try {
    return await request;
  } finally {
    waqiLiveRequestCache.delete(stationId);
  }
}

export async function loadLiveAqiSnapshot(
  stationId: string,
  forceRefresh = false,
) {
  const result = await loadLiveAqi(stationId, forceRefresh);
  return result.payload;
}
export function prefetchLiveAqiStations(stationIds: string[]) {
  if (!hasWaqiLiveAccess()) {
    return Promise.resolve([]);
  }

  return Promise.allSettled(
    stationIds
      .filter((stationId) => stationId.trim().length > 0)
      .map((stationId) => loadLiveAqi(stationId)),
  );
}

export function useLiveAqi(stationId: string | null, enabled = true) {
  const [data, setData] = useState<LiveAqiData | null>(null);
  const [loading, setLoading] = useState(enabled && Boolean(stationId));
  const [error, setError] = useState<Error | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !stationId) {
      hasLoadedRef.current = false;
      setData(null);
      setLoading(false);
      setError(null);
      setStale(false);
      return;
    }

    // Poll on a fixed interval and tear it down when the hook unmounts or the station changes.
    const interval = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, LIVE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, stationId]);

  useEffect(() => {
    if (!enabled || !stationId) {
      return;
    }

    const activeStationId = stationId;

    if (!hasWaqiLiveAccess()) {
      hasLoadedRef.current = false;
      setData(null);
      setLoading(false);
      setError(new Error("WAQI access is missing"));
      setStale(false);
      return;
    }

    let cancelled = false;
    const shouldShowLoading = !hasLoadedRef.current;

    if (shouldShowLoading) {
      setLoading(true);
    }

    async function load() {
      try {
        const result = await loadLiveAqi(activeStationId, refreshTick > 0);
        if (!cancelled) {
          hasLoadedRef.current = true;
          setData(result.payload);
          setStale(result.stale);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to load live AQI data"),
          );
          if (!hasLoadedRef.current) {
            setData(null);
            setLoading(false);
            setStale(false);
          }
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick, stationId]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      stale,
    }),
    [data, error, loading, stale],
  );
}
