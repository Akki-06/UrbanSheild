import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import SplitText from "../../components/ui/SplitText"

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useInView: vi.fn(() => true),
    useAnimation: vi.fn(() => ({ start: vi.fn() })),
    motion: {
      ...actual.motion,
      span: ({ children, ...props }) => <span {...props}>{children}</span>,
    },
  }
})

describe("SplitText", () => {
  it("renders without crashing", () => {
    expect(() => render(<SplitText text="Hello World" />)).not.toThrow()
  })

  it("splits text into words by default", () => {
    const { container } = render(<SplitText text="Hello World" />)
    // Should render multiple spans (2 words)
    const spans = container.querySelectorAll("span")
    expect(spans.length).toBeGreaterThan(1)
  })

  it("applies className to wrapper", () => {
    const { container } = render(<SplitText text="Hi" className="split-cls" />)
    expect(container.querySelector(".split-cls")).toBeTruthy()
  })

  it("renders all text content", () => {
    const { container } = render(<SplitText text="One Two Three" />)
    expect(container.textContent).toContain("One")
    expect(container.textContent).toContain("Two")
    expect(container.textContent).toContain("Three")
  })

  it("handles empty text without crashing", () => {
    expect(() => render(<SplitText text="" />)).not.toThrow()
  })

  it("supports by='letter' mode", () => {
    const { container } = render(<SplitText text="ABC" by="letter" />)
    const spans = container.querySelectorAll("span")
    // wrapper + 3 letter spans
    expect(spans.length).toBeGreaterThanOrEqual(3)
  })
})
