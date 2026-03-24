import "./Aurora.css"

/**
 * Aurora – animated aurora-borealis gradient background layer.
 * Place inside a `position:relative` container. It fills 100%×100%.
 * Props:
 *   colorStops {string[]} - Tailwind/hex colours for each aurora blob (default: blue, purple, teal)
 *   speed      {number}   - animation speed multiplier (default 1)
 *   blur       {number}   - blur in px (default 120)
 *   className  {string}
 */
export default function Aurora({ colorStops, speed = 1, blur = 120, className = "" }) {
  const stops = colorStops || ["#1e40af", "#7c3aed", "#0e7490"]

  return (
    <div
      className={`aurora ${className}`}
      style={{ "--aurora-blur": `${blur}px`, "--aurora-speed": `${speed}` }}
      aria-hidden="true"
    >
      {stops.map((color, i) => (
        <div
          key={i}
          className={`aurora__blob aurora__blob--${i}`}
          style={{ background: color, animationDelay: `${i * -2.5}s` }}
        />
      ))}
    </div>
  )
}
