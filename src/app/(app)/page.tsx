export const dynamic = 'force-dynamic'

import { getDashboardStats } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Boxes, TrendingDown, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const cards = [
    {
      label: 'Productos',
      value: stats.totalProductos,
      icon: Package,
      color: 'text-zinc-700',
      bg: '',
    },
    {
      label: 'Insumos',
      value: stats.totalInsumos,
      icon: Boxes,
      color: 'text-zinc-700',
      bg: '',
    },
    {
      label: 'Stock bajo',
      value: stats.bajos,
      icon: TrendingDown,
      color: 'text-amber-600',
      bg: 'border-amber-200 bg-amber-50',
    },
    {
      label: 'Agotados',
      value: stats.agotados,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'border-red-200 bg-red-50',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-muted-foreground text-sm">Resumen general del inventario</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={bg}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className={`text-xs font-medium ${color}`}>{label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4 flex items-end justify-between">
              <span className={`text-3xl font-bold ${color}`}>{value}</span>
              <Icon className={`h-5 w-5 ${color} opacity-60`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-5 space-y-1">
        <h2 className="font-semibold text-sm">Accesos rápidos</h2>
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
          <li>→ <a href="/productos" className="hover:underline text-zinc-800">Lista de productos e insumos</a></li>
          <li>→ <a href="/inventario" className="hover:underline text-zinc-800">Ver stock actual</a></li>
          <li>→ <a href="/entradas" className="hover:underline text-zinc-800">Registrar entrada de mercadería</a></li>
          <li>→ <a href="/salidas" className="hover:underline text-zinc-800">Registrar salida / venta</a></li>
        </ul>
      </div>
    </div>
  )
}
