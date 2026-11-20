export type UserRole = "admin"

export interface AuthUser {
  id: string
  name: string
  username: string
  role: UserRole
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  user: AuthUser
}

export interface ApiErrorResponse {
  message: string
}
