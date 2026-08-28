import { createClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const sb = createClient()
    const { error } = await sb.from('entradas').insert(payload)
    if (error) {
      console.error('[POST /api/entradas] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/entradas] Unexpected error:', e)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
