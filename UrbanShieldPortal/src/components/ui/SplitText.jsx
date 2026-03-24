import { useEffect, useRef } from "react"
import { motion, useAnimation, useInView } from "framer-motion"

/**
 * SplitText – animates each word (or letter) individually on mount / scroll-entry.
 * Props:
 *   text        {string}  - the text to animate
 *   className   {string}  - wrapper class
 *   delay       {number}  - stagger delay per item in seconds (default 0.04)
 *   duration    {number}  - animation duration per item (default 0.5)
 *   by          {string}  - "word" | "letter" (default "word")
 *   once        {boolean} - animate only the first time it enters view (default true)
 */
export default function SplitText({
  text = "",
  className = "",
  delay = 0.04,
  duration = 0.55,
  by = "word",
  once = true,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-10%" })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) controls.start("visible")
    else if (!once) controls.start("hidden")
  }, [isInView, controls, once])

  const items = by === "letter" ? text.split("") : text.split(" ")

  const variants = {
    hidden: { opacity: 0, y: 32, filter: "blur(4px)" },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration,
        delay: i * delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  }

  return (
    <span ref={ref} className={className} style={{ display: "inline" }}>
      {items.map((item, i) => (
        <motion.span
          key={i}
          custom={i}
          initial="hidden"
          animate={controls}
          variants={variants}
          style={{ display: "inline-block", whiteSpace: by === "letter" ? "pre" : "pre-wrap" }}
        >
          {item}
          {by === "word" && i < items.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  )
}
