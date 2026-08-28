import { getSalidas, getProductos, getInventario } from '@/lib/actions'
import SalidasClient from '@/components/salidas/salidas-client'

export const dynamic = 'force-dynamic'

export default async function SalidasPage() {
  const [salidas, productos, inventario] = await Promise.all([
    getSalidas(),
    getProductos(),
    getInventario(),
  ])
  return <SalidasClient salidas={salidas} productos={productos} inventario={inventario} />
}
