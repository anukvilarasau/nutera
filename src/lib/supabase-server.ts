import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function normalizeUrl(raw: string) {
  return raw
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d.*$/i, '')
    .replace(/\/$/, '')
}

// Session-aware client for server components and API routes (reads cookies).
export async function createClient() {
  const cookieStore = await cookies()

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!rawUrl || !key) {
    throw new Error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  return createServerClient(normalizeUrl(rawUrl), key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server components can't set cookies — middleware handles token refresh.
        }
      },
    },
  })
}

// Service-role client for server-only operations that bypass RLS
// (cron jobs, MCP handlers). Never use on the client side.
export function createAdminClient() {
  const rawUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!rawUrl || !svcKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createSupabaseClient(normalizeUrl(rawUrl), svcKey)
}
