import { Link } from "react-router-dom"
import "../styles/LandingPage.css"

export default function LandingPage() {
  return (
    <div className="hero">
      <div className="hero-overlay" />

      <header className="hero-nav">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">🌐</span>
          <span className="brand-text">UrbanShield</span>
        </div>
        <nav className="nav-links">
          <Link to="/map">Live Map</Link>
          <Link to="/login">Accounts</Link>
          <Link to="/about">About Us</Link>
        </nav>
      </header>

      <main className="hero-content">
        <div className="hero-text">
          <h1>Intelligent Traffic &amp; Disaster System</h1>
          <p>Real-time monitoring. Smart routing. Automated emergency response.</p>
          <Link to="/register" className="primary-btn">Get Started</Link>
        </div>
      </main>
    </div>
  )
}
