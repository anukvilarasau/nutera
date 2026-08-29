'use server'

import { createClient } from '@/lib/supabase-server'
import type { Producto, Entrada, Compra, Venta, InventarioItem, VentaRentabilidad, ItemCosto } from '@/lib/types'

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

export async function getProductos(): Promise<Producto[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('productos')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Producto[]
}

export async function getNextCodigo(tipo: 'Producto' | 'Insumo'): Promise<number> {
  const sb = await createClient()
  const { data, error } = await sb.rpc('get_next_codigo', { p_tipo: tipo })
  if (!error && data) return data as number

  const { data: rows } = await sb
    .from('productos')
    .select('codigo')
    .eq('tipo', tipo)
    .order('codigo', { ascending: false })
    .limit(1)
  const max = rows?.[0]?.codigo ?? (tipo === 'Insumo' ? 499 : 99)
  const next = max + 1
  if (tipo === 'Insumo' && next < 500) return 500
  if (tipo === 'Producto' && next < 100) return 100
  return next
}

// ─── ENTRADAS ─────────────────────────────────────────────────────────────────

export async function getEntradas(): Promise<Entrada[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('entradas')
    .select('*, producto:productos(codigo, nombre, unidad)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Entrada[]
}

// ─── COMPRAS ──────────────────────────────────────────────────────────────────

export async function getCompras(): Promise<Compra[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('compras')
    .select(`*, items:compra_items(*, producto:productos(codigo, nombre, unidad, tipo))`)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Compra[]
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

export async function getVentas(): Promise<Venta[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('ventas')
    .select(`
      *,
      items:venta_items(
        *,
        producto:productos(codigo, nombre, unidad, tipo)
      )
    `)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Venta[]
}

// ─── INVENTARIO ───────────────────────────────────────────────────────────────

export async function getInventario(): Promise<InventarioItem[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('inventario_view')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw new Error(error.message)
  return data as InventarioItem[]
}

// ─── BALANCE ──────────────────────────────────────────────────────────────────

export async function getBalance(): Promise<{
  ventas: VentaRentabilidad[]
  itemsCosto: ItemCosto[]
}> {
  const sb = await createClient()

  const [{ data: ventas, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    sb.from('venta_rentabilidad').select('*'),
    sb
      .from('venta_items')
      .select('producto_id, cantidad, producto:productos(nombre, tipo, unidad, costo)'),
  ])

  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)

  // Agrupar items por producto para el desglose de costos
  const map = new Map<string, ItemCosto>()
  for (const row of items ?? []) {
    const p = row.producto as unknown as { nombre: string; tipo: string; unidad: string; costo: number } | null
    if (!p) continue
    const existing = map.get(row.producto_id)
    const costoLinea = p.costo * row.cantidad
    if (existing) {
      existing.cantidad_total += row.cantidad
      existing.costo_total    += costoLinea
    } else {
      map.set(row.producto_id, {
        producto_id:    row.producto_id,
        nombre:         p.nombre,
        tipo:           p.tipo,
        unidad:         p.unidad,
        cantidad_total: row.cantidad,
        costo_total:    costoLinea,
      })
    }
  }

  const itemsCosto = [...map.values()].sort((a, b) => b.costo_total - a.costo_total)

  return { ventas: (ventas ?? []) as VentaRentabilidad[], itemsCosto }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const sb = await createClient()
  const [{ count: totalProductos }, { count: totalInsumos }, { data: estados }] =
    await Promise.all([
      sb.from('productos').select('*', { count: 'exact', head: true }).eq('tipo', 'Producto'),
      sb.from('productos').select('*', { count: 'exact', head: true }).eq('tipo', 'Insumo'),
      sb.from('inventario_view').select('estado'),
    ])

  const agotados = estados?.filter(i => i.estado === 'agotado').length ?? 0
  const bajos    = estados?.filter(i => i.estado === 'bajo').length ?? 0

  return {
    totalProductos: totalProductos ?? 0,
    totalInsumos:   totalInsumos ?? 0,
    agotados,
    bajos,
  }
}
