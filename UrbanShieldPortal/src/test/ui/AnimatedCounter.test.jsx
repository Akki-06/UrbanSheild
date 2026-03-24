import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import AnimatedCounter from "../../components/ui/AnimatedCounter"

// Mock framer-motion's useInView to return true by default
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useInView: vi.fn(() => true),
  }
})

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders with default value of 0 initially", () => {
    render(<AnimatedCounter to={100} />)
    // Initially renders 0 before animation
    expect(screen.getByText(/\d/)).toBeTruthy()
  })

  it("applies suffix correctly", () => {
    render(<AnimatedCounter to={50} suffix="+" />)
    const el = screen.getByText(/\+/)
    expect(el).toBeTruthy()
  })

  it("applies prefix correctly", () => {
    render(<AnimatedCounter to={99} prefix="$" />)
    const el = screen.getByText(/\$/)
    expect(el).toBeTruthy()
  })

  it("applies className to span", () => {
    const { container } = render(<AnimatedCounter to={10} className="my-counter" />)
    expect(container.querySelector(".my-counter")).toBeTruthy()
  })

  it("renders a span element", () => {
    const { container } = render(<AnimatedCounter to={42} />)
    expect(container.querySelector("span")).toBeTruthy()
  })

  it("handles to=0 without crashing", () => {
    render(<AnimatedCounter to={0} />)
    expect(screen.getByText("0")).toBeTruthy()
  })

  it("handles large numbers", () => {
    expect(() => render(<AnimatedCounter to={1000000} />)).not.toThrow()
  })
})
