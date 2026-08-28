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
      console.error('[POST /api/productos] Supabase error:', JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/productos] Error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
