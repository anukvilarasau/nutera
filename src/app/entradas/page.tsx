import { getEntradas, getProductos } from '@/lib/actions'
import EntradasClient from '@/components/entradas/entradas-client'
import type { Entrada, Producto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  let entradas: Entrada[] = []
  let productos: Producto[] = []
  try {
    ;[entradas, productos] = await Promise.all([getEntradas(), getProductos()])
  } catch (e) {
    console.error('Error cargando entradas:', e)
  }
  return <EntradasClient entradas={entradas} productos={productos} />
}
