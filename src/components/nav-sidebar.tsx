'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Boxes, PackagePlus, PackageMinus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',           label: 'Inicio',     icon: LayoutDashboard },
  { href: '/productos',  label: 'Productos',  icon: Package         },
  { href: '/inventario', label: 'Inventario', icon: Boxes           },
  { href: '/entradas',   label: 'Entradas',   icon: PackagePlus     },
  { href: '/salidas',    label: 'Salidas',    icon: PackageMinus    },
]

export default function NavSidebar() {
  const pathname = usePathname()

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
      </nav>
    </>
  )
}
