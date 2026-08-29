export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getDashboardStats } from '@/lib/actions'
import {
  Package, Boxes, AlertTriangle, XCircle,
  TrendingUp, TrendingDown, ArrowRight,
  PackagePlus, PackageMinus, BarChart2,
} from 'lucide-react'

// ── Stat card ──────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  trend?: string
  trendUp?: boolean
}) {
  const TrendIcon = trendUp ? TrendingUp : TrendingDown
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            <TrendIcon className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-zinc-900">{value}</p>
        <p className="text-sm text-zinc-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Quick access card ───────────────────────────────────────────
function QuickCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  href: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-white rounded-xl border border-zinc-100 px-4 py-3.5 hover:border-brand/40 hover:shadow-sm transition-all group"
    >
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-brand transition-colors shrink-0" />
    </Link>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inicio</h1>
        <p className="text-sm text-zinc-500 mt-1">Resumen general del inventario</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Productos"
          value={stats.totalProductos}
          icon={Package}
          iconBg="bg-brand-soft"
          iconColor="text-brand"
          trend="activo"
          trendUp={true}
        />
        <StatCard
          label="Insumos"
          value={stats.totalInsumos}
          icon={Boxes}
          iconBg="bg-brand-soft"
          iconColor="text-brand"
          trend="activo"
          trendUp={true}
        />
        <StatCard
          label="Stock bajo"
          value={stats.bajos}
          icon={AlertTriangle}
          iconBg="bg-nutera-orange-soft"
          iconColor="text-nutera-orange"
          trend={stats.bajos > 0 ? 'atención' : undefined}
          trendUp={false}
        />
        <StatCard
          label="Agotados"
          value={stats.agotados}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          trend={stats.agotados > 0 ? 'crítico' : undefined}
          trendUp={false}
        />
      </div>

      {/* Quick access */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickCard
            href="/productos"
            icon={Package}
            iconBg="bg-brand-soft"
            iconColor="text-brand"
            title="Catálogo de productos"
            subtitle="Productos e insumos registrados"
          />
          <QuickCard
            href="/inventario"
            icon={Boxes}
            iconBg="bg-brand-soft"
            iconColor="text-brand"
            title="Stock actual"
            subtitle="Ver niveles de inventario"
          />
          <QuickCard
            href="/entradas"
            icon={PackagePlus}
            iconBg="bg-nutera-orange-soft"
            iconColor="text-nutera-orange"
            title="Registrar entrada"
            subtitle="Agregar mercadería al stock"
          />
          <QuickCard
            href="/ventas"
            icon={PackageMinus}
            iconBg="bg-nutera-orange-soft"
            iconColor="text-nutera-orange"
            title="Registrar venta"
            subtitle="Registrar salida de productos"
          />
          <QuickCard
            href="/balance"
            icon={BarChart2}
            iconBg="bg-zinc-100"
            iconColor="text-zinc-500"
            title="Balance"
            subtitle="Rentabilidad e ingresos"
          />
        </div>
      </div>
    </div>
  )
}
