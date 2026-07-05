#!/usr/bin/env node
// Validate the static road export before it is published.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const defaultInputPath = join(projectRoot, 'public', 'data', 'kolkata_roads.json')

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPosition(value) {
  return Array.isArray(value) && value.length >= 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])
}

function validateLineString(coordinates, featureLabel, errors) {
  if (!Array.isArray(coordinates)) {
    errors.push(`${featureLabel}: LineString coordinates are not an array`)
    return
  }

  if (coordinates.length < 2) {
    errors.push(`${featureLabel}: LineString must contain at least two positions`)
    return
  }

  coordinates.forEach((position, positionIndex) => {
    if (!isPosition(position)) {
      errors.push(`${featureLabel}: LineString position ${positionIndex} is not a valid coordinate pair`)
    }
  })
}

function validateMultiLineString(coordinates, featureLabel, errors) {
  if (!Array.isArray(coordinates)) {
    errors.push(`${featureLabel}: MultiLineString coordinates are not an array`)
    return
  }

  if (coordinates.length === 0) {
    errors.push(`${featureLabel}: MultiLineString must contain at least one line`)
    return
  }

  coordinates.forEach((line, lineIndex) => {
    if (!Array.isArray(line)) {
      errors.push(`${featureLabel}: MultiLineString line ${lineIndex} is not an array`)
      return
    }

    if (line.length < 2) {
      errors.push(`${featureLabel}: MultiLineString line ${lineIndex} must contain at least two positions`)
      return
    }

    line.forEach((position, positionIndex) => {
      if (!isPosition(position)) {
        errors.push(`${featureLabel}: MultiLineString line ${lineIndex} position ${positionIndex} is not a valid coordinate pair`)
      }
    })
  })
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
    const keys = Object.keys(feature.properties).sort()
    const allowedKeys = ['highway', 'name', 'station_id']
    const extraKeys = keys.filter((key) => !allowedKeys.includes(key))

    if (extraKeys.length > 0) {
      errors.push(`${featureLabel}: properties contain unsupported field(s): ${extraKeys.join(', ')}`)
    }

    if (typeof feature.properties.station_id !== 'string' || feature.properties.station_id.trim() === '') {
      errors.push(`${featureLabel}: station_id must be a non-empty string`)
    }

    if (Object.hasOwn(feature.properties, 'name') && (typeof feature.properties.name !== 'string' || feature.properties.name.trim() === '')) {
      errors.push(`${featureLabel}: name must be a non-empty string when present`)
    }

    if (Object.hasOwn(feature.properties, 'highway') && (typeof feature.properties.highway !== 'string' || feature.properties.highway.trim() === '')) {
      errors.push(`${featureLabel}: highway must be a non-empty string when present`)
    }
  }

  if (!feature.geometry || typeof feature.geometry !== 'object') {
    errors.push(`${featureLabel}: missing geometry`)
    return
  }

  if (feature.geometry.type === 'LineString') {
    validateLineString(feature.geometry.coordinates, featureLabel, errors)
    return
  }

  if (feature.geometry.type === 'MultiLineString') {
    validateMultiLineString(feature.geometry.coordinates, featureLabel, errors)
    return
  }

  errors.push(`${featureLabel}: geometry type ${feature.geometry.type} is not supported`)
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
    throw new Error(`Road GeoJSON validation failed for ${inputPath}\n- ${errors.join('\n- ')}`)
  }

  console.log(`Validated ${inputPath} (${payload.features.length} feature(s))`)
}

main()
