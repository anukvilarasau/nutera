'use client'

import { useMemo } from 'react'
import { parseISO, format, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart2 } from 'lucide-react'

import type { VentaRentabilidad } from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────

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

function agrupar(ventas: VentaRentabilidad[], desde: string, hasta: string): {
  datos: Punto[]
  porMes: boolean
} {
  // Decidir granularidad por cantidad de días del rango
  let porMes = false
  if (!desde || !hasta) {
    porMes = true               // "Todo" → agrupamos por mes
  } else {
    const diff = differenceInCalendarDays(parseISO(hasta), parseISO(desde))
    porMes = diff > 62          // más de 2 meses → por mes; de lo contrario por día
  }

  const map = new Map<string, Punto>()

  for (const v of ventas) {
    const date = parseISO(v.fecha)
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

  const datos = [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  return { datos, porMes }
}

// ── Tooltip personalizado ────────────────────────────────────────

function TooltipCustom({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3.5 text-sm min-w-[180px]">
      <p className="font-semibold text-zinc-700 mb-2.5 capitalize">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-zinc-500">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-zinc-800">
            {formatARS(p.value)}
          </span>
        </div>
      ))}
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
  const { datos } = useMemo(
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
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Bar dataKey="ingreso"  name="Ingreso"  fill="#1e5929" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="costo"    name="Costo"    fill="#e8720f" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="ganancia" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
