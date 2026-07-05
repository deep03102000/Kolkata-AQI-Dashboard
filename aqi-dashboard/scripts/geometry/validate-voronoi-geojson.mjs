#!/usr/bin/env node
// Re-run this validator when station locations or the district boundary source changes.
// It does not need to run on every deploy if the generated Voronoi export has not changed.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanCoords, kinks } from '@turf/turf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'public', 'data', 'voronoi_cells.json')

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPosition(value) {
  return Array.isArray(value) && value.length >= 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])
}

function positionEquals(left, right) {
  return left[0] === right[0] && left[1] === right[1]
}

function validateRing(ring, featureLabel, ringIndex, errors) {
  if (!Array.isArray(ring)) {
    errors.push(`${featureLabel}: ring ${ringIndex} is not an array`)
    return
  }

  if (ring.length < 4) {
    errors.push(`${featureLabel}: ring ${ringIndex} must contain at least four positions`)
    return
  }

  ring.forEach((position, positionIndex) => {
    if (!isPosition(position)) {
      errors.push(`${featureLabel}: ring ${ringIndex} position ${positionIndex} is not a valid coordinate pair`)
    }
  })

  const first = ring[0]
  const last = ring[ring.length - 1]
  if (isPosition(first) && isPosition(last) && !positionEquals(first, last)) {
    errors.push(`${featureLabel}: ring ${ringIndex} is not closed`)
  }
}

function validateGeometry(feature, featureIndex, errors) {
  if (!feature.geometry || typeof feature.geometry !== 'object') {
    errors.push(`feature ${featureIndex}: missing geometry`)
    return
  }

  const { geometry } = feature
  const featureLabel = `feature ${featureIndex}`

  if (geometry.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates)) {
      errors.push(`${featureLabel}: polygon coordinates are not an array`)
      return
    }

    geometry.coordinates.forEach((ring, ringIndex) => validateRing(ring, featureLabel, ringIndex, errors))
    return
  }

  if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates)) {
      errors.push(`${featureLabel}: multipolygon coordinates are not an array`)
      return
    }

    geometry.coordinates.forEach((polygon, polygonIndex) => {
      if (!Array.isArray(polygon)) {
        errors.push(`${featureLabel}: polygon ${polygonIndex} is not an array`)
        return
      }

      polygon.forEach((ring, ringIndex) => validateRing(ring, `${featureLabel}: polygon ${polygonIndex}`, ringIndex, errors))
    })
    return
  }

  errors.push(`${featureLabel}: geometry type ${geometry.type} is not supported`)
}

function validateFeature(feature, featureIndex, errors) {
  const featureLabel = `feature ${featureIndex}`

  if (!feature || feature.type !== 'Feature') {
    errors.push(`${featureLabel}: not a GeoJSON Feature`)
    return
  }

  if (!feature.properties || typeof feature.properties !== 'object' || Array.isArray(feature.properties)) {
    errors.push(`${featureLabel}: properties must be an object`)
  } else {
    const keys = Object.keys(feature.properties)
    if (keys.length !== 1 || keys[0] !== 'station_id') {
      errors.push(`${featureLabel}: properties must contain station_id only`)
    }

    if (typeof feature.properties.station_id !== 'string' || feature.properties.station_id.trim() === '') {
      errors.push(`${featureLabel}: station_id must be a non-empty string`)
    }
  }

  validateGeometry(feature, featureIndex, errors)

  if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
    try {
      const intersections = kinks(cleanCoords(feature))
      if (Array.isArray(intersections?.features) && intersections.features.length > 0) {
        errors.push(`${featureLabel}: geometry self-intersects at ${intersections.features.length} point(s)`)
      }
    } catch (error) {
      errors.push(`${featureLabel}: self-intersection check failed (${error.message})`)
    }
  }
}

function main() {
  const inputPath = process.argv[2] || defaultInputPath
  const raw = readFileSync(inputPath, 'utf8')
  const payload = JSON.parse(raw)
  const errors = []

  if (!payload || payload.type !== 'FeatureCollection') {
    errors.push('top-level value must be a GeoJSON FeatureCollection')
  }

  if (!Array.isArray(payload?.features)) {
    errors.push('FeatureCollection.features must be an array')
  } else if (payload.features.length === 0) {
    errors.push('FeatureCollection.features must not be empty')
  } else {
    payload.features.forEach((feature, index) => validateFeature(feature, index, errors))
  }

  if (errors.length > 0) {
    throw new Error(`GeoJSON validation failed for ${inputPath}\n- ${errors.join('\n- ')}`)
  }

  console.log(`Validated ${inputPath} (${payload.features.length} feature(s))`)
}

main()