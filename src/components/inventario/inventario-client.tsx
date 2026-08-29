'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { InventarioItem } from '@/lib/types'

const ALL = '_all'

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <Badge className={cn(
      'text-xs font-medium border shrink-0',
      tipo === 'Producto'
        ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100'
        : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
    )}>
      {tipo}
    </Badge>
  )
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function EstadoBadge({ estado }: { estado: InventarioItem['estado'] }) {
  if (estado === 'agotado') return <Badge variant="destructive">Agotado</Badge>
  if (estado === 'bajo')    return <Badge className="bg-amber-500 hover:bg-amber-600">Stock bajo</Badge>
  return <Badge className="bg-emerald-600 hover:bg-emerald-700">Disponible</Badge>
}

type TipoFiltro = 'todos' | 'Producto' | 'Insumo'

export default function InventarioClient({ inventario }: { inventario: InventarioItem[] }) {
  const [search,       setSearch]       = useState('')
  const [tipoFiltro,   setTipoFiltro]   = useState<TipoFiltro>('todos')
  const [provFiltro,   setProvFiltro]   = useState(ALL)
  const [unidFiltro,   setUnidFiltro]   = useState(ALL)
  const [estadoFiltro, setEstadoFiltro] = useState(ALL)

  const proveedores = useMemo(() =>
    [...new Set(inventario.map(i => i.proveedor).filter(Boolean))].sort(),
    [inventario],
  )

  const unidades = useMemo(() =>
    [...new Set(inventario.map(i => i.unidad).filter(Boolean))].sort(),
    [inventario],
  )

  const hayFiltros = search !== '' || tipoFiltro !== 'todos' || provFiltro !== ALL || unidFiltro !== ALL || estadoFiltro !== ALL

  function limpiarFiltros() {
    setSearch('')
    setTipoFiltro('todos')
    setProvFiltro(ALL)
    setUnidFiltro(ALL)
    setEstadoFiltro(ALL)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return inventario.filter(i => {
      if (q && !i.nombre.toLowerCase().includes(q) && !i.codigo.toString().includes(q)) return false
      if (tipoFiltro !== 'todos' && i.tipo !== tipoFiltro) return false
      if (provFiltro !== ALL && i.proveedor !== provFiltro) return false
      if (unidFiltro !== ALL && i.unidad !== unidFiltro) return false
      if (estadoFiltro !== ALL && i.estado !== estadoFiltro) return false
      return true
    })
  }, [inventario, search, tipoFiltro, provFiltro, unidFiltro, estadoFiltro])

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

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre…"
            className="pl-9 w-56"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tipo */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(['todos', 'Producto', 'Insumo'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                tipoFiltro === t
                  ? 'bg-brand text-white font-medium'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50',
              )}
            >
              {t === 'todos' ? 'Todos' : t === 'Producto' ? 'Productos' : 'Insumos'}
            </button>
          ))}
        </div>

        {/* Proveedor */}
        {proveedores.length > 0 && (
          <Select value={provFiltro} onValueChange={v => setProvFiltro(v ?? ALL)}>
            <SelectTrigger className="w-40 text-sm">
              <span>{provFiltro === ALL ? 'Todos los proveedores' : provFiltro}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los proveedores</SelectItem>
              {proveedores.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Unidad */}
        {unidades.length > 0 && (
          <Select value={unidFiltro} onValueChange={v => setUnidFiltro(v ?? ALL)}>
            <SelectTrigger className="w-32 text-sm">
              <span>{unidFiltro === ALL ? 'Todas las unidades' : unidFiltro}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Estado */}
        <Select value={estadoFiltro} onValueChange={v => setEstadoFiltro(v ?? ALL)}>
          <SelectTrigger className="w-36 text-sm">
            <span>{{
              [ALL]:          'Todos los estados',
              disponible:     'Disponible',
              bajo:           'Stock bajo',
              agotado:        'Agotado',
            }[estadoFiltro] ?? estadoFiltro}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="bajo">Stock bajo</SelectItem>
            <SelectItem value="agotado">Agotado</SelectItem>
          </SelectContent>
        </Select>

        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={limpiarFiltros}
            className="text-zinc-500 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-16">Cód.</TableHead>
              <TableHead>Nombre</TableHead>
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
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'Sin productos en inventario'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={item.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TipoBadge tipo={item.tipo} />
                      <span className="font-medium">{item.nombre}</span>
                      {item.proveedor && <span className="text-muted-foreground text-xs">· {item.proveedor}</span>}
                    </div>
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
