import { Link } from "react-router-dom"
import { Suspense, useEffect } from "react"
import {
  FaShieldAlt,
  FaBolt,
  FaMapMarkedAlt,
  FaBell,
  FaRoute,
  FaUsers,
  FaCloud,
  FaFire,
  FaWater,
  FaChartBar,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa"
import { motion } from "framer-motion"

import GlobeCanvas from "../components/landing/GlobeCanvas"
import Aurora from "../components/ui/Aurora"
import Particles from "../components/ui/Particles"
import SplitText from "../components/ui/SplitText"
import GradientText from "../components/ui/GradientText"
import ShinyText from "../components/ui/ShinyText"
import AnimatedCounter from "../components/ui/AnimatedCounter"
import SpotlightCard from "../components/ui/SpotlightCard"
import ScrollReveal from "../components/ui/ScrollReveal"
import BlurText from "../components/ui/BlurText"
import "../styles/LandingPage.css"

// ─── data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <FaMapMarkedAlt size={28} />,
    title: "Real-Time Geospatial Map",
    desc: "Live Leaflet map overlays disasters, traffic congestion, shelters, hospitals, and authority positions across Uttarakhand.",
    color: "rgba(59,130,246,0.22)",
  },
  {
    icon: <FaBell size={28} />,
    title: "Proximity Alerts",
    desc: "GPS-based notifications fire instantly when a hazard appears within your configurable alert radius — no refresh needed.",
    color: "rgba(234,179,8,0.22)",
  },
  {
    icon: <FaRoute size={28} />,
    title: "Smart Evacuation Routing",
    desc: "Dijkstra + OSRM routing engine calculates optimal escape routes, penalising blocked roads and disaster zones in real time.",
    color: "rgba(34,197,94,0.22)",
  },
  {
    icon: <FaBolt size={28} />,
    title: "Automated Escalation",
    desc: "Critical incidents auto-notify nearest NDRF, Police, Fire, and Medical authorities with severity-based priority queuing.",
    color: "rgba(239,68,68,0.22)",
  },
  {
    icon: <FaChartBar size={28} />,
    title: "Operational Analytics",
    desc: "7-day trend charts, hotspot heatmaps, severity distribution, and live incident timelines for command-centre intelligence.",
    color: "rgba(168,85,247,0.22)",
  },
  {
    icon: <FaUsers size={28} />,
    title: "Multi-Agency Coordination",
    desc: "Unified dashboard for NDRF, SDRF, Police, Fire, and Medical teams with role-based access and escalation logs.",
    color: "rgba(20,184,166,0.22)",
  },
]

const STATS = [
  { icon: <FaShieldAlt />, value: 500, suffix: "+", label: "Locations Monitored" },
  { icon: <FaFire />,      value: 99,  suffix: "%", label: "Alert Accuracy" },
  { icon: <FaWater />,     value: 12,  suffix: "s", label: "Avg Alert Latency" },
  { icon: <FaCloud />,     value: 5,   suffix: " APIs", label: "Live Data Feeds" },
]

const STEPS = [
  {
    step: "01",
    title: "Register & Locate",
    desc: "Create an account and grant location access. UrbanShield pinpoints you on the Uttarakhand map instantly.",
  },
  {
    step: "02",
    title: "Monitor & Analyse",
    desc: "Watch live disaster and traffic overlays, filter by severity, and drill into analytics for situational awareness.",
  },
  {
    step: "03",
    title: "React & Coordinate",
    desc: "Receive real-time proximity alerts, plan evacuation routes, and trigger authority escalations — all from one screen.",
  },
]

// ─── component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  // Enable page scrolling (global.css locks overflow:hidden for dashboard pages)
  useEffect(() => {
    document.body.classList.add("landing-scroll")
    document.getElementById("root")?.classList.add("landing-scroll")
    return () => {
      document.body.classList.remove("landing-scroll")
      document.getElementById("root")?.classList.remove("landing-scroll")
    }
  }, [])

  return (
    <div className="landing-root">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-brand">
          <FaShieldAlt className="brand-shield" />
          <span>UrbanShield</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#stats">Coverage</a>
          <a href="#how">How It Works</a>
          <Link to="/map" className="nav-cta">Live Map</Link>
        </nav>
        <div className="landing-nav-auth">
          <Link to="/login"  className="nav-link-ghost">Sign In</Link>
          <Link to="/register" className="nav-btn-primary">Get Started</Link>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        <Aurora
          colorStops={["#1e3a8a", "#6d28d9", "#0e7490", "#065f46"]}
          speed={0.7}
          blur={130}
        />
        <Particles count={60} color="#93c5fd" speed={0.3} />

        <div className="hero-inner">
          <div className="hero-text-col">
            {/* badge */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hero-badge"
            >
              <span className="badge-dot" />
              <ShinyText text="Live Disaster Intelligence for Uttarakhand" speed={4} />
            </motion.div>

            {/* headline */}
            <h1 className="hero-h1">
              <SplitText
                text="Intelligent Traffic"
                by="word"
                delay={0.08}
                duration={0.65}
              />
              <br />
              <GradientText
                colors={["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"]}
                speed={5}
              >
                <SplitText
                  text="& Disaster Response"
                  by="word"
                  delay={0.1}
                  duration={0.65}
                />
              </GradientText>
            </h1>

            {/* sub */}
            <motion.p
              className="hero-sub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <BlurText
                text="Real-time monitoring, smart evacuation routing, and automated emergency escalation — purpose-built for Uttarakhand's terrain and hazards."
                delay={0.04}
                duration={0.5}
              />
            </motion.p>

            {/* CTA row */}
            <motion.div
              className="hero-cta-row"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <Link to="/register" className="cta-primary">
                Get Started Free
                <FaArrowRight />
              </Link>
              <Link to="/map" className="cta-secondary">
                View Live Map
              </Link>
            </motion.div>

            {/* trust pills */}
            <motion.div
              className="hero-trust"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              {["JWT Secured", "Google OAuth", "NDRF Integrated", "OSRM Routing"].map((t) => (
                <span key={t} className="trust-pill">
                  <FaCheckCircle className="trust-icon" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* globe */}
          <motion.div
            className="hero-globe-col"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
          >
            <div className="globe-ring" />
            <Suspense fallback={<div className="globe-placeholder" />}>
              <GlobeCanvas />
            </Suspense>
          </motion.div>
        </div>

        {/* scroll hint */}
        <motion.div
          className="scroll-hint"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <span />
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section id="stats" className="stats-section">
        <div className="stats-grid">
          {STATS.map(({ icon, value, suffix, label }) => (
            <ScrollReveal key={label} delay={0.1}>
              <div className="stat-card">
                <div className="stat-icon">{icon}</div>
                <div className="stat-value">
                  <AnimatedCounter to={value} suffix={suffix} duration={1600} />
                </div>
                <div className="stat-label">{label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="features-section">
        <div className="section-inner">
          <ScrollReveal>
            <div className="section-label">
              <ShinyText text="Core Capabilities" speed={5} />
            </div>
            <h2 className="section-h2">
              Everything you need for{" "}
              <GradientText colors={["#60a5fa", "#a78bfa", "#34d399", "#60a5fa"]} speed={4}>
                disaster readiness
              </GradientText>
            </h2>
            <p className="section-sub">
              Six integrated modules working together to give first responders and citizens
              real-time situational intelligence.
            </p>
          </ScrollReveal>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.07} direction="up">
                <SpotlightCard spotlightColor={f.color} className="feature-card">
                  <div className="feature-icon" style={{ color: f.color.replace("0.22", "1") }}>
                    {f.icon}
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </SpotlightCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how" className="how-section">
        <Aurora colorStops={["#1e3a8a", "#4c1d95", "#064e3b"]} speed={0.5} blur={150} />
        <div className="section-inner" style={{ position: "relative", zIndex: 1 }}>
          <ScrollReveal>
            <div className="section-label">
              <ShinyText text="How It Works" speed={5} />
            </div>
            <h2 className="section-h2">
              Up and running in{" "}
              <GradientText colors={["#34d399", "#60a5fa", "#a78bfa", "#34d399"]} speed={4}>
                three steps
              </GradientText>
            </h2>
          </ScrollReveal>

          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.15} direction="up">
                <div className="step-card">
                  <div className="step-number">{s.step}</div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                  {i < STEPS.length - 1 && <div className="step-connector" />}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-inner">
          <ScrollReveal>
            <h2 className="cta-h2">
              Ready to protect{" "}
              <GradientText colors={["#f472b6", "#a78bfa", "#60a5fa", "#f472b6"]} speed={4}>
                your community?
              </GradientText>
            </h2>
            <p className="cta-sub">
              Join the UrbanShield network — free for emergency personnel and citizens of Uttarakhand.
            </p>
            <div className="cta-btn-row">
              <Link to="/register" className="cta-primary cta-large">
                Create Free Account
                <FaArrowRight />
              </Link>
              <Link to="/login" className="cta-secondary">
                Already have an account?
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <FaShieldAlt />
          <span>UrbanShield</span>
        </div>
        <div className="footer-links">
          <a href="#features">Features</a>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/map">Live Map</Link>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} UrbanShield. Built for Uttarakhand disaster resilience.
        </p>
      </footer>
    </div>
  )
}
