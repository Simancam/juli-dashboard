import type { AuthUser, LoginCredentials } from "@/types/auth"

// Credenciales provisionales mientras no exista backend.
const ADMIN_USER: AuthUser = {
  id: "1",
  name: "Administrador",
  username: "admin",
  role: "admin",
}

const ADMIN_PASSWORD = "123456789"

export function authenticate(credentials: LoginCredentials): AuthUser | null {
  const username = credentials.username.trim()

  if (username !== ADMIN_USER.username || credentials.password !== ADMIN_PASSWORD) {
    return null
  }

  return ADMIN_USER
}
