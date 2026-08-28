import { getInventario } from '@/lib/actions'
import InventarioClient from '@/components/inventario/inventario-client'
import type { InventarioItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  let inventario: InventarioItem[] = []
  try {
    inventario = await getInventario()
  } catch (e) {
    console.error('Error cargando inventario:', e)
  }
  return <InventarioClient inventario={inventario} />
}
