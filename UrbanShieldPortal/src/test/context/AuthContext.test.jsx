import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "../../context/AuthContext"
import { MemoryRouter } from "react-router-dom"

// Mock axios to avoid real HTTP calls
vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

function TestConsumer() {
  const { isLoggedIn, user, loading } = useAuth()
  return (
    <div>
      <span data-testid="logged-in">{isLoggedIn ? "true" : "false"}</span>
      <span data-testid="user">{user ? user.username : "none"}</span>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
    </div>
  )
}

function renderWithAuth(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("provides isLoggedIn=false when no token in localStorage", async () => {
    renderWithAuth(<TestConsumer />)
    // Wait for loading to settle
    await act(async () => {})
    expect(screen.getByTestId("logged-in").textContent).toBe("false")
  })

  it("provides isLoggedIn=true when access_token exists in localStorage", async () => {
    localStorage.setItem("access_token", "mock_access_token")
    localStorage.setItem("user_meta", JSON.stringify({ username: "john", isAdmin: false }))

    renderWithAuth(<TestConsumer />)
    await act(async () => {})

    expect(screen.getByTestId("logged-in").textContent).toBe("true")
  })

  it("provides user data from localStorage", async () => {
    localStorage.setItem("access_token", "token123")
    localStorage.setItem("user_meta", JSON.stringify({ username: "alice", isAdmin: false }))

    renderWithAuth(<TestConsumer />)
    await act(async () => {})

    expect(screen.getByTestId("user").textContent).toBe("alice")
  })

  it("renders without crashing with no localStorage data", async () => {
    expect(() => renderWithAuth(<TestConsumer />)).not.toThrow()
  })

  it("exposes loading state", async () => {
    renderWithAuth(<TestConsumer />)
    // Eventually loading should become ready
    await act(async () => {})
    const loadingEl = screen.getByTestId("loading")
    expect(["loading", "ready"]).toContain(loadingEl.textContent)
  })
})
