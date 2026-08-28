import { createClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const sb = createClient()
    const { data, error } = await sb
      .from('productos')
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('[POST /api/productos] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json(data)
  } catch (e) {
    console.error('[POST /api/productos] Unexpected error:', e)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
