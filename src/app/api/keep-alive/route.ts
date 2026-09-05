import { createAdminClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = createAdminClient()
    console.log('[keep-alive] connecting to Supabase')

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
    console.error('[keep-alive] Unexpected error:', msg)
    return Response.json({ ok: false, error: msg }, { status: 500 })
  }
}
