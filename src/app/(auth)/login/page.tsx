import LoginForm from '@/components/auth/login-form'

export const metadata = { title: 'Ingresar — Nutera' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm space-y-6 bg-white border rounded-xl p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutera</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingresá con tu cuenta para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
