'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-browser'

export default function LoginForm() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-nutera-orange-soft border border-nutera-orange/25 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-nutera-orange shrink-0 mt-0.5" />
          <p className="text-sm text-nutera-orange font-medium">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-hover text-white mt-2"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Iniciar sesión
      </Button>
    </form>
  )
}
