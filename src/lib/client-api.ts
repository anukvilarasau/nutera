import type { Producto, Venta } from '@/lib/types'

async function apiFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

export function createProducto(payload: {
  codigo: number
  tipo: 'Producto' | 'Insumo'
  nombre: string
  marca: string
  unidad: string
  costo: number
  margen: number
}): Promise<Producto> {
  return apiFetch('/api/productos', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
}

export function updateProducto(
  id: string,
  payload: Partial<Omit<Producto, 'id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  return apiFetch(`/api/productos/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
}

export function deleteProducto(id: string): Promise<void> {
  return apiFetch(`/api/productos/${id}`, { method: 'DELETE' })
}

// ─── ENTRADAS ─────────────────────────────────────────────────────────────────

export function createEntrada(payload: {
  producto_id: string
  fecha: string
  cantidad: number
  costo_unitario: number
}): Promise<void> {
  return apiFetch('/api/entradas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
}

export function deleteEntrada(id: string): Promise<void> {
  return apiFetch(`/api/entradas/${id}`, { method: 'DELETE' })
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

export function createVenta(payload: {
  fecha: string
  items: Array<{
    producto_id: string
    cantidad: number
    precio_unitario: number | null
  }>
}): Promise<Venta> {
  return apiFetch('/api/ventas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
}

export function deleteVenta(id: string): Promise<void> {
  return apiFetch(`/api/ventas/${id}`, { method: 'DELETE' })
}
