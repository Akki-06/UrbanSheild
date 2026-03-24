import { useEffect, useRef } from "react"
import { motion, useAnimation, useInView } from "framer-motion"

/**
 * BlurText – each word fades in while de-blurring, staggered left-to-right.
 * Props:
 *   text      {string}
 *   className {string}
 *   delay     {number}  - stagger per word in seconds (default 0.06)
 *   duration  {number}  - per-word animation duration (default 0.65)
 *   once      {boolean} - only animate once (default true)
 */
export default function BlurText({
  text = "",
  className = "",
  delay = 0.06,
  duration = 0.65,
  once = true,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-10%" })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) controls.start("visible")
    else if (!once) controls.start("hidden")
  }, [isInView, controls, once])

  const words = text.split(" ")

  return (
    <span ref={ref} className={className} style={{ display: "inline" }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          custom={i}
          initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
          animate={controls}
          variants={{
            visible: (idx) => ({
              opacity: 1,
              filter: "blur(0px)",
              y: 0,
              transition: { duration, delay: idx * delay, ease: "easeOut" },
            }),
            hidden: { opacity: 0, filter: "blur(12px)", y: 16 },
          }}
          style={{ display: "inline-block", marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}
