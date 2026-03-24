import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LandingPage from "../../pages/LandingPage"

// Mock heavy 3D components to avoid WebGL errors in test env
vi.mock("../../components/landing/GlobeCanvas", () => ({
  default: () => <div data-testid="globe-canvas">Globe</div>,
}))

// Mock all UI sub-components so tests focus on page structure
vi.mock("../../components/ui/Aurora", () => ({
  default: ({ className }) => <div data-testid="aurora" className={className} />,
}))

vi.mock("../../components/ui/Particles", () => ({
  default: () => <canvas data-testid="particles" />,
}))

vi.mock("../../components/ui/SplitText", () => ({
  default: ({ text }) => <span>{text}</span>,
}))

vi.mock("../../components/ui/GradientText", () => ({
  default: ({ children }) => <span>{children}</span>,
}))

vi.mock("../../components/ui/ShinyText", () => ({
  default: ({ text }) => <span>{text}</span>,
}))

vi.mock("../../components/ui/AnimatedCounter", () => ({
  default: ({ to, suffix, prefix }) => <span>{prefix}{to}{suffix}</span>,
}))

vi.mock("../../components/ui/SpotlightCard", () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}))

vi.mock("../../components/ui/ScrollReveal", () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock("../../components/ui/BlurText", () => ({
  default: ({ text }) => <span>{text}</span>,
}))

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  useInView: vi.fn(() => true),
  useAnimation: vi.fn(() => ({ start: vi.fn() })),
  AnimatePresence: ({ children }) => children,
}))

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe("LandingPage", () => {
  beforeEach(() => {
    // Mock DOM methods used in useEffect
    document.body.classList.add = vi.fn()
    document.body.classList.remove = vi.fn()
  })

  it("renders without crashing", () => {
    expect(() => renderLanding()).not.toThrow()
  })

  it("renders the brand name", () => {
    renderLanding()
    const brands = screen.getAllByText(/UrbanShield/)
    expect(brands.length).toBeGreaterThan(0)
  })

  it("renders navigation links", () => {
    renderLanding()
    // Use getAllByText since "Features" may appear in footer too
    expect(screen.getAllByText("Features").length).toBeGreaterThan(0)
    expect(screen.getByText("Coverage")).toBeTruthy()
    expect(screen.getAllByText(/how it works/i).length).toBeGreaterThan(0)
  })

  it("renders Get Started link pointing to /register", () => {
    renderLanding()
    const links = screen.getAllByRole("link", { name: /get started/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute("href")).toBe("/register")
  })

  it("renders Sign In link pointing to /login", () => {
    renderLanding()
    const signIn = screen.getByRole("link", { name: /sign in/i })
    expect(signIn.getAttribute("href")).toBe("/login")
  })

  it("renders the hero headline text", () => {
    renderLanding()
    expect(screen.getByText("Intelligent Traffic")).toBeTruthy()
    expect(screen.getByText("& Disaster Response")).toBeTruthy()
  })

  it("renders the globe canvas", () => {
    renderLanding()
    expect(screen.getByTestId("globe-canvas")).toBeTruthy()
  })

  it("renders all 6 feature cards", () => {
    renderLanding()
    expect(screen.getByText("Real-Time Geospatial Map")).toBeTruthy()
    expect(screen.getByText("Proximity Alerts")).toBeTruthy()
    expect(screen.getByText("Smart Evacuation Routing")).toBeTruthy()
    expect(screen.getByText("Automated Escalation")).toBeTruthy()
    expect(screen.getByText("Operational Analytics")).toBeTruthy()
    expect(screen.getByText("Multi-Agency Coordination")).toBeTruthy()
  })

  it("renders stats section with 4 stats", () => {
    renderLanding()
    expect(screen.getByText("Locations Monitored")).toBeTruthy()
    expect(screen.getByText("Alert Accuracy")).toBeTruthy()
    expect(screen.getByText("Avg Alert Latency")).toBeTruthy()
    expect(screen.getByText("Live Data Feeds")).toBeTruthy()
  })

  it("renders all 3 how-it-works steps", () => {
    renderLanding()
    expect(screen.getByText("Register & Locate")).toBeTruthy()
    expect(screen.getByText("Monitor & Analyse")).toBeTruthy()
    expect(screen.getByText("React & Coordinate")).toBeTruthy()
  })

  it("renders the CTA section", () => {
    renderLanding()
    const createAccount = screen.getAllByRole("link", { name: /create free account/i })
    expect(createAccount.length).toBeGreaterThan(0)
  })

  it("renders footer with current year", () => {
    renderLanding()
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeTruthy()
  })

  it("renders trust pills (JWT Secured, Google OAuth)", () => {
    renderLanding()
    expect(screen.getByText("JWT Secured")).toBeTruthy()
    expect(screen.getByText("Google OAuth")).toBeTruthy()
  })
})
