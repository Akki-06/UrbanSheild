import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import Aurora from "../../components/ui/Aurora"

describe("Aurora", () => {
  it("renders without crashing", () => {
    const { container } = render(<Aurora />)
    expect(container.querySelector(".aurora")).toBeTruthy()
  })

  it("renders default 3 blobs", () => {
    const { container } = render(<Aurora />)
    const blobs = container.querySelectorAll(".aurora__blob")
    expect(blobs.length).toBe(3)
  })

  it("renders correct number of blobs for custom colorStops", () => {
    const { container } = render(<Aurora colorStops={["#red", "#green", "#blue", "#orange"]} />)
    const blobs = container.querySelectorAll(".aurora__blob")
    expect(blobs.length).toBe(4)
  })

  it("applies custom blur value via CSS variable", () => {
    const { container } = render(<Aurora blur={80} />)
    const el = container.querySelector(".aurora")
    expect(el.style.getPropertyValue("--aurora-blur")).toBe("80px")
  })

  it("applies custom speed value via CSS variable", () => {
    const { container } = render(<Aurora speed={2} />)
    const el = container.querySelector(".aurora")
    expect(el.style.getPropertyValue("--aurora-speed")).toBe("2")
  })

  it("applies custom className", () => {
    const { container } = render(<Aurora className="my-aurora" />)
    expect(container.querySelector(".my-aurora")).toBeTruthy()
  })

  it("has aria-hidden attribute", () => {
    const { container } = render(<Aurora />)
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy()
  })

  it("each blob has its background color set", () => {
    const colors = ["#1e3a8a", "#7c3aed", "#065f46"]
    const { container } = render(<Aurora colorStops={colors} />)
    const blobs = container.querySelectorAll(".aurora__blob")
    // jsdom may normalise hex to rgb, so just check the attribute is non-empty
    blobs.forEach((blob) => {
      expect(blob.style.background.length).toBeGreaterThan(0)
    })
  })
})
