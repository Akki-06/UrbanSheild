import { createContext, useState } from "react"
import axios from "axios"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null)

  const login = async (username, password) => {
    const response = await axios.post(
      "http://127.0.0.1:8000/api/token/",
      { username, password }
    )

    localStorage.setItem("access", response.data.access)
    localStorage.setItem("refresh", response.data.refresh)

    // Attach token AFTER login
    axios.defaults.headers.common["Authorization"] =
      `Bearer ${response.data.access}`

    setUser(username)
  }

  const logout = () => {
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")
    delete axios.defaults.headers.common["Authorization"]
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}