/**
 * Tests for geolocation-related utility logic.
 * Tests the haversine distance calculation concept used in proximity alerts.
 */
import { describe, it, expect } from "vitest"

// Haversine formula — mirrors what the backend uses and what useProximityAlerts applies
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Uttarakhand geofence check
function isInUttarakhand(lat, lon) {
  return lat >= 28.43 && lat <= 31.46 && lon >= 77.73 && lon <= 81.02
}

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(30.0, 79.0, 30.0, 79.0)).toBeCloseTo(0, 5)
  })

  it("calculates known distance between Dehradun and Haridwar (~54km)", () => {
    // Dehradun: 30.3165, 78.0322; Haridwar: 29.9457, 78.1642
    const dist = haversineKm(30.3165, 78.0322, 29.9457, 78.1642)
    expect(dist).toBeGreaterThan(40)
    expect(dist).toBeLessThan(65)
  })

  it("calculates approximately 111 km per degree of latitude", () => {
    const dist = haversineKm(0, 0, 1, 0)
    expect(dist).toBeCloseTo(111.2, 0)
  })

  it("is symmetric (d(A,B) == d(B,A))", () => {
    const d1 = haversineKm(30.1, 78.5, 29.5, 79.1)
    const d2 = haversineKm(29.5, 79.1, 30.1, 78.5)
    expect(d1).toBeCloseTo(d2, 8)
  })

  it("returns positive values for any distinct points", () => {
    expect(haversineKm(10, 10, 20, 20)).toBeGreaterThan(0)
  })

  it("handles antipodal points (~20015 km)", () => {
    const dist = haversineKm(0, 0, 0, 180)
    expect(dist).toBeCloseTo(20015, -2) // within ~200km is fine for this test
  })
})

describe("isInUttarakhand geofence", () => {
  it("accepts Dehradun coordinates", () => {
    expect(isInUttarakhand(30.3165, 78.0322)).toBe(true)
  })

  it("accepts Nainital coordinates", () => {
    expect(isInUttarakhand(29.3919, 79.4542)).toBe(true)
  })

  it("rejects Delhi coordinates", () => {
    expect(isInUttarakhand(28.6139, 77.2090)).toBe(false)
  })

  it("rejects Nepal coordinates (too far north)", () => {
    expect(isInUttarakhand(27.7, 85.3)).toBe(false)
  })

  it("rejects coordinates with longitude too far west", () => {
    expect(isInUttarakhand(30.0, 75.0)).toBe(false)
  })

  it("rejects coordinates with longitude too far east", () => {
    expect(isInUttarakhand(30.0, 82.0)).toBe(false)
  })

  it("accepts boundary values", () => {
    expect(isInUttarakhand(28.43, 77.73)).toBe(true)
    expect(isInUttarakhand(31.46, 81.02)).toBe(true)
  })

  it("rejects coordinates just outside the boundary", () => {
    expect(isInUttarakhand(28.42, 79.0)).toBe(false)
    expect(isInUttarakhand(31.47, 79.0)).toBe(false)
  })
})

describe("proximity alert filtering logic", () => {
  const ALERT_RADIUS_KM = 7

  const disasters = [
    { id: 1, latitude: 30.3165, longitude: 78.0322, severity: 8 },  // same as user
    { id: 2, latitude: 30.4, longitude: 78.1, severity: 3 },         // ~14km away
    { id: 3, latitude: 30.32, longitude: 78.04, severity: 5 },        // ~1km away
  ]

  const userLat = 30.3165
  const userLon = 78.0322

  const nearby = disasters.filter(
    (d) => haversineKm(userLat, userLon, Number(d.latitude), Number(d.longitude)) <= ALERT_RADIUS_KM
  )

  it("finds disasters within alert radius", () => {
    expect(nearby.length).toBe(2) // id 1 and id 3
  })

  it("excludes disasters beyond alert radius", () => {
    const ids = nearby.map((d) => d.id)
    expect(ids).not.toContain(2)
  })

  it("includes disaster at user location (distance=0)", () => {
    const ids = nearby.map((d) => d.id)
    expect(ids).toContain(1)
  })
})
