'use server'

import { createClient } from '@/lib/supabase'
import type { Producto, Entrada, Venta, InventarioItem } from '@/lib/types'

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

export async function getProductos(): Promise<Producto[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('productos')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Producto[]
}

export async function getNextCodigo(tipo: 'Producto' | 'Insumo'): Promise<number> {
  const sb = createClient()
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
  const sb = createClient()
  const { data, error } = await sb
    .from('entradas')
    .select('*, producto:productos(codigo, nombre, unidad)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Entrada[]
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

export async function getVentas(): Promise<Venta[]> {
  const sb = createClient()
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
  const sb = createClient()
  const { data, error } = await sb
    .from('inventario_view')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw new Error(error.message)
  return data as InventarioItem[]
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const sb = createClient()
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
