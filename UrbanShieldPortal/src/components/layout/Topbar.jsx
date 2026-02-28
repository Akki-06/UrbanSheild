import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { FaSignOutAlt, FaMoon, FaSun } from "react-icons/fa"
import api from "../../api/axios"

export default function Topbar({ onSearchSelect }) {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()

  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme")
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme
    return "dark" // default to dark to match landing aesthetic
  })
  const searchCacheRef = useRef(new Map())
  const requestControllerRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const runSearch = (rawQuery) => {
    const trimmedQuery = rawQuery.trim()
    if (requestControllerRef.current) {
      requestControllerRef.current.abort()
      requestControllerRef.current = null
    }

    if (trimmedQuery.length < 2) {
      setSuggestions([])
      setLoading(false)
      return Promise.resolve()
    }

    const cacheKey = trimmedQuery.toLowerCase()
    if (searchCacheRef.current.has(cacheKey)) {
      setSuggestions(searchCacheRef.current.get(cacheKey))
      setLoading(false)
      return Promise.resolve()
    }

    const controller = new AbortController()
    requestControllerRef.current = controller
    setLoading(true)

    return api.get("search/", { params: { q: trimmedQuery }, signal: controller.signal })
      .then(r => {
        const results = Array.isArray(r.data) ? r.data : []
        searchCacheRef.current.set(cacheKey, results)
        setSuggestions(results)
      })
      .catch(err => {
        if (err?.code !== "ERR_CANCELED") {
          setSuggestions([])
        }
      })
      .finally(() => {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null
          setLoading(false)
        }
      })
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (requestControllerRef.current) {
        requestControllerRef.current.abort()
      }
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const handleSelect = (item) => {
    setQuery("")
    setSuggestions([])
    onSearchSelect && onSearchSelect(item)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && suggestions.length) {
      handleSelect(suggestions[0])
    }
  }

  return (
    <div className="topbar" style={{ position: 'relative', zIndex: 100 }}>
      <div className="search-container" style={{ position: 'relative', width: '320px', margin: '0 auto' }}>
        <input
          type="text"
          value={query}
          onChange={e => {
            const nextQuery = e.target.value
            setQuery(nextQuery)
            runSearch(nextQuery)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search locations, incidents or resources..."
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        {loading && <div className="search-loading"></div>}
        {suggestions.length > 0 && (
          <div
            className="search-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              maxHeight: '220px',
              overflowY: 'auto',
              zIndex: 99999,
              padding: 0,
              margin: 0,
              borderRadius: '0 0 8px 8px',
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {suggestions.map(item => (
                <li
                  key={`${item.lat},${item.lon}`}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface-strong)',
                    color: 'var(--text-primary)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-muted)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'var(--surface-strong)')}
                >
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isLoggedIn ? (
        <div className="auth-section">
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <FaSun /> : <FaMoon />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Log Out
          </button>
        </div>
      ) : (
        <div className="topbar-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <FaSun /> : <FaMoon />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button className="primary-btn" onClick={() => navigate("/login") }>
            Log In
          </button>
        </div>
      )}
    </div>
  )
}
