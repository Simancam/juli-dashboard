import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from "@/types/auth"

const SESSION_KEY = "juli.session"

export function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.username === "string" &&
    candidate.role === "admin"
  )
}

export function getStoredSession(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SESSION_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    return isAuthUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(user: AuthUser): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(SESSION_KEY)
}

async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const data = (await response.json().catch(() => null)) as
    | (Partial<LoginResponse> & { message?: string })
    | null

  if (!response.ok || !data?.user) {
    throw new Error(data?.message ?? "No se pudo iniciar sesión")
  }

  return data.user
}

export const authService = {
  login,
  getStoredSession,
  saveSession,
  clearSession,
}
