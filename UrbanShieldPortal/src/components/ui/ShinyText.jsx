import "./ShinyText.css"

/**
 * ShinyText – applies a sweeping gloss shimmer over text.
 * Props:
 *   text      {string}
 *   className {string}
 *   speed     {number}  - shimmer duration in seconds (default 3)
 *   disabled  {boolean} - disables animation (default false)
 */
export default function ShinyText({ text = "", className = "", speed = 3, disabled = false }) {
  return (
    <span
      className={`shiny-text ${disabled ? "" : "shiny-text--animated"} ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {text}
    </span>
  )
}
