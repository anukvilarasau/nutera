'use client'

import { useMemo } from 'react'
import { parseISO, format, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart2 } from 'lucide-react'

import type { VentaRentabilidad } from '@/lib/types'

// ── Paleta ───────────────────────────────────────────────────────

const COLOR = {
  ingreso:      '#1e5929',   // brand green fijo
  costo:        '#e8720f',   // brand orange fijo
  gananciaPos:  '#10b981',   // emerald cuando ganancia ≥ 0
  gananciaNeg:  '#e8720f',   // brand orange cuando ganancia < 0
} as const

function colorGanancia(v: number) {
  return v >= 0 ? COLOR.gananciaPos : COLOR.gananciaNeg
}

// ── Helpers de formato ───────────────────────────────────────────

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatARSShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// ── Agrupación ───────────────────────────────────────────────────

type Punto = { key: string; label: string; ingreso: number; costo: number; ganancia: number }

function agrupar(ventas: VentaRentabilidad[], desde: string, hasta: string): Punto[] {
  let porMes = false
  if (!desde || !hasta) {
    porMes = true
  } else {
    const diff = differenceInCalendarDays(parseISO(hasta), parseISO(desde))
    porMes = diff > 62
  }

  const map = new Map<string, Punto>()

  for (const v of ventas) {
    const date  = parseISO(v.fecha)
    const key   = porMes ? v.fecha.slice(0, 7) : v.fecha
    const label = porMes
      ? format(date, 'MMM yyyy', { locale: es })
      : format(date, 'd MMM',    { locale: es })

    const existing = map.get(key)
    if (existing) {
      existing.ingreso  += v.ingreso
      existing.costo    += v.costo
      existing.ganancia += v.ganancia
    } else {
      map.set(key, { key, label, ingreso: v.ingreso, costo: v.costo, ganancia: v.ganancia })
    }
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

// ── Tooltip ──────────────────────────────────────────────────────

// El payload de recharts trae solo Ganancia, pero pasamos el punto completo
// para poder mostrar Ingreso y Costo también en el tooltip.
type TooltipEntry = { name: string; value: number; fill: string; payload: Punto }

function TooltipCustom({ active, payload, label }: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload          // punto completo con ingreso/costo/ganancia
  const ganColor = colorGanancia(d.ganancia)

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3.5 text-sm min-w-[190px]">
      <p className="font-semibold text-zinc-700 mb-2.5 capitalize">{label}</p>

      <div className="flex items-center justify-between gap-6 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0 bg-[#1e5929]" />
          <span className="text-zinc-500">Ingreso</span>
        </div>
        <span className="font-mono font-semibold text-[#1e5929]">{formatARS(d.ingreso)}</span>
      </div>

      <div className="flex items-center justify-between gap-6 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0 bg-[#e8720f]" />
          <span className="text-zinc-500">Costo</span>
        </div>
        <span className="font-mono font-semibold text-[#e8720f]">{formatARS(d.costo)}</span>
      </div>

      <div className="flex items-center justify-between gap-6 border-t border-zinc-100 mt-2 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ganColor }} />
          <span className="text-zinc-500">Ganancia</span>
        </div>
        <span className="font-mono font-semibold" style={{ color: ganColor }}>{formatARS(d.ganancia)}</span>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────

export default function BalanceChart({
  ventas,
  desde,
  hasta,
}: {
  ventas: VentaRentabilidad[]
  desde: string
  hasta: string
}) {
  const datos = useMemo(
    () => agrupar(ventas, desde, hasta),
    [ventas, desde, hasta],
  )

  if (datos.length === 0) {
    return (
      <div className="rounded-xl border bg-white flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500">No hay ventas en este período</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-5">
        Evolución del período
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={datos} barGap={3} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatARSShort}
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            width={62}
          />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: '#f4f4f5', radius: 4 }} />

          {/* Una sola barra: Ganancia — verde si ≥ 0, naranja si < 0 */}
          <Bar dataKey="ganancia" name="Ganancia neta" radius={[4, 4, 0, 0]} maxBarSize={52}>
            {datos.map((d, i) => (
              <Cell key={i} fill={colorGanancia(d.ganancia)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
