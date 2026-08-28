'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase'
import type { Producto, Entrada, Salida, InventarioItem } from '@/lib/types'

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

  // Fallback manual si la función RPC no está disponible
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

export async function createProducto(payload: {
  codigo: number
  tipo: 'Producto' | 'Insumo'
  nombre: string
  marca: string
  unidad: string
  costo: number
  margen: number
}): Promise<Producto> {
  const sb = createClient()
  const { data, error } = await sb
    .from('productos')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/productos')
  revalidatePath('/inventario')
  return data as Producto
}

export async function updateProducto(
  id: string,
  payload: Partial<Omit<Producto, 'id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('productos').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/productos')
  revalidatePath('/inventario')
}

export async function deleteProducto(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('productos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/productos')
  revalidatePath('/inventario')
  revalidatePath('/entradas')
  revalidatePath('/salidas')
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

export async function createEntrada(payload: {
  producto_id: string
  fecha: string
  cantidad: number
  costo_unitario: number
}): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('entradas').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/entradas')
  revalidatePath('/inventario')
}

export async function deleteEntrada(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('entradas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/entradas')
  revalidatePath('/inventario')
}

// ─── SALIDAS ──────────────────────────────────────────────────────────────────

export async function getSalidas(): Promise<Salida[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('salidas')
    .select('*, producto:productos(codigo, nombre, unidad)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Salida[]
}

export async function createSalida(payload: {
  producto_id: string
  fecha: string
  cantidad: number
  precio_unitario: number
}): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('salidas').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/salidas')
  revalidatePath('/inventario')
}

export async function deleteSalida(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('salidas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/salidas')
  revalidatePath('/inventario')
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
