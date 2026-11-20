"use client"

import * as React from "react"

import { authService } from "@/services/authService"
import type { AuthUser, LoginCredentials } from "@/types/auth"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // La sesión vive en localStorage: solo puede leerse en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(authService.getStoredSession())
    setIsLoading(false)
  }, [])

  const login = React.useCallback(async (credentials: LoginCredentials) => {
    setError(null)

    try {
      const nextUser = await authService.login(credentials)

      authService.saveSession(nextUser)
      setUser(nextUser)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo iniciar sesión"

      setError(message)
      throw cause
    }
  }, [])

  const logout = React.useCallback(() => {
    authService.clearSession()
    setUser(null)
    setError(null)
  }, [])

  const value = React.useMemo(
    () => ({ user, isLoading, error, login, logout }),
    [user, isLoading, error, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
