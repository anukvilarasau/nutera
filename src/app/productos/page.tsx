import { getProductos } from '@/lib/actions'
import ProductosClient from '@/components/productos/productos-client'
import type { Producto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  let productos: Producto[] = []
  try {
    productos = await getProductos()
  } catch (e) {
    console.error('Error cargando productos:', e)
  }
  return <ProductosClient initialProductos={productos} />
}
