import { getVentas, getProductos, getInventario } from '@/lib/actions'
import VentasClient from '@/components/ventas/ventas-client'
import type { Venta, Producto, InventarioItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const [ventas, productos, inventario] = await Promise.all([
    getVentas().catch((e) => { console.error('Error cargando ventas:', e); return [] as Venta[] }),
    getProductos().catch((e) => { console.error('Error cargando productos:', e); return [] as Producto[] }),
    getInventario().catch((e) => { console.error('Error cargando inventario:', e); return [] as InventarioItem[] }),
  ])
  return <VentasClient ventas={ventas} productos={productos} inventario={inventario} />
}
