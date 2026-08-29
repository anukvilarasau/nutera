import { createClient } from '@/lib/supabase-server'

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const sb = await createClient()
    // compra_items se eliminan en CASCADE
    const { error } = await sb.from('compras').delete().eq('id', id)
    if (error) {
      console.error('[DELETE /api/compras/[id]] Supabase error:', error)
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[DELETE /api/compras/[id]] Unexpected error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
