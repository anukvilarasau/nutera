'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Boxes, PackagePlus, PackageMinus, TrendingUp, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-browser'

const NAV = [
  { href: '/',           label: 'Inicio',     icon: LayoutDashboard },
  { href: '/productos',  label: 'Catálogo',   icon: Package         },
  { href: '/inventario', label: 'Inventario', icon: Boxes           },
  { href: '/entradas',   label: 'Entradas',   icon: PackagePlus     },
  { href: '/ventas',     label: 'Ventas',     icon: PackageMinus    },
  { href: '/balance',    label: 'Balance',    icon: TrendingUp      },
]

export default function NavSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Mostrar la parte del email antes del @ como nombre corto
  const displayName = userEmail?.split('@')[0] ?? 'Usuario'

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-white">
        <div className="px-4 py-5 border-b">
          <p className="font-bold text-lg leading-none">Nutera</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gestión de inventario</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Usuario + cerrar sesión */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom nav mobile / PWA */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-white z-50 flex safe-area-inset-bottom">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-zinc-900' : 'text-zinc-400',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:text-zinc-700"
        >
          <LogOut className="h-5 w-5" />
          Salir
        </button>
      </nav>
    </>
  )
}
