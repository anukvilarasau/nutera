'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { InventarioItem } from '@/lib/types'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function EstadoBadge({ estado }: { estado: InventarioItem['estado'] }) {
  if (estado === 'agotado') return <Badge variant="destructive">Agotado</Badge>
  if (estado === 'bajo')    return <Badge className="bg-amber-500 hover:bg-amber-600">Stock bajo</Badge>
  return <Badge className="bg-emerald-600 hover:bg-emerald-700">Disponible</Badge>
}

export default function InventarioClient({ inventario }: { inventario: InventarioItem[] }) {
  const [search, setSearch] = useState('')

  const filtered = inventario.filter(i => {
    const q = search.toLowerCase()
    return i.nombre.toLowerCase().includes(q) || i.codigo.toString().includes(q)
  })

  const agotados    = inventario.filter(i => i.estado === 'agotado').length
  const bajos       = inventario.filter(i => i.estado === 'bajo').length
  const disponibles = inventario.filter(i => i.estado === 'disponible').length

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          {disponibles} disponibles · {bajos} con stock bajo · {agotados} agotados
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o nombre…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-16">Cód.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-20">Tipo</TableHead>
              <TableHead className="w-16">Unidad</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Salidas</TableHead>
              <TableHead className="text-right font-semibold">Stock</TableHead>
              <TableHead className="text-right">P. Venta</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {search ? 'Sin resultados' : 'Sin productos en inventario'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={item.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                  <TableCell>
                    <span className="font-medium">{item.nombre}</span>
                    {item.marca && <span className="text-muted-foreground text-xs ml-1">· {item.marca}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.unidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-emerald-600">
                    +{item.total_entradas}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-500">
                    -{item.total_salidas}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">
                    {item.stock_total}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatARS(item.precio_venta)}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={item.estado} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
