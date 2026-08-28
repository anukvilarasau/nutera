import { getInventario } from '@/lib/actions'
import InventarioClient from '@/components/inventario/inventario-client'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const inventario = await getInventario()
  return <InventarioClient inventario={inventario} />
}
