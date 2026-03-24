import api from "./axios"

export const handleGoogleSuccess = async (credentialResponse) => {
  try {
    const { credential } = credentialResponse

    // Send the Google JWT to backend for verification and user creation/login
    const response = await api.post("accounts/google-auth/", {
      token: credential,
    })

    // Store tokens
    localStorage.setItem("access_token", response.data.access)
    localStorage.setItem("refresh_token", response.data.refresh)
    localStorage.setItem("user_meta", JSON.stringify({
      username: response.data?.user?.username || "GoogleUser",
      isAdmin: false
    }))

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || "Google authentication failed",
    }
  }
}

export const handleGoogleError = () => {
  return {
    success: false,
    error: "Google login failed",
  }
}
