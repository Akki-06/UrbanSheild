import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ShinyText from "../../components/ui/ShinyText"

describe("ShinyText", () => {
  it("renders the text prop", () => {
    render(<ShinyText text="Shining" />)
    expect(screen.getByText("Shining")).toBeTruthy()
  })

  it("applies shiny-text class", () => {
    const { container } = render(<ShinyText text="X" />)
    expect(container.querySelector(".shiny-text")).toBeTruthy()
  })

  it("applies animated class when not disabled", () => {
    const { container } = render(<ShinyText text="X" />)
    expect(container.querySelector(".shiny-text--animated")).toBeTruthy()
  })

  it("does not apply animated class when disabled", () => {
    const { container } = render(<ShinyText text="X" disabled />)
    expect(container.querySelector(".shiny-text--animated")).toBeNull()
  })

  it("applies animation duration from speed prop", () => {
    const { container } = render(<ShinyText text="X" speed={6} />)
    const el = container.querySelector(".shiny-text")
    expect(el.style.animationDuration).toBe("6s")
  })

  it("applies custom className", () => {
    const { container } = render(<ShinyText text="X" className="my-shiny" />)
    expect(container.querySelector(".my-shiny")).toBeTruthy()
  })
})
