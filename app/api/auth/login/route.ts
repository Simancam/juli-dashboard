import { NextResponse } from "next/server"

import { authenticate } from "@/lib/mock-auth"
import type { ApiErrorResponse, LoginCredentials, LoginResponse } from "@/types/auth"

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { message: "Solicitud inválida" },
      { status: 400 }
    )
  }

  const { username, password } = (body ?? {}) as Partial<LoginCredentials>

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  ) {
    return NextResponse.json<ApiErrorResponse>(
      { message: "Usuario y contraseña son obligatorios" },
      { status: 400 }
    )
  }

  const user = authenticate({ username, password })

  if (!user) {
    return NextResponse.json<ApiErrorResponse>(
      { message: "Usuario o contraseña incorrectos" },
      { status: 401 }
    )
  }

  return NextResponse.json<LoginResponse>({ user })
}
