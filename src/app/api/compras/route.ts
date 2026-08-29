import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { fecha, proveedor, items } = await req.json() as {
      fecha: string
      proveedor: string
      items: Array<{ producto_id: string; cantidad: number; costo_unitario: number }>
    }

    if (!items || items.length === 0) {
      return Response.json({ error: 'La compra debe tener al menos un ítem' }, { status: 400 })
    }

    const sb = await createClient()

    const total = items.reduce((sum, i) => sum + i.cantidad * i.costo_unitario, 0)

    const { data: compra, error: compraError } = await sb
      .from('compras')
      .insert({ fecha, proveedor: proveedor ?? '', total: +total.toFixed(2) })
      .select()
      .single()

    if (compraError) {
      console.error('[POST /api/compras] compras insert:', compraError)
      return Response.json({ error: compraError.message }, { status: 400 })
    }

    const { error: itemsError } = await sb
      .from('compra_items')
      .insert(items.map(i => ({
        compra_id:      compra.id,
        producto_id:    i.producto_id,
        cantidad:       i.cantidad,
        costo_unitario: i.costo_unitario,
      })))

    if (itemsError) {
      console.error('[POST /api/compras] compra_items insert:', itemsError)
      await sb.from('compras').delete().eq('id', compra.id)
      return Response.json({ error: itemsError.message }, { status: 400 })
    }

    const { data: full, error: fetchError } = await sb
      .from('compras')
      .select(`*, items:compra_items(*, producto:productos(codigo, nombre, unidad, tipo))`)
      .eq('id', compra.id)
      .single()

    if (fetchError) {
      console.error('[POST /api/compras] fetch full:', fetchError)
      return Response.json({ error: fetchError.message }, { status: 500 })
    }

    return Response.json(full)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/compras] Unexpected error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
