import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import GradientText from "../../components/ui/GradientText"

describe("GradientText", () => {
  it("renders children text", () => {
    render(<GradientText>Hello World</GradientText>)
    expect(screen.getByText("Hello World")).toBeTruthy()
  })

  it("applies gradient-text class", () => {
    const { container } = render(<GradientText>Test</GradientText>)
    expect(container.querySelector(".gradient-text")).toBeTruthy()
  })

  it("applies custom className", () => {
    const { container } = render(<GradientText className="extra">Test</GradientText>)
    expect(container.querySelector(".extra")).toBeTruthy()
  })

  it("uses custom colors array resulting in non-empty background style", () => {
    const colors = ["#ff0000", "#0000ff"]
    const { container } = render(<GradientText colors={colors}>Coloured</GradientText>)
    const el = container.querySelector(".gradient-text")
    // jsdom may normalise hex colours but background style should be set
    expect(el.style.background.length).toBeGreaterThan(0)
  })

  it("applies animation duration via speed prop", () => {
    const { container } = render(<GradientText speed={8}>Slow</GradientText>)
    const el = container.querySelector(".gradient-text")
    expect(el.style.animationDuration).toBe("8s")
  })

  it("renders a span element", () => {
    const { container } = render(<GradientText>X</GradientText>)
    expect(container.querySelector("span")).toBeTruthy()
  })
})
