import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"

let cached: SupabaseClient<Database> | null = null

function readEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`)
  }

  return value
}

/**
 * Cliente con service role: solo se usa en API Routes y servicios de servidor.
 * Las tablas tienen RLS sin políticas, así que no se expone a clientes públicos.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) {
    return cached
  }

  cached = createClient<Database>(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return cached
}
