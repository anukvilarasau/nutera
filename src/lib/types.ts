export type ProductoTipo = 'Producto' | 'Insumo'
export type EstadoStock = 'disponible' | 'bajo' | 'agotado'

export interface Producto {
  id: string
  codigo: number
  tipo: ProductoTipo
  nombre: string
  marca: string
  unidad: string
  costo: number
  margen: number
  created_at: string
  updated_at: string
}

export interface Entrada {
  id: string
  producto_id: string
  fecha: string
  cantidad: number
  costo_unitario: number
  created_at: string
  producto: {
    codigo: number
    nombre: string
    unidad: string
  } | null
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number | null  // null = insumo (no se cobra)
  created_at: string
  producto: {
    codigo: number
    nombre: string
    unidad: string
    tipo: string
  } | null
}

export interface Venta {
  id: string
  fecha: string
  total: number
  created_at: string
  items: VentaItem[]
}

export interface InventarioItem {
  id: string
  codigo: number
  nombre: string
  marca: string
  tipo: ProductoTipo
  unidad: string
  costo: number
  margen: number
  precio_venta: number
  total_entradas: number
  total_salidas: number
  stock_total: number
  estado: EstadoStock
}
