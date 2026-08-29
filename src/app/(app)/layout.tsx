import NavSidebar from '@/components/nav-sidebar'
import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase-server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-svh overflow-hidden">
      <NavSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader userEmail={user?.email} />
        <main className="flex-1 overflow-auto bg-zinc-50 pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
