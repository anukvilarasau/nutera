import { createClient } from '@/lib/supabase'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await req.json()
    const sb = createClient()
    const { error } = await sb.from('productos').update(payload).eq('id', id)
    if (error) {
      console.error('[PATCH /api/productos/[id]] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[PATCH /api/productos/[id]] Unexpected error:', e)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const sb = createClient()
    const { error } = await sb.from('productos').delete().eq('id', id)
    if (error) {
      console.error('[DELETE /api/productos/[id]] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/productos/[id]] Unexpected error:', e)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
