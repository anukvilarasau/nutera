'use client'

import { useState, useMemo } from 'react'
import { format, subDays, startOfWeek, startOfMonth, startOfYear, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import type { VentaRentabilidad, ItemCosto } from '@/lib/types'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function pct(n: number | null) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)} %`
}

type Preset = 'hoy' | 'semana' | 'mes' | 'año' | 'todo' | 'custom'

export default function BalanceClient({
  ventas,
  itemsCosto,
}: {
  ventas: VentaRentabilidad[]
  itemsCosto: ItemCosto[]
}) {
  const todayStr = new Date().toISOString().split('T')[0]

  const [preset, setPreset]   = useState<Preset>('mes')
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')

  // Rango efectivo de fechas
  const { rangeDesde, rangeHasta } = useMemo(() => {
    const hoy = new Date()
    if (preset === 'custom') return { rangeDesde: desde, rangeHasta: hasta }
    if (preset === 'hoy')    return { rangeDesde: todayStr, rangeHasta: todayStr }
    if (preset === 'semana') return {
      rangeDesde: startOfWeek(hoy, { weekStartsOn: 1 }).toISOString().split('T')[0],
      rangeHasta: todayStr,
    }
    if (preset === 'mes')    return {
      rangeDesde: startOfMonth(hoy).toISOString().split('T')[0],
      rangeHasta: todayStr,
    }
    if (preset === 'año')    return {
      rangeDesde: startOfYear(hoy).toISOString().split('T')[0],
      rangeHasta: todayStr,
    }
    return { rangeDesde: '', rangeHasta: '' }
  }, [preset, desde, hasta, todayStr])

  // Ventas filtradas por rango
  const ventasFiltradas = useMemo(() => ventas.filter(v => {
    if (!rangeDesde && !rangeHasta) return true
    if (rangeDesde && v.fecha < rangeDesde) return false
    if (rangeHasta && v.fecha > rangeHasta) return false
    return true
  }), [ventas, rangeDesde, rangeHasta])

  // Totales del período
  const totales = useMemo(() => {
    const ingresos  = ventasFiltradas.reduce((s, v) => s + v.ingreso,  0)
    const costos    = ventasFiltradas.reduce((s, v) => s + v.costo,    0)
    const ganancia  = ventasFiltradas.reduce((s, v) => s + v.ganancia, 0)
    const margen    = ingresos === 0 ? null : (ganancia / ingresos) * 100
    return { ingresos, costos, ganancia, margen }
  }, [ventasFiltradas])

  // IDs de ventas del período → filtrar itemsCosto
  const ventaIds = useMemo(() => new Set(ventasFiltradas.map(v => v.id)), [ventasFiltradas])

  // itemsCosto filtrado al período (necesitamos venta_items con venta_id — aproximamos
  // usando proporción: no tenemos venta_id en ItemCosto agregado, así que mostramos
  // top global y anotamos si no hay filtro; para filtrar exacto habría que pasar items
  // individuales desde el server). Por ahora mostramos global y lo indicamos.
  const topCostos = itemsCosto.slice(0, 8)
  const maxCosto  = topCostos[0]?.costo_total ?? 1

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'hoy',    label: 'Hoy'    },
    { key: 'semana', label: 'Semana' },
    { key: 'mes',    label: 'Mes'    },
    { key: 'año',    label: 'Año'    },
    { key: 'todo',   label: 'Todo'   },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
        <p className="text-muted-foreground text-sm">Rentabilidad de ventas: ingresos, costos y ganancia neta</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={preset === key ? 'default' : 'outline'}
            onClick={() => setPreset(key)}
          >
            {label}
          </Button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="h-8 w-36 text-sm"
            />
            <span className="text-muted-foreground text-sm">→</span>
            <Input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>
        )}
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          label="Ingresos"
          value={formatARS(totales.ingresos)}
          icon={<DollarSign className="h-4 w-4" />}
          color="text-blue-600"
        />
        <Card
          label="Costos"
          value={formatARS(totales.costos)}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-red-500"
        />
        <Card
          label="Ganancia neta"
          value={formatARS(totales.ganancia)}
          icon={<TrendingUp className="h-4 w-4" />}
          color={totales.ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}
          highlight
        />
        <Card
          label="Margen promedio"
          value={pct(totales.margen)}
          icon={<Percent className="h-4 w-4" />}
          color={totales.margen == null || totales.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {/* Tabla de ventas */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ventas del período ({ventasFiltradas.length})
        </h2>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Ingreso</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead className="text-right w-24">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Sin ventas en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                ventasFiltradas.map(v => (
                  <TableRow key={v.id} className="hover:bg-zinc-50">
                    <TableCell className="text-sm">
                      {format(parseISO(v.fecha), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatARS(v.ingreso)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatARS(v.costo)}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-mono text-sm font-medium',
                      v.ganancia >= 0 ? 'text-emerald-700' : 'text-red-600'
                    )}>
                      {formatARS(v.ganancia)}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-mono text-sm',
                      v.margen_pct == null ? 'text-muted-foreground' :
                      v.margen_pct >= 0 ? 'text-emerald-700' : 'text-red-600'
                    )}>
                      {pct(v.margen_pct)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Top costos */}
      {topCostos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Top costos — histórico acumulado
          </h2>
          <div className="rounded-lg border bg-white p-4 space-y-3">
            {topCostos.map(item => {
              const barPct = (item.costo_total / maxCosto) * 100
              const sharePct = itemsCosto.reduce((s, i) => s + i.costo_total, 0)
              const share = sharePct === 0 ? 0 : (item.costo_total / sharePct) * 100
              return (
                <div key={item.producto_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.tipo === 'Insumo' ? 'insumo' : 'producto'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-sm">
                      <span className="text-muted-foreground">{share.toFixed(1)} %</span>
                      <span className="font-medium w-28 text-right">{formatARS(item.costo_total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-400"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({
  label, value, icon, color, highlight,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-lg border bg-white p-4 space-y-1',
      highlight && 'ring-1 ring-zinc-200'
    )}>
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
    </div>
  )
}
