import { Link } from "react-router-dom"
import "../styles/landing.css"
import GlobeCanvas from "../components/landing/GlobeCanvas"
import { motion } from "framer-motion"

export default function Landing() {
  const MotionDiv = motion.div
  const MotionH1 = motion.h1
  const MotionP = motion.p
  return (
    <div className="landing-wrap full-bleed">
      <MotionDiv
        className="landing-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <header className="landing-header">
          <div className="landing-brand">
            <span className="globe-icon">🌐</span>
            <span className="brand-name">UrbanShield</span>
          </div>
          <nav className="landing-nav">
            <Link to="/map">Live Map</Link>
            <Link to="/login">Accounts</Link>
            <Link to="/register">Get Started</Link>
          </nav>
        </header>

        <div className="landing-body">
          <div className="landing-copy">
            <MotionH1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            >
              Design your<br />own network
            </MotionH1>
            <MotionP
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.6, ease: "easeOut" }}
            >
              Build resilient response networks that fuse live traffic, disasters, and field data.
              Adaptive, fast, and ready to scale with the world.
            </MotionP>
            <MotionDiv
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.44, duration: 0.6, ease: "easeOut" }}
            >
              <Link to="/register" className="landing-cta">Get Started</Link>
            </MotionDiv>
          </div>

          <MotionDiv
            className="landing-globe"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            <GlobeCanvas />
            <div className="globe-overlay" />
          </MotionDiv>
        </div>
      </MotionDiv>
    </div>
  )
}
