import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Login from "../../pages/Login"

// Mock react-router navigate
const mockNavigate = vi.fn()
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Google OAuth
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <button onClick={() => onSuccess({ credential: "mock_credential" })}>
      Sign in with Google
    </button>
  ),
}))

// Mock auth context
const mockSetIsLoggedIn = vi.fn()
const mockSetUser = vi.fn()
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    setIsLoggedIn: mockSetIsLoggedIn,
    setUser: mockSetUser,
  }),
}))

// Mock Google auth handler
vi.mock("../../api/googleAuth", () => ({
  handleGoogleSuccess: vi.fn(() => ({ success: true })),
}))

// Mock axios
vi.mock("../../api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from "../../api/axios"

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders without crashing", () => {
    expect(() => renderLogin()).not.toThrow()
  })

  it("renders the heading", () => {
    renderLogin()
    expect(screen.getByText("Welcome Back")).toBeTruthy()
  })

  it("renders username and password inputs", () => {
    renderLogin()
    expect(screen.getByPlaceholderText("Enter your username")).toBeTruthy()
    expect(screen.getByPlaceholderText("Enter your password")).toBeTruthy()
  })

  it("renders the sign in button", () => {
    renderLogin()
    // Use getAllByRole since "Sign in with Google" also matches /sign in/i
    const btns = screen.getAllByRole("button", { name: /sign in/i })
    expect(btns.length).toBeGreaterThan(0)
  })

  it("renders register link", () => {
    renderLogin()
    expect(screen.getByRole("link", { name: /register/i })).toBeTruthy()
  })

  it("renders Google sign in button", () => {
    renderLogin()
    expect(screen.getByText("Sign in with Google")).toBeTruthy()
  })

  it("shows loading state during form submission", async () => {
    api.post.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500)))
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "testuser" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "testpass" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    expect(screen.getByText("Signing In...")).toBeTruthy()
  })

  it("calls api.post with username and password on submit", async () => {
    api.post.mockResolvedValue({
      data: { access: "access_token", refresh: "refresh_token" },
    })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "john" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("token/", { username: "john", password: "secret" })
    })
  })

  it("navigates to home on successful login", async () => {
    api.post.mockResolvedValue({
      data: { access: "access_token", refresh: "refresh_token" },
    })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "testuser" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/")
    })
  })

  it("shows error message on failed login", async () => {
    api.post.mockRejectedValue({
      response: { data: { detail: "Invalid credentials. Please try again." } },
    })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "bad" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "wrong" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials. Please try again.")).toBeTruthy()
    })
  })

  it("stores tokens in localStorage on success", async () => {
    api.post.mockResolvedValue({
      data: { access: "my_access", refresh: "my_refresh" },
    })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "user1" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pass1" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(localStorage.getItem("access_token")).toBe("my_access")
      expect(localStorage.getItem("refresh_token")).toBe("my_refresh")
    })
  })

  it("sets isAdmin to true when username contains 'admin'", async () => {
    api.post.mockResolvedValue({
      data: { access: "tok", refresh: "ref" },
    })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText("Enter your username"), {
      target: { value: "admin_user" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pass" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: true })
      )
    })
  })
})
