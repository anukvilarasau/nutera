import { getEntradas, getProductos } from '@/lib/actions'
import EntradasClient from '@/components/entradas/entradas-client'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  const [entradas, productos] = await Promise.all([getEntradas(), getProductos()])
  return <EntradasClient entradas={entradas} productos={productos} />
}
