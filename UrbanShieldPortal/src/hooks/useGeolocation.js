import { useEffect, useRef } from 'react'
import api from '../api/axios'

/**
 * Custom hook to track user's GPS location and send to backend
 * Runs continuously when user is on the app
 */
export function useGeolocation(shouldTrack = true) {
  const watchIdRef = useRef(null)
  const lastUpdateRef = useRef(Date.now())

  useEffect(() => {
    if (!shouldTrack || !navigator.geolocation) {
      console.warn('Geolocation not available')
      return
    }

    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords

        // Send update to backend every 30 seconds max (avoid spamming)
        const now = Date.now()
        if (now - lastUpdateRef.current < 30000) {
          return
        }

        lastUpdateRef.current = now

        // Send to backend
        api.post('user-location/update_location/', {
          latitude,
          longitude,
          accuracy
        }).catch(err => {
          console.error('Failed to update location:', err)
        })
      },
      (error) => {
        console.error('Geolocation error:', error.message)
        // Handle specific error codes
        if (error.code === 1) {
          console.warn('User denied geolocation permission')
        }
      },
      {
        enableHighAccuracy: true,  // Use GPS + WiFi
        timeout: 10000,            // 10 second timeout
        maximumAge: 5000           // Use cached position if < 5 seconds old
      }
    )

    // Cleanup: stop watching position when component unmounts
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [shouldTrack])
}
