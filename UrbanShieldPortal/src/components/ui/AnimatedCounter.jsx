import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"

/**
 * AnimatedCounter – counts up from 0 to `to` when it enters the viewport.
 * Props:
 *   to        {number}  - target value
 *   duration  {number}  - animation duration in ms (default 1800)
 *   suffix    {string}  - appended after number e.g. "+" or "%"
 *   prefix    {string}  - prepended before number
 *   className {string}
 */
export default function AnimatedCounter({
  to = 0,
  duration = 1800,
  suffix = "",
  prefix = "",
  className = "",
}) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-10%" })
  const frameRef = useRef(null)

  useEffect(() => {
    if (!isInView) return

    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * to))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [isInView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}
