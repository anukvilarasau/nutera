import { getEntradas, getProductos } from '@/lib/actions'
import EntradasClient from '@/components/entradas/entradas-client'
import type { Entrada, Producto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  const [entradas, productos] = await Promise.all([
    getEntradas().catch((e) => { console.error('Error cargando entradas:', e); return [] as Entrada[] }),
    getProductos().catch((e) => { console.error('Error cargando productos:', e); return [] as Producto[] }),
  ])
  return <EntradasClient entradas={entradas} productos={productos} />
}
