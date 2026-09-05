import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function ok(message: string) {
  return { content: [{ type: 'text' as const, text: message }] }
}

// ── MCP server definition ─────────────────────────────────────────────────────

const mcpHandler = createMcpHandler(
  (server) => {

    // ── READ: productos ────────────────────────────────────────────────────

    server.registerTool(
      'list_productos',
      {
        title:       'Listar productos e insumos',
        description: 'Devuelve el catálogo completo de productos e insumos con su costo y margen.',
        inputSchema: z.object({
          tipo: z.enum(['Producto', 'Insumo']).optional()
            .describe('Filtrar por tipo. Omitir para traer ambos.'),
        }),
      },
      async ({ tipo }) => {
        const sb = createAdminClient()
        let q = sb.from('productos').select('*').order('codigo')
        if (tipo) q = q.eq('tipo', tipo)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return text(data)
      },
    )

    server.registerTool(
      'get_stock_actual',
      {
        title:       'Ver stock actual',
        description: 'Devuelve el inventario con stock disponible, entradas y salidas por producto.',
        inputSchema: z.object({
          tipo: z.enum(['Producto', 'Insumo']).optional()
            .describe('Filtrar por tipo.'),
          estado: z.enum(['disponible', 'bajo', 'agotado']).optional()
            .describe('Filtrar por estado de stock.'),
        }),
      },
      async ({ tipo, estado }) => {
        const sb = createAdminClient()
        let q = sb.from('inventario_view').select('*').order('codigo')
        if (tipo)   q = q.eq('tipo', tipo)
        if (estado) q = q.eq('estado', estado)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return text(data)
      },
    )

    server.registerTool(
      'list_compras',
      {
        title:       'Listar órdenes de compra',
        description: 'Devuelve las órdenes de compra recientes con sus ítems.',
        inputSchema: z.object({
          limit: z.number().int().min(1).max(200).optional().default(50)
            .describe('Cantidad máxima de órdenes a devolver.'),
        }),
      },
      async ({ limit }) => {
        const sb = createAdminClient()
        const { data, error } = await sb
          .from('compras')
          .select('*, items:compra_items(*, producto:productos(codigo, nombre, unidad))')
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit ?? 50)
        if (error) throw new Error(error.message)
        return text(data)
      },
    )

    server.registerTool(
      'list_ventas',
      {
        title:       'Listar ventas',
        description: 'Devuelve las ventas recientes con sus ítems y totales.',
        inputSchema: z.object({
          limit: z.number().int().min(1).max(200).optional().default(50)
            .describe('Cantidad máxima de ventas a devolver.'),
        }),
      },
      async ({ limit }) => {
        const sb = createAdminClient()
        const { data, error } = await sb
          .from('ventas')
          .select('*, items:venta_items(*, producto:productos(codigo, nombre, unidad, tipo))')
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit ?? 50)
        if (error) throw new Error(error.message)
        return text(data)
      },
    )

    // ── WRITE: productos ───────────────────────────────────────────────────

    server.registerTool(
      'create_producto',
      {
        title:       'Crear producto o insumo',
        description: 'Crea un nuevo producto o insumo en el catálogo. El código se asigna automáticamente.',
        inputSchema: z.object({
          tipo:      z.enum(['Producto', 'Insumo']),
          nombre:    z.string().min(1),
          proveedor: z.string().optional().default(''),
          unidad:    z.string().min(1).describe('Ej: kg, ud, g, l'),
          costo:     z.number().min(0),
          margen:    z.number().min(0).max(1).optional().default(0.15)
            .describe('Margen como decimal (0.15 = 15%). Solo aplica a Producto.'),
        }),
      },
      async ({ tipo, nombre, proveedor, unidad, costo, margen }) => {
        const sb = createAdminClient()

        const { data: nextCodigo, error: rpcError } = await sb.rpc('get_next_codigo', { p_tipo: tipo })
        if (rpcError) throw new Error(rpcError.message)

        const { data, error } = await sb
          .from('productos')
          .insert({
            tipo,
            nombre,
            proveedor: proveedor ?? '',
            unidad,
            costo,
            margen: tipo === 'Insumo' ? 0 : (margen ?? 0.15),
            codigo: nextCodigo as number,
          })
          .select()
          .single()

        if (error) throw new Error(error.message)
        return ok(`Producto creado con código ${(data as { codigo: number }).codigo}.`)
      },
    )

    server.registerTool(
      'update_producto',
      {
        title:       'Actualizar producto o insumo',
        description: 'Actualiza uno o más campos de un producto/insumo existente.',
        inputSchema: z.object({
          id:        z.string().uuid(),
          nombre:    z.string().min(1).optional(),
          proveedor: z.string().optional(),
          unidad:    z.string().optional(),
          costo:     z.number().min(0).optional(),
          margen:    z.number().min(0).max(1).optional(),
        }),
      },
      async ({ id, ...fields }) => {
        const sb = createAdminClient()
        const patch = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined)
        )
        if (Object.keys(patch).length === 0) throw new Error('No hay campos para actualizar.')
        const { error } = await sb.from('productos').update(patch).eq('id', id)
        if (error) throw new Error(error.message)
        return ok(`Producto ${id} actualizado correctamente.`)
      },
    )

    // ── WRITE: compras ─────────────────────────────────────────────────────

    server.registerTool(
      'create_compra',
      {
        title:       'Registrar orden de compra',
        description: 'Registra una orden de compra con uno o más ítems. Aumenta el stock de cada producto.',
        inputSchema: z.object({
          fecha:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Formato YYYY-MM-DD'),
          proveedor: z.string().optional().default(''),
          items: z.array(z.object({
            producto_id:    z.string().uuid(),
            cantidad:       z.number().positive(),
            costo_unitario: z.number().min(0),
          })).min(1),
        }),
      },
      async ({ fecha, proveedor, items }) => {
        const sb = createAdminClient()

        const total = items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0)

        const { data: compra, error: ce } = await sb
          .from('compras')
          .insert({ fecha, proveedor: proveedor ?? '', total: +total.toFixed(2) })
          .select()
          .single()
        if (ce) throw new Error(ce.message)

        const { error: ie } = await sb
          .from('compra_items')
          .insert(items.map(i => ({ compra_id: (compra as { id: string }).id, ...i })))
        if (ie) {
          await sb.from('compras').delete().eq('id', (compra as { id: string }).id)
          throw new Error(ie.message)
        }

        return ok(`Compra registrada (${items.length} ítem/s, total $${total.toFixed(2)}).`)
      },
    )

    // ── WRITE: ventas ──────────────────────────────────────────────────────

    server.registerTool(
      'create_venta',
      {
        title:       'Registrar venta',
        description: 'Registra una venta. Descuenta stock de todos los ítems. precio_unitario=null para insumos consumidos que no se cobran.',
        inputSchema: z.object({
          fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Formato YYYY-MM-DD'),
          items: z.array(z.object({
            producto_id:     z.string().uuid(),
            cantidad:        z.number().positive(),
            precio_unitario: z.number().min(0).nullable()
              .describe('null para insumos consumidos sin cargo.'),
          })).min(1),
        }),
      },
      async ({ fecha, items }) => {
        const sb = createAdminClient()

        const total = items.reduce(
          (s, i) => s + (i.precio_unitario != null ? i.precio_unitario * i.cantidad : 0), 0
        )

        const { data: venta, error: ve } = await sb
          .from('ventas')
          .insert({ fecha, total: +total.toFixed(2) })
          .select()
          .single()
        if (ve) throw new Error(ve.message)

        const { error: ie } = await sb
          .from('venta_items')
          .insert(items.map(i => ({ venta_id: (venta as { id: string }).id, ...i })))
        if (ie) {
          await sb.from('ventas').delete().eq('id', (venta as { id: string }).id)
          throw new Error(ie.message)
        }

        return ok(`Venta registrada (${items.length} ítem/s, total $${total.toFixed(2)}).`)
      },
    )
  },
  {
    serverInfo: { name: 'nutera-inventory', version: '1.0.0' },
  },
)

// ── Auth wrapper + route exports ───────────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  const auth  = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  // Static MCP_SECRET — keeps Claude Code connection working
  const mcpSecret = process.env.MCP_SECRET
  if (mcpSecret && token === mcpSecret) {
    return mcpHandler(req)
  }

  // OAuth access token — issued by /api/oauth/token
  if (token) {
    const sb = createAdminClient()
    const { data } = await sb
      .from('oauth_tokens')
      .select('expires_at')
      .eq('access_token', token)
      .single()

    if (data && new Date(data.expires_at) > new Date()) {
      return mcpHandler(req)
    }
  }

  const base = new URL(req.url).origin
  return Response.json(
    { error: 'Unauthorized' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
      },
    },
  )
}

export { handler as GET, handler as POST }
