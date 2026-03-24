import "./GradientText.css"

/**
 * GradientText – renders text with an animated gradient that cycles colours.
 * Props:
 *   children  {ReactNode}
 *   className {string}
 *   colors    {string[]} - CSS colour stops (default: blue → purple → cyan)
 *   speed     {number}   - animation duration in seconds (default 4)
 */
export default function GradientText({
  children,
  className = "",
  colors = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"],
  speed = 4,
}) {
  const gradient = `linear-gradient(90deg, ${colors.join(", ")})`
  const bgSize = `${colors.length * 100}%`

  return (
    <span
      className={`gradient-text ${className}`}
      style={{
        background: gradient,
        backgroundSize: bgSize,
        animationDuration: `${speed}s`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        display: "inline",
      }}
    >
      {children}
    </span>
  )
}
