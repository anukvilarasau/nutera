import { createClient } from '@supabase/supabase-js'

// Same normalization used in proxy.ts — strips any path component that
// Supabase may append to the URL (e.g. /rest/v1) and trailing slashes.
function normalizeSupabaseUrl(raw: string) {
  return raw
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d.*$/i, '')
    .replace(/\/$/, '')
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!rawUrl || !serviceKey) {
    const missing = [!rawUrl && 'NEXT_PUBLIC_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean).join(', ')
    console.error('[keep-alive] Missing env vars:', missing)
    return Response.json({ ok: false, error: `Missing env vars: ${missing}` }, { status: 500 })
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl)
  // Log only the hostname, never the key
  console.log('[keep-alive] connecting to', new URL(supabaseUrl).hostname)

  try {
    const sb = createClient(supabaseUrl, serviceKey)

    const { error } = await sb
      .from('productos')
      .select('id')
      .limit(1)
      .single()

    // PGRST116 = "no rows" → empty table but connection succeeded
    if (error && error.code !== 'PGRST116') {
      console.error('[keep-alive] Supabase error — code:', error.code, '— message:', error.message)
      return Response.json({ ok: false, error: error.message, code: error.code }, { status: 500 })
    }

    const ts = new Date().toISOString()
    console.log('[keep-alive] ping ok', ts)
    return Response.json({ ok: true, ts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[keep-alive] Unexpected error — url:', supabaseUrl, '— error:', msg)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
