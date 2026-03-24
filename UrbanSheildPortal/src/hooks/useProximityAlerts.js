import { useEffect, useRef } from "react"
import api from "../api/axios"

/**
 * Monitors user location and triggers push/in-app notifications
 * for disasters within a given radius (km).
 */
export function useProximityAlerts({ enabled = true, radiusKm = 7 } = {}) {
  const watchIdRef = useRef(null)
  const lastFetchRef = useRef(0)
  const seenIdsRef = useRef(new Set())

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return

    const maybeRequestPermission = () => {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => null)
      }
    }

    const notify = (disaster) => {
      const title = `Disaster nearby: ${disaster.disaster_type || "Alert"}`
      const body = `Severity ${disaster.severity ?? "?"}/10 • ${(disaster.title || disaster.description || "Stay alert.")}`

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body })
      } else {
        window.dispatchEvent(new CustomEvent("proximity-alert", {
          detail: {
            title,
            body,
            severity: disaster.severity,
            type: disaster.disaster_type,
            at: disaster.created_at,
          }
        }))
      }
    }

    const handlePosition = (position) => {
      const { latitude, longitude } = position.coords
      const now = Date.now()
      if (now - lastFetchRef.current < 20000) return
      lastFetchRef.current = now

      api.get("disasters/", { params: { lat: latitude, lon: longitude, radius: radiusKm } })
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : []
          list.forEach(d => {
            const id = d.id ?? `${d.latitude}-${d.longitude}-${d.disaster_type}`
            if (!seenIdsRef.current.has(id)) {
              seenIdsRef.current.add(id)
              notify(d)
            }
          })
        })
        .catch(err => {
          console.warn("Proximity alert fetch failed", err?.message || err)
        })
    }

    const handleError = (err) => {
      console.warn("Geolocation error for proximity alerts", err?.message || err)
    }

    maybeRequestPermission()
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    })

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [enabled, radiusKm])
}
