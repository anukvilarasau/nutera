import Image from 'next/image'
import LoginForm from '@/components/auth/login-form'

export const metadata = { title: 'Ingresar — Nutera' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-md px-8 py-10 space-y-7">

          {/* Brand */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/logonutera.png"
              alt="Nutera"
              width={80}
              height={80}
              className="rounded-2xl shadow-sm"
              priority
            />
            <div>
              <p className="font-bold text-xl leading-tight text-zinc-900">Nutera</p>
              <p className="text-sm text-zinc-400 mt-0.5">Gestión de inventario</p>
            </div>
          </div>

          <div className="border-t border-zinc-100" />

          <LoginForm />
        </div>

      </div>
    </div>
  )
}
