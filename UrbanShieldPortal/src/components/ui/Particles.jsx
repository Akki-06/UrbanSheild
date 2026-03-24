import { useEffect, useRef } from "react"

/**
 * Particles – canvas-based floating particles background.
 * Props:
 *   count        {number}  - number of particles (default 80)
 *   color        {string}  - particle colour (default "#60a5fa")
 *   speed        {number}  - movement multiplier (default 0.4)
 *   minRadius    {number}  - minimum particle radius px (default 1)
 *   maxRadius    {number}  - maximum particle radius px (default 3)
 *   className    {string}
 */
export default function Particles({
  count = 80,
  color = "#60a5fa",
  speed = 0.4,
  minRadius = 1,
  maxRadius = 3,
  className = "",
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animId
    let particles = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const hex2rgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
        : "96,165,250"
    }
    const rgb = hex2rgb(color)

    const spawn = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: minRadius + Math.random() * (maxRadius - minRadius),
        dx: (Math.random() - 0.5) * speed,
        dy: (Math.random() - 0.5) * speed,
        alpha: 0.2 + Math.random() * 0.6,
      }
    }

    resize()
    particles = Array.from({ length: count }, spawn)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.dx
        p.y += p.dy
        // wrap around
        if (p.x < -p.r) p.x = canvas.width + p.r
        if (p.x > canvas.width + p.r) p.x = -p.r
        if (p.y < -p.r) p.y = canvas.height + p.r
        if (p.y > canvas.height + p.r) p.y = -p.r

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb},${p.alpha})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [count, color, speed, minRadius, maxRadius])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  )
}
