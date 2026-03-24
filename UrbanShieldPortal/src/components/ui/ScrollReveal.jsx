import { useRef } from "react"
import { motion, useInView } from "framer-motion"

/**
 * ScrollReveal – wraps children and reveals them when they enter the viewport.
 * Props:
 *   children    {ReactNode}
 *   className   {string}
 *   delay       {number}   - entry delay in seconds (default 0)
 *   duration    {number}   - animation duration in seconds (default 0.6)
 *   direction   {string}   - "up" | "down" | "left" | "right" | "none" (default "up")
 *   distance    {number}   - translate distance in px (default 40)
 *   once        {boolean}  - animate only once (default true)
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 40,
  once = true,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-8%" })

  const dirMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  }
  const initial = { opacity: 0, filter: "blur(3px)", ...dirMap[direction] }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={isInView ? { opacity: 1, y: 0, x: 0, filter: "blur(0px)" } : initial}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
