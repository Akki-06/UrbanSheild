import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SpotlightCard from "../../components/ui/SpotlightCard"

describe("SpotlightCard", () => {
  it("renders children content", () => {
    render(<SpotlightCard><p>Test Content</p></SpotlightCard>)
    expect(screen.getByText("Test Content")).toBeTruthy()
  })

  it("applies custom className", () => {
    const { container } = render(<SpotlightCard className="custom-class">X</SpotlightCard>)
    expect(container.querySelector(".custom-class")).toBeTruthy()
  })

  it("has the spotlight-card class", () => {
    const { container } = render(<SpotlightCard>X</SpotlightCard>)
    expect(container.querySelector(".spotlight-card")).toBeTruthy()
  })

  it("has spotlight overlay element", () => {
    const { container } = render(<SpotlightCard>X</SpotlightCard>)
    expect(container.querySelector(".spotlight-card__overlay")).toBeTruthy()
  })

  it("has content wrapper element", () => {
    const { container } = render(<SpotlightCard>X</SpotlightCard>)
    expect(container.querySelector(".spotlight-card__content")).toBeTruthy()
  })

  it("updates CSS variables on mouse move", () => {
    const { container } = render(<SpotlightCard>X</SpotlightCard>)
    const card = container.querySelector(".spotlight-card")

    // Mock getBoundingClientRect
    card.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 300, height: 200,
    }))

    fireEvent.mouseMove(card, { clientX: 50, clientY: 80 })
    expect(card.style.getPropertyValue("--spotlight-x")).toBe("50px")
    expect(card.style.getPropertyValue("--spotlight-y")).toBe("80px")
  })

  it("resets spotlight position on mouse leave", () => {
    const { container } = render(<SpotlightCard>X</SpotlightCard>)
    const card = container.querySelector(".spotlight-card")

    card.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 300, height: 200,
    }))

    fireEvent.mouseMove(card, { clientX: 100, clientY: 100 })
    fireEvent.mouseLeave(card)

    expect(card.style.getPropertyValue("--spotlight-x")).toBe("-999px")
    expect(card.style.getPropertyValue("--spotlight-y")).toBe("-999px")
  })

  it("accepts custom spotlightColor", () => {
    const { container } = render(
      <SpotlightCard spotlightColor="rgba(255,0,0,0.3)">X</SpotlightCard>
    )
    const card = container.querySelector(".spotlight-card")
    card.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 300, height: 200 }))
    fireEvent.mouseMove(card, { clientX: 10, clientY: 10 })
    expect(card.style.getPropertyValue("--spotlight-color")).toBe("rgba(255,0,0,0.3)")
  })
})
