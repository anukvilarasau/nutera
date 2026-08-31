import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error } = await sb
      .from('productos')
      .select('id')
      .limit(1)
      .single()

    // error PGRST116 = "no rows" → tabla vacía pero la conexión funcionó
    if (error && error.code !== 'PGRST116') {
      console.error('[keep-alive] Supabase error:', error.message)
      return Response.json({ ok: false, error: error.message }, { status: 500 })
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
