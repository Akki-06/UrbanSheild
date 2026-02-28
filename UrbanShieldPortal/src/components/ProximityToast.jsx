import { useEffect, useState } from "react"

const TOAST_DURATION = 8000

export default function ProximityToast() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      const id = `${Date.now()}-${Math.random()}`
      setItems(prev => [...prev, { id, ...detail }])
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id))
      }, TOAST_DURATION)
    }

    window.addEventListener("proximity-alert", handler)
    return () => window.removeEventListener("proximity-alert", handler)
  }, [])

  if (!items.length) return null

  return (
    <div className="proximity-toast-stack">
      {items.map(item => (
        <div key={item.id} className="proximity-toast">
          <div className="proximity-toast-title">
            {item.title || "Nearby Alert"}
          </div>
          <div className="proximity-toast-body">
            {item.body || "A disaster was reported near your location."}
          </div>
        </div>
      ))}
    </div>
  )
}
