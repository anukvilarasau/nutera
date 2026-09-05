import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'

const PERMISSIONS = [
  'Leer productos, stock, entradas y ventas',
  'Crear y editar productos, entradas y ventas',
]

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    client_id?:             string
    redirect_uri?:          string
    code_challenge?:        string
    code_challenge_method?: string
    state?:                 string
  }>
}) {
  const params = await searchParams

  // If core params are missing, nothing useful to show
  if (!params.client_id || !params.redirect_uri || !params.code_challenge) {
    redirect('/')
  }

  // Check session; if absent, bounce to login and come back here
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    const next = `/oauth/consent?${new URLSearchParams(params as Record<string, string>)}`
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-md overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <Image
              src="/logonutera.png"
              alt="Nutera"
              width={64}
              height={64}
              className="rounded-xl shadow-sm mx-auto mb-4"
              priority
            />
            <h1 className="text-base font-semibold text-zinc-900 leading-snug">
              Claude quiere conectarse a tu cuenta de Nutera
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Sesión activa como{' '}
              <span className="font-medium text-zinc-700">{user.email}</span>
            </p>
          </div>

          <div className="border-t border-zinc-100" />

          {/* Permissions */}
          <div className="px-8 py-5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Esta aplicación podrá
            </p>
            <ul className="space-y-2.5">
              {PERMISSIONS.map(p => (
                <li key={p} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <span className="text-sm text-zinc-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-zinc-100" />

          {/* Action buttons */}
          <form action="/api/oauth/authorize" method="POST">
            <input type="hidden" name="client_id"             value={params.client_id} />
            <input type="hidden" name="redirect_uri"          value={params.redirect_uri} />
            <input type="hidden" name="code_challenge"        value={params.code_challenge} />
            <input type="hidden" name="code_challenge_method" value={params.code_challenge_method ?? 'S256'} />
            {params.state && <input type="hidden" name="state" value={params.state} />}

            <div className="px-8 py-6 flex gap-3">
              <button
                type="submit"
                name="consent"
                value="deny"
                className="flex-1 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 py-2.5 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                name="consent"
                value="allow"
                className="flex-1 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-medium py-2.5 transition-colors cursor-pointer"
              >
                Permitir acceso
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
