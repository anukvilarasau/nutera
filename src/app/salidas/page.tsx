import { getSalidas, getProductos, getInventario } from '@/lib/actions'
import SalidasClient from '@/components/salidas/salidas-client'
import type { Salida, Producto, InventarioItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function SalidasPage() {
  let salidas: Salida[] = []
  let productos: Producto[] = []
  let inventario: InventarioItem[] = []
  try {
    ;[salidas, productos, inventario] = await Promise.all([
      getSalidas(), getProductos(), getInventario(),
    ])
  } catch (e) {
    console.error('Error cargando salidas:', e)
  }
  return <SalidasClient salidas={salidas} productos={productos} inventario={inventario} />
}
