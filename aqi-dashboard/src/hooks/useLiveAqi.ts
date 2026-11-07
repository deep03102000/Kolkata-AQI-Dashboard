import { useEffect, useMemo, useRef, useState } from "react";
import { WAQI_STATION_UIDS } from "../data/waqiStationUids";
import {
  buildResolvedWaqiPollutants,
  buildWaqiBoundsUrl,
  buildWaqiUidFeedUrl,
  hasWaqiLiveAccess,
  isWaqiTimestampStale,
  normalizeWaqiPollutants,
  type LiveAqiData,
  type WaqiBoundsResponse,
  type WaqiBoundsStation,
  type WaqiFeedResponse,
  type WaqiNearbySensor,
  type WaqiNormalizedPollutants,
} from "../utils/waqi";
import type { PollutantRecord } from "../utils/aqi";
import { resolveAppUrl } from "../utils/appUrl";
import {
  computeCpcbAqi,
  findCpcbStation,
  getCpcbPollutantValues,
  getDominantCpcbPollutant,
  loadCpcbFeed,
} from "../utils/cpcb";

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
const LIVE_CACHE_DB_VERSION = 2;

const stationMasterCache = new Map<string, StationGeo>();
let stationMasterRequest: Promise<StationGeo[]> | null = null;
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
  // v3: v2 entries may hold wrong-city readings from the removed geo lookup.
  return `v3:station:${stationId}`;
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
    stationMasterRequest = fetch(resolveAppUrl("/data/station_master.json"), {
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

/** The station's most recent recorded pollutant values (used as "last known"). */
export function getLatestHistoricalPollutants(
  records: PollutantRecord[],
): Partial<WaqiNormalizedPollutants> {
  // Records are long (≈70k); find the newest in one pass instead of sorting.
  const latest = records.reduce<PollutantRecord | undefined>(
    (newest, record) => (!newest || record.date > newest.date ? record : newest),
    undefined,
  );

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

// WAQI's feed/geo: endpoint returns unrelated cities (Lhasa, Shanghai) for
// Kolkata coordinates, so stations resolve only through the fixed UID map.
function resolveWaqiUid(station: StationGeo) {
  const mappedUid = WAQI_STATION_UIDS[station.station_id];
  return typeof mappedUid === "number" ? mappedUid : null;
}

/** Official readings older than this are replaced by the nearest live sensor. */
const FRESHNESS_WINDOW_MS = 6 * 60 * 60 * 1000;
const NEARBY_SENSOR_MAX_KM = 5;
const NEARBY_SENSOR_ATTEMPTS = 3;
const BOUNDS_CACHE_TTL_MS = 60_000;
const BOUNDS_PADDING_DEG = 0.06;

let boundsRequest: { at: number; promise: Promise<WaqiBoundsStation[]> } | null =
  null;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** One bounds request covering every station, shared across stations for a minute. */
async function loadLiveSensorsAroundStations() {
  if (boundsRequest && Date.now() - boundsRequest.at < BOUNDS_CACHE_TTL_MS) {
    return boundsRequest.promise;
  }

  const promise = (async () => {
    const stations = await loadStationMaster();
    const lats = stations.map((station) => station.latitude);
    const lons = stations.map((station) => station.longitude);
    const response = await fetch(
      buildWaqiBoundsUrl(
        Math.min(...lats) - BOUNDS_PADDING_DEG,
        Math.min(...lons) - BOUNDS_PADDING_DEG,
        Math.max(...lats) + BOUNDS_PADDING_DEG,
        Math.max(...lons) + BOUNDS_PADDING_DEG,
      ),
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`WAQI bounds request failed with ${response.status}`);
    }

    const payload = (await response.json()) as WaqiBoundsResponse;
    if (payload.status !== "ok" || !Array.isArray(payload.data)) {
      throw new Error("WAQI bounds request returned an error response");
    }

    return payload.data.filter((entry) =>
      Number.isFinite(Number(entry.aqi)),
    );
  })();

  boundsRequest = { at: Date.now(), promise };
  promise.catch(() => {
    if (boundsRequest?.promise === promise) {
      boundsRequest = null;
    }
  });
  return promise;
}

async function loadNearestLiveSensor(
  station: StationGeo,
  fallbackPollutants: Partial<WaqiNormalizedPollutants>,
  officialUid: number | null,
) {
  const sensors = await loadLiveSensorsAroundStations();
  const candidates = sensors
    .filter((sensor) => sensor.uid !== officialUid)
    .map((sensor) => ({
      sensor,
      distanceKm: haversineKm(
        station.latitude,
        station.longitude,
        sensor.lat,
        sensor.lon,
      ),
    }))
    .filter((entry) => entry.distanceKm <= NEARBY_SENSOR_MAX_KM)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, NEARBY_SENSOR_ATTEMPTS);

  for (const { sensor, distanceKm } of candidates) {
    try {
      const result = await fetchWaqiStationFeed(
        buildWaqiUidFeedUrl(sensor.uid),
        station,
        station.station_id,
        fallbackPollutants,
        sensor.uid,
        {
          uid: sensor.uid,
          name: sensor.station?.name?.trim() || `WAQI sensor #${sensor.uid}`,
          distanceKm,
        },
      );

      if (!isWaqiTimestampStale(result.payload.updatedAt, FRESHNESS_WINDOW_MS)) {
        return result;
      }
    } catch {
      // Try the next-nearest sensor.
    }
  }

  return null;
}

/** Official reading from CPCB's own station feed, or null if unavailable. */
async function loadCpcbResult(
  station: StationGeo,
  fallbackPollutants: Partial<WaqiNormalizedPollutants>,
): Promise<LiveAqiResult | null> {
  const feed = await loadCpcbFeed();
  const reading = feed ? findCpcbStation(feed, station.station_name) : null;
  if (!reading) {
    return null;
  }

  const values = getCpcbPollutantValues(reading);
  const aqi = computeCpcbAqi(values);
  if (aqi === null) {
    return null;
  }

  return {
    payload: {
      stationId: station.station_id,
      stationName: station.station_name,
      stationUid: null,
      aqi,
      pollutants: buildResolvedWaqiPollutants(values, fallbackPollutants),
      dominantPollutant: getDominantCpcbPollutant(values),
      updatedAt: reading.lastUpdate,
      cityName: reading.station,
      cityUrl: null,
      raw: null,
      nearbySensor: null,
      cpcbStation: reading.station,
    },
    stale: isWaqiTimestampStale(reading.lastUpdate, FRESHNESS_WINDOW_MS),
  };
}

function buildLiveAqiResultFromWaqiPayload(
  payload: WaqiFeedResponse,
  station: StationGeo,
  stationId: string,
  fallbackPollutants: Partial<WaqiNormalizedPollutants>,
  uidFallback: number | null,
  nearbySensor: WaqiNearbySensor | null,
) {
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
      stationUid:
        typeof payload.data.idx === "number" ? payload.data.idx : uidFallback,
      aqi: Math.round(rawAqi),
      pollutants: buildResolvedWaqiPollutants(
        livePollutants,
        fallbackPollutants,
      ),
      dominantPollutant:
        typeof payload.data.dominentpol === "string"
          ? payload.data.dominentpol
          : null,
      // Prefer the ISO timestamp: time.s is local station time without an
      // offset, which the browser would misread outside IST.
      updatedAt:
        typeof payload.data.time?.iso === "string"
          ? payload.data.time.iso
          : typeof payload.data.time?.s === "string"
            ? payload.data.time.s
            : null,
      cityName:
        typeof payload.data.city?.name === "string"
          ? payload.data.city.name
          : null,
      cityUrl:
        typeof payload.data.city?.url === "string"
          ? payload.data.city.url
          : null,
      raw: payload.data,
      nearbySensor,
      cpcbStation: null,
    } satisfies LiveAqiData,
    stale: false,
  } satisfies LiveAqiResult;
}

async function fetchWaqiStationFeed(
  feedUrl: string,
  station: StationGeo,
  stationId: string,
  fallbackPollutants: Partial<WaqiNormalizedPollutants>,
  uidFallback: number | null,
  nearbySensor: WaqiNearbySensor | null = null,
) {
  const response = await fetch(feedUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WAQI request failed with ${response.status}`);
  }

  const payload = (await response.json()) as WaqiFeedResponse;
  const result = buildLiveAqiResultFromWaqiPayload(
    payload,
    station,
    stationId,
    fallbackPollutants,
    uidFallback,
    nearbySensor,
  );

  return {
    ...result,
    stale: isWaqiTimestampStale(result.payload.updatedAt),
  } satisfies LiveAqiResult;
}

async function loadLiveAqi(stationId: string, forceRefresh = false) {
  const inFlight = waqiLiveRequestCache.get(stationId);
  if (inFlight && !forceRefresh) {
    return inFlight;
  }

  const request = (async () => {
    const station = await resolveStationGeo(stationId);
    // Live readings are returned as reported. Pollutants a source didn't report are
    // filled from history only on the selected station's card (LiveStationCard),
    // which reuses the history its chart already loads; each file is ~8 MB.
    const fallbackPollutants: Partial<WaqiNormalizedPollutants> = {};

    if (!station) {
      throw new Error(
        `Station ${stationId} was not found in the station master`,
      );
    }


    // Source order: CPCB's own station feed → WAQI's copy of the station →
    // nearest live WAQI sensor → newest stale official reading.
    let cpcbResult: LiveAqiResult | null = null;
    try {
      cpcbResult = await loadCpcbResult(station, fallbackPollutants);
    } catch {
      // CPCB proxy unavailable; carry on with WAQI.
    }

    if (cpcbResult && !cpcbResult.stale) {
      waqiLiveCache.set(stationId, cpcbResult);
      void writeLiveCacheToIndexedDb(stationId, cpcbResult);
      return cpcbResult;
    }

    const uid = resolveWaqiUid(station);
    const waqiAvailable = hasWaqiLiveAccess();
    let officialResult: LiveAqiResult | null = null;
    let officialError: unknown = null;

    if (uid !== null && waqiAvailable) {
      try {
        officialResult = await fetchWaqiStationFeed(
          buildWaqiUidFeedUrl(uid),
          station,
          stationId,
          fallbackPollutants,
          uid,
        );
      } catch (error) {
        officialError = error;
      }
    }

    const officialIsFresh =
      officialResult !== null &&
      !isWaqiTimestampStale(officialResult.payload.updatedAt, FRESHNESS_WINDOW_MS);

    // Official station feed missing or stale: use the nearest live sensor.
    let result = officialIsFresh ? officialResult : null;
    if (!result && waqiAvailable) {
      try {
        result = await loadNearestLiveSensor(station, fallbackPollutants, uid);
      } catch (error) {
        officialError ??= error;
      }
    }

    // Nothing fresh anywhere: show the newer of the two stale official readings.
    if (!result) {
      const staleOfficial = [cpcbResult, officialResult]
        .filter((entry): entry is LiveAqiResult => entry !== null)
        .sort(
          (left, right) =>
            new Date(right.payload.updatedAt ?? 0).getTime() -
            new Date(left.payload.updatedAt ?? 0).getTime(),
        );
      result = staleOfficial[0] ?? null;
    }

    if (result) {
      const normalizedResult = {
        ...result,
        stale: isWaqiTimestampStale(result.payload.updatedAt, FRESHNESS_WINDOW_MS),
      };

      waqiLiveCache.set(stationId, normalizedResult);
      void writeLiveCacheToIndexedDb(stationId, normalizedResult);
      return normalizedResult;
    }

    const cachedFallback = await getCachedLiveAqi(stationId);
    if (cachedFallback) {
      return {
        ...cachedFallback,
        stale: isWaqiTimestampStale(cachedFallback.payload.updatedAt, FRESHNESS_WINDOW_MS),
      };
    }

    throw officialError instanceof Error
      ? officialError
      : new Error("WAQI feed could not be resolved");
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

    // New station: don't keep presenting the previous station's reading as loaded.
    // (This effect runs before the load effect below in the same commit.)
    hasLoadedRef.current = false;

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
    // No WAQI-access check here: CPCB (/api/cpcb) works without it, and the
    // WAQI fallback steps are skipped inside loadLiveAqi when WAQI isn't set up.

    let cancelled = false;

    // Show an already-fetched reading instantly (e.g. from the startup
    // prefetch) and refresh it in the background.
    const cached = hasLoadedRef.current ? null : waqiLiveCache.get(activeStationId);
    if (cached) {
      hasLoadedRef.current = true;
      setData(cached.payload);
      setStale(cached.stale);
      setError(null);
      setLoading(false);
    } else if (!hasLoadedRef.current) {
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

















