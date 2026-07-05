#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const defaultQueryPath = join(__dirname, 'output', 'road_network_overpass_query.txt')
const defaultOutputPath = join(__dirname, 'output', 'raw_roads.json')
const overpassUrl = 'https://overpass-api.de/api/interpreter'
const maxTotalElements = 20000
const maxWayElements = 20000
const maxResponseBytes = 25 * 1024 * 1024
const maxAttempts = 3
const requestTimeoutScheduleMs = [45000, 90000, 180000]
const backoffScheduleMs = [2000, 5000]

function saveJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadQuery(filePath) {
  const query = readFileSync(filePath, 'utf8').trim()
  if (!query) {
    throw new Error(`Overpass query file is empty: ${filePath}`)
  }
  return query
}

async function fetchJson(query, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': 'kolkata-aqi-dashboard/1.0 (+https://github.com/)',
      },
      signal: controller.signal,
      body: new URLSearchParams({ data: query }),
    })

    if (!response.ok) {
      throw new Error(`Overpass request failed with ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Overpass request timed out after ${timeoutMs} ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJsonWithRetry(query) {
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeoutMs = requestTimeoutScheduleMs[Math.min(attempt - 1, requestTimeoutScheduleMs.length - 1)]

    try {
      const rawRoads = await fetchJson(query, timeoutMs)
      return { rawRoads, attempt, timeoutMs }
    } catch (error) {
      lastError = error
      console.warn(`Overpass attempt ${attempt} failed after ${timeoutMs} ms: ${error.message}`)

      if (attempt < maxAttempts) {
        const delayMs = backoffScheduleMs[Math.min(attempt - 1, backoffScheduleMs.length - 1)]
        console.warn(`Retrying after ${delayMs} ms...`)
        await sleep(delayMs)
      }
    }
  }

  throw lastError || new Error('Overpass request failed')
}

function summarizeRoadResponse(rawRoads) {
  const elements = Array.isArray(rawRoads?.elements) ? rawRoads.elements : []
  const counts = elements.reduce(
    (acc, element) => {
      const type = element?.type
      if (type === 'way') {
        acc.ways += 1
      } else if (type === 'node') {
        acc.nodes += 1
      } else if (type === 'relation') {
        acc.relations += 1
      } else {
        acc.others += 1
      }
      return acc
    },
    { total: elements.length, ways: 0, nodes: 0, relations: 0, others: 0 }
  )

  const responseBytes = Buffer.byteLength(JSON.stringify(rawRoads), 'utf8')

  return { ...counts, responseBytes }
}

function validateRoadResponse(summary, outputPath) {
  const problems = []

  if (summary.total === 0) {
    problems.push('the response has no elements')
  }

  if (summary.ways === 0) {
    problems.push('the response has no highway ways')
  }

  if (summary.total > maxTotalElements) {
    problems.push(`the response has ${summary.total} total elements, above the sanity limit of ${maxTotalElements}`)
  }

  if (summary.ways > maxWayElements) {
    problems.push(`the response has ${summary.ways} way elements, above the sanity limit of ${maxWayElements}`)
  }

  if (summary.responseBytes > maxResponseBytes) {
    problems.push(`the response is ${summary.responseBytes} bytes, above the sanity limit of ${maxResponseBytes}`)
  }

  if (problems.length > 0) {
    throw new Error([
      `Overpass response for ${outputPath} looks too large or too sparse for the intended Kolkata road pass.`,
      `Consider narrowing the query if you only want vehicle roads, for example by excluding highway=footway/path/steps/bridleway/pedestrian/cycleway.`,
      ...problems.map((problem) => `- ${problem}`),
    ].join('\n'))
  }
}

async function main() {
  const [, , queryPathArg, outputPathArg] = process.argv
  const queryPath = queryPathArg || defaultQueryPath
  const outputPath = outputPathArg || defaultOutputPath
  const query = loadQuery(queryPath)
  const { rawRoads, attempt, timeoutMs } = await fetchJsonWithRetry(query)
  const summary = summarizeRoadResponse(rawRoads)

  console.log(
    `Overpass response summary after attempt ${attempt} (${timeoutMs} ms timeout): ${summary.total} elements (${summary.ways} ways, ${summary.nodes} nodes, ${summary.relations} relations, ${summary.responseBytes} bytes)`
  )

  validateRoadResponse(summary, outputPath)
  saveJson(outputPath, rawRoads)
  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})