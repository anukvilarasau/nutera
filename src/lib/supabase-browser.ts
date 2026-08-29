import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const url = rawUrl
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d.*$/i, '')
    .replace(/\/$/, '')

  return createBrowserClient(url, key)
}
