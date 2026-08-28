import { getVentas, getProductos, getInventario } from '@/lib/actions'
import VentasClient from '@/components/ventas/ventas-client'
import type { Venta, Producto, InventarioItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  let ventas: Venta[] = []
  let productos: Producto[] = []
  let inventario: InventarioItem[] = []
  try {
    ;[ventas, productos, inventario] = await Promise.all([
      getVentas(), getProductos(), getInventario(),
    ])
  } catch (e) {
    console.error('Error cargando ventas:', e)
  }
  return <VentasClient ventas={ventas} productos={productos} inventario={inventario} />
}
