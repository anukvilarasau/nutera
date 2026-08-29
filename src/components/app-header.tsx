'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export default function AppHeader({ userEmail }: { userEmail?: string }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = userEmail?.split('@')[0] ?? 'Usuario'
  const initials    = displayName.slice(0, 2).toUpperCase()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-zinc-100 flex items-center px-6 gap-4 shrink-0">
      {/* Search (visual) */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          readOnly
          placeholder="Buscar..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg placeholder:text-zinc-400 focus:outline-none cursor-default"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications (visual) */}
        <button className="relative p-2 rounded-lg text-zinc-500 hover:bg-zinc-50 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-nutera-orange" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-zinc-700 hidden sm:block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <p className="text-xs font-semibold text-zinc-800 truncate">{displayName}</p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{userEmail}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-zinc-400" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
