import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { fecha, items } = await req.json() as {
      fecha: string
      items: Array<{ producto_id: string; cantidad: number; precio_unitario: number | null }>
    }

    if (!items || items.length === 0) {
      return Response.json({ error: 'La venta debe tener al menos un ítem' }, { status: 400 })
    }

    const sb = await createClient()

    const total = items.reduce((sum, item) => {
      return sum + (item.precio_unitario != null ? item.precio_unitario * item.cantidad : 0)
    }, 0)

    // Insertar venta
    const { data: venta, error: ventaError } = await sb
      .from('ventas')
      .insert({ fecha, total: +total.toFixed(2) })
      .select()
      .single()

    if (ventaError) {
      console.error('[POST /api/ventas] ventas insert:', ventaError)
      return Response.json({ error: ventaError.message }, { status: 400 })
    }

    // Insertar ítems
    const { error: itemsError } = await sb
      .from('venta_items')
      .insert(items.map(i => ({
        venta_id: venta.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario ?? null,
      })))

    if (itemsError) {
      console.error('[POST /api/ventas] venta_items insert:', itemsError)
      // Compensating delete — best effort
      await sb.from('ventas').delete().eq('id', venta.id)
      return Response.json({ error: itemsError.message }, { status: 400 })
    }

    // Devolver venta completa con ítems
    const { data: full, error: fetchError } = await sb
      .from('ventas')
      .select(`*, items:venta_items(*, producto:productos(codigo, nombre, unidad, tipo))`)
      .eq('id', venta.id)
      .single()

    if (fetchError) {
      console.error('[POST /api/ventas] fetch full venta:', fetchError)
      return Response.json({ error: fetchError.message }, { status: 500 })
    }

    return Response.json(full)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/ventas] Unexpected error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
