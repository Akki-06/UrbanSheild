import { useRef } from "react"
import "./SpotlightCard.css"

/**
 * SpotlightCard – glassmorphism card with a mouse-following radial spotlight.
 * Props:
 *   children      {ReactNode}
 *   className     {string}
 *   spotlightColor {string} - CSS colour of spotlight (default: semi-transparent blue)
 */
export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(99,102,241,0.18)",
}) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty("--spotlight-x", `${x}px`)
    card.style.setProperty("--spotlight-y", `${y}px`)
    card.style.setProperty("--spotlight-color", spotlightColor)
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (card) {
      card.style.setProperty("--spotlight-x", "-999px")
      card.style.setProperty("--spotlight-y", "-999px")
    }
  }

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="spotlight-card__overlay" />
      <div className="spotlight-card__content">{children}</div>
    </div>
  )
}
