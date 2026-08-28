import { getProductos } from '@/lib/actions'
import ProductosClient from '@/components/productos/productos-client'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const productos = await getProductos()
  return <ProductosClient initialProductos={productos} />
}
