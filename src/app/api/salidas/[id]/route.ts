import { createClient } from '@/lib/supabase'

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const sb = createClient()
    const { error } = await sb.from('salidas').delete().eq('id', id)
    if (error) {
      console.error('[DELETE /api/salidas/[id]] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/salidas/[id]] Unexpected error:', e)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
