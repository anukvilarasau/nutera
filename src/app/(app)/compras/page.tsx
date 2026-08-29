import { getCompras, getProductos } from '@/lib/actions'
import ComprasClient from '@/components/compras/compras-client'
import type { Compra, Producto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  const [compras, productos] = await Promise.all([
    getCompras().catch((e) => { console.error('Error cargando compras:', e); return [] as Compra[] }),
    getProductos().catch((e) => { console.error('Error cargando productos:', e); return [] as Producto[] }),
  ])
  return <ComprasClient compras={compras} productos={productos} />
}
