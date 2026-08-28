import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!rawUrl || !key) {
    throw new Error(
      `Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables.`
    )
  }

  // Strip any accidental path suffix (/rest/v1, /auth/v1, etc.)
  // The Supabase JS client appends those itself; providing them causes
  // double-path URLs like /rest/v1/rest/v1/table → "Invalid path" error.
  const url = rawUrl.replace(/\/(rest|auth|storage|realtime|functions)\/v\d.*$/i, '').replace(/\/$/, '')

  return createSupabaseClient(url, key)
}
