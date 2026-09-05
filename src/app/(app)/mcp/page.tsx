import { headers } from 'next/headers'
import { Bot, ArrowRight } from 'lucide-react'
import { CopyButton } from '@/components/mcp/copy-button'

export const metadata = { title: 'MCP — Nutera' }

const STEPS = [
  <>Andá a <span className="font-medium text-zinc-700">claude.ai → Settings → Connectors → Add custom connector</span>.</>,
  <>Pegá la URL de arriba en el campo correspondiente.</>,
  <>Autenticáte con tu cuenta de Nutera cuando se abra el navegador.</>,
]

export default async function McpPage() {
  const h    = await headers()
  const host = h.get('host') ?? 'nutera-three.vercel.app'
  const base = host.startsWith('localhost') ? `http://${host}` : `https://${host}`
  const mcpUrl = `${base}/api/mcp`

  return (
    <div className="p-6 max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Conectar Claude a Nutera</h1>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          Permite que Claude AI lea y modifique los datos de tu negocio —
          productos, stock, compras y ventas — directamente desde el chat.
        </p>
      </div>

      {/* URL card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand shrink-0" />
          <p className="text-sm font-semibold text-zinc-700">URL del servidor MCP</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono text-zinc-800">
            {mcpUrl}
          </code>
          <CopyButton text={mcpUrl} />
        </div>
      </div>

      {/* Instructions card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
        <p className="text-sm font-semibold text-zinc-700">Cómo conectarlo</p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-600 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-1.5 pt-1">
          <ArrowRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <p className="text-xs text-zinc-400">
            Una vez conectado podés hacer consultas y registrar movimientos directamente desde el chat.
          </p>
        </div>
      </div>

    </div>
  )
}
