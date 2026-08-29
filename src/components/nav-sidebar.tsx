'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Boxes, PackagePlus,
  PackageMinus, TrendingUp, HelpCircle, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/',           label: 'Inicio',     icon: LayoutDashboard },
  { href: '/productos',  label: 'Catálogo',   icon: Package         },
  { href: '/inventario', label: 'Inventario', icon: Boxes           },
  { href: '/entradas',   label: 'Entradas',   icon: PackagePlus     },
  { href: '/ventas',     label: 'Ventas',     icon: PackageMinus    },
  { href: '/balance',    label: 'Balance',    icon: TrendingUp      },
]

export default function NavSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Sidebar desktop ─────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-100 bg-white">
        {/* Logo + brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-100">
          <Image
            src="/logonutera.png"
            alt="Nutera"
            width={36}
            height={36}
            className="rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-base leading-none text-zinc-900">Nutera</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-none">Gestión de inventario</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-zinc-400')} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Help card */}
        <div className="px-3 pb-3">
          <div className="rounded-xl bg-brand-soft border border-green-100 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <HelpCircle className="h-4 w-4 text-brand shrink-0" />
              <p className="text-xs font-semibold text-brand">¿Necesitás ayuda?</p>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Consultá la guía de uso del sistema.
            </p>
            <button className="mt-2 text-xs font-semibold text-brand hover:underline">
              Ver guía →
            </button>
          </div>
        </div>
      </aside>

      {/* ── Bottom nav mobile / PWA ──────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-zinc-100 bg-white z-50 flex safe-area-inset-bottom">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-brand' : 'text-zinc-400',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Salir
        </button>
      </nav>
    </>
  )
}
