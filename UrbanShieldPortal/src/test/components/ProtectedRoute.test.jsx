import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import ProtectedRoute from "../../components/ProtectedRoute"

// Mock AuthContext
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from "../../context/AuthContext"

function renderProtectedRoute(isLoggedIn, loading = false) {
  useAuth.mockReturnValue({ isLoggedIn, loading })

  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ProtectedRoute", () => {
  it("renders children when user is logged in", () => {
    renderProtectedRoute(true)
    expect(screen.getByText("Protected Content")).toBeTruthy()
  })

  it("redirects to /login when user is not logged in", () => {
    renderProtectedRoute(false)
    expect(screen.getByText("Login Page")).toBeTruthy()
  })

  it("does not render protected content when logged out", () => {
    renderProtectedRoute(false)
    expect(screen.queryByText("Protected Content")).toBeNull()
  })

  it("renders loading spinner while loading", () => {
    renderProtectedRoute(false, true)
    expect(screen.getByText("Loading...")).toBeTruthy()
    expect(screen.queryByText("Protected Content")).toBeNull()
  })
})
