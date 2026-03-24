import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider, useAuth } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import { useGeolocation } from "./hooks/useGeolocation"

import LiveMonitor from "./pages/LiveMonitor"
import Incidents from "./pages/Incidents"
import Analytics from "./pages/Analytics"
import LandingPage from "./pages/LandingPage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AlertsSent from "./pages/AlertsSent"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE"

function AppRoutes() {
  const { isLoggedIn, loading } = useAuth()
  
  // Enable GPS tracking when user is logged in
  useGeolocation(isLoggedIn)

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f8fafc"
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/landing"
        element={<LandingPage />}
      />
      <Route
        path="/"
        element={<LandingPage />}
      />
      <Route
        path="/about"
        element={<LandingPage />}
      />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/map" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isLoggedIn ? <Navigate to="/map" replace /> : <Register />}
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <LiveMonitor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <Incidents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts-sent"
        element={
          <ProtectedRoute>
            <AlertsSent />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme")
    const theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : "dark"
    document.documentElement.setAttribute("data-theme", theme)
  }, [])

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
