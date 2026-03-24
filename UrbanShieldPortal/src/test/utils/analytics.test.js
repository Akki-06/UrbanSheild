/**
 * Tests for the analytics utility logic extracted from Analytics.jsx.
 * These test pure data-processing functions in isolation.
 */
import { describe, it, expect } from "vitest"

// ── helpers mirrored from Analytics.jsx ─────────────────────────────────────

const formatDayKey = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const safeDate = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const recentDays = (count) => {
  const days = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(now.getDate() - i)
    days.push({
      key: formatDayKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })
  }
  return days
}

// ─────────────────────────────────────────────────────────────────────────────

describe("formatDayKey", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date(2024, 0, 5) // Jan 5 2024
    expect(formatDayKey(date)).toBe("2024-01-05")
  })

  it("pads single-digit months and days", () => {
    const date = new Date(2023, 2, 9) // March 9
    expect(formatDayKey(date)).toBe("2023-03-09")
  })

  it("handles December (month 11)", () => {
    const date = new Date(2023, 11, 31)
    expect(formatDayKey(date)).toBe("2023-12-31")
  })

  it("returns consistent format for year boundaries", () => {
    const date = new Date(2025, 0, 1)
    expect(formatDayKey(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("safeDate", () => {
  it("returns a Date object for valid ISO string", () => {
    const result = safeDate("2024-03-15T10:00:00Z")
    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2024)
  })

  it("returns null for invalid date string", () => {
    expect(safeDate("not-a-date")).toBeNull()
  })

  it("returns null for undefined", () => {
    expect(safeDate(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(safeDate("")).toBeNull()
  })

  it("parses unix timestamp", () => {
    const ts = 1700000000000
    const result = safeDate(ts)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(ts)
  })

  it("handles null gracefully", () => {
    // new Date(null) = epoch (valid), so result is a Date not null
    const result = safeDate(null)
    // epoch date is technically valid
    expect(result).toBeInstanceOf(Date)
  })
})

describe("recentDays", () => {
  it("returns exactly count days", () => {
    expect(recentDays(7)).toHaveLength(7)
    expect(recentDays(3)).toHaveLength(3)
    expect(recentDays(1)).toHaveLength(1)
  })

  it("last entry is today", () => {
    const days = recentDays(7)
    const today = formatDayKey(new Date())
    expect(days[days.length - 1].key).toBe(today)
  })

  it("first entry is (count-1) days ago", () => {
    const days = recentDays(7)
    const sixDaysAgo = new Date()
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
    sixDaysAgo.setHours(0, 0, 0, 0)
    expect(days[0].key).toBe(formatDayKey(sixDaysAgo))
  })

  it("days are in ascending chronological order", () => {
    const days = recentDays(7)
    for (let i = 1; i < days.length; i++) {
      expect(days[i].key > days[i - 1].key).toBe(true)
    }
  })

  it("each entry has key and label properties", () => {
    const days = recentDays(3)
    days.forEach((d) => {
      expect(d).toHaveProperty("key")
      expect(d).toHaveProperty("label")
      expect(d.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it("handles count=0 returning empty array", () => {
    expect(recentDays(0)).toHaveLength(0)
  })
})

describe("severity bucket assignment logic", () => {
  const severityBuckets = [
    { label: "Low (1-3)", min: 1, max: 3, count: 0 },
    { label: "Medium (4-6)", min: 4, max: 6, count: 0 },
    { label: "High (7-8)", min: 7, max: 8, count: 0 },
    { label: "Critical (9-10)", min: 9, max: 10, count: 0 },
  ]

  const assignBucket = (sev) => {
    const buckets = JSON.parse(JSON.stringify(severityBuckets))
    buckets.forEach((b) => {
      if (sev >= b.min && sev <= b.max) b.count += 1
    })
    return buckets
  }

  it("assigns severity 1 to Low bucket", () => {
    const result = assignBucket(1)
    expect(result[0].count).toBe(1)
    expect(result.slice(1).every((b) => b.count === 0)).toBe(true)
  })

  it("assigns severity 5 to Medium bucket", () => {
    const result = assignBucket(5)
    expect(result[1].count).toBe(1)
  })

  it("assigns severity 8 to High bucket", () => {
    const result = assignBucket(8)
    expect(result[2].count).toBe(1)
  })

  it("assigns severity 10 to Critical bucket", () => {
    const result = assignBucket(10)
    expect(result[3].count).toBe(1)
  })

  it("assigns severity 0 to no bucket", () => {
    const result = assignBucket(0)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })

  it("boundary: severity 6 goes to Medium not High", () => {
    const result = assignBucket(6)
    expect(result[1].count).toBe(1)
    expect(result[2].count).toBe(0)
  })

  it("boundary: severity 7 goes to High not Medium", () => {
    const result = assignBucket(7)
    expect(result[2].count).toBe(1)
    expect(result[1].count).toBe(0)
  })
})
