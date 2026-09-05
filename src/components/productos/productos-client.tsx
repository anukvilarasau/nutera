'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { createProducto, updateProducto, deleteProducto } from '@/lib/client-api'
import type { Producto } from '@/lib/types'
import type { SubmitHandler } from 'react-hook-form'

const schema = z.object({
  codigo:    z.number().min(1, 'Requerido'),
  tipo:      z.enum(['Producto', 'Insumo']),
  nombre:    z.string().min(1, 'Requerido'),
  proveedor: z.string(),
  unidad:    z.string().min(1, 'Requerido'),
  costo:     z.number().min(0, 'Debe ser ≥ 0'),
  margen:    z.number().min(0).max(100, 'Entre 0 y 100'),
})
type FormValues = z.infer<typeof schema>

const UNIDADES = ['ud', 'kg', 'g', 'lt', 'ml', 'caja', 'bolsa', 'rollo']
const ALL = '_all'

function pct(decimal: number) { return +(decimal * 100).toFixed(2) }
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function TipoBadge({ tipo }: { tipo: string }) {
  return tipo === 'Producto'
    ? <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-medium shrink-0">Producto</Badge>
    : <Badge className="bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-100 text-xs font-medium shrink-0">Insumo</Badge>
}

type TipoFiltro = 'todos' | 'Producto' | 'Insumo'

export default function ProductosClient({ initialProductos }: { initialProductos: Producto[] }) {
  const [isPending, startTransition] = useTransition()
  const [productos, setProductos]   = useState<Producto[]>(initialProductos)
  const [search, setSearch]         = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos')
  const [provFiltro, setProvFiltro] = useState('')
  const [unidFiltro, setUnidFiltro] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [editProducto, setEditProducto] = useState<Producto | null>(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { codigo: 100, tipo: 'Producto', nombre: '', proveedor: '', unidad: 'ud', costo: 0, margen: 15 },
  })

  const tipo   = watch('tipo')
  const costo  = watch('costo') ?? 0
  const margen = watch('margen') ?? 0
  const precioVenta = +(costo * (1 + margen / 100)).toFixed(2)

  function nextCodigo(t: 'Producto' | 'Insumo') {
    const same = productos.filter(p => p.tipo === t)
    if (same.length === 0) return t === 'Insumo' ? 500 : 100
    return Math.max(...same.map(p => p.codigo)) + 1
  }

  useEffect(() => {
    if (!editProducto && dialogOpen) setValue('codigo', nextCodigo(tipo))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, editProducto, dialogOpen])

  // Opciones dinámicas para filtros
  const proveedores = useMemo(() => {
    const set = new Set(productos.map(p => p.proveedor).filter(Boolean))
    return [...set].sort() as string[]
  }, [productos])

  const unidades = useMemo(() => {
    const set = new Set(productos.map(p => p.unidad).filter(Boolean))
    return [...set].sort() as string[]
  }, [productos])

  const hayFiltros = tipoFiltro !== 'todos' || !!provFiltro || !!unidFiltro || !!search

  function limpiarFiltros() {
    setTipoFiltro('todos')
    setProvFiltro('')
    setUnidFiltro('')
    setSearch('')
  }

  const filtered = useMemo(() => productos.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.nombre.toLowerCase().includes(q) || p.codigo.toString().includes(q)) &&
      (tipoFiltro === 'todos' || p.tipo === tipoFiltro) &&
      (!provFiltro || p.proveedor === provFiltro) &&
      (!unidFiltro || p.unidad === unidFiltro)
    )
  }), [productos, search, tipoFiltro, provFiltro, unidFiltro])

  const counts = {
    todos:    productos.length,
    Producto: productos.filter(p => p.tipo === 'Producto').length,
    Insumo:   productos.filter(p => p.tipo === 'Insumo').length,
  }

  function openCreate() {
    const t = 'Producto'
    reset({ codigo: nextCodigo(t), tipo: t, nombre: '', proveedor: '', unidad: 'ud', costo: 0, margen: 15 })
    setEditProducto(null)
    setDialogOpen(true)
  }

  function openEdit(p: Producto) {
    reset({ codigo: p.codigo, tipo: p.tipo, nombre: p.nombre, proveedor: p.proveedor, unidad: p.unidad, costo: p.costo, margen: pct(p.margen) })
    setEditProducto(p)
    setDialogOpen(true)
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const margenDecimal = values.tipo === 'Insumo' ? 0 : values.margen / 100
    const payload = { ...values, margen: margenDecimal }
    startTransition(async () => {
      try {
        if (editProducto) {
          await updateProducto(editProducto.id, payload)
          setProductos(prev => prev.map(p => p.id === editProducto.id ? { ...p, ...payload } : p))
          toast.success('Guardado')
        } else {
          const created = await createProducto(payload)
          setProductos(prev => [...prev, created].sort((a, b) => a.codigo - b.codigo))
          toast.success(values.tipo === 'Insumo' ? 'Insumo creado' : 'Producto creado')
        }
        setDialogOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al guardar')
      }
    })
  }

  function handleDelete() {
    const id = deleteId
    if (!id) return
    startTransition(async () => {
      try {
        await deleteProducto(id)
        setProductos(prev => prev.filter(p => p.id !== id))
        toast.success('Eliminado')
        setDeleteId(null)
      } catch {
        toast.error('Error al eliminar')
      }
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-muted-foreground text-sm">{counts.Producto} productos · {counts.Insumo} insumos</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre…"
            className="pl-9 h-8 w-52 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tipo */}
        {(['todos', 'Producto', 'Insumo'] as const).map(f => (
          <Button key={f} size="sm" variant={tipoFiltro === f ? 'default' : 'outline'} onClick={() => setTipoFiltro(f)}>
            {f === 'todos' ? `Todos (${counts.todos})` : f === 'Producto' ? `Productos (${counts.Producto})` : `Insumos (${counts.Insumo})`}
          </Button>
        ))}

        {/* Proveedor */}
        {proveedores.length > 0 && (
          <Select value={provFiltro || ALL} onValueChange={v => setProvFiltro(v == null || v === ALL ? '' : v)}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <span>{!provFiltro ? 'Todos los proveedores' : provFiltro}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los proveedores</SelectItem>
              {proveedores.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Unidad */}
        {unidades.length > 1 && (
          <Select value={unidFiltro || ALL} onValueChange={v => setUnidFiltro(v == null || v === ALL ? '' : v)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <span>{!unidFiltro ? 'Todas las unidades' : unidFiltro}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las unidades</SelectItem>
              {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Limpiar */}
        {hayFiltros && (
          <Button size="sm" variant="ghost" onClick={limpiarFiltros} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-16">Cód.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="w-16">Unidad</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right w-20">Margen</TableHead>
              <TableHead className="text-right">P. Venta</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay items en el catálogo'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TipoBadge tipo={p.tipo} />
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.proveedor || '—'}</TableCell>
                  <TableCell>{p.unidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatARS(p.costo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {p.tipo === 'Insumo' ? <span className="text-muted-foreground">—</span> : `${pct(p.margen)} %`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {p.tipo === 'Insumo' ? <span className="text-muted-foreground">—</span> : formatARS(p.costo * (1 + p.margen))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editProducto ? 'Editar' : 'Nuevo'} {tipo === 'Insumo' ? 'insumo' : 'producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={v => v && setValue('tipo', v as 'Producto' | 'Insumo')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Producto">Producto</SelectItem>
                    <SelectItem value="Insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Código</Label>
                <Input type="number" {...register('codigo', { valueAsNumber: true })} />
                {errors.codigo && <p className="text-destructive text-xs">{errors.codigo.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input placeholder={tipo === 'Insumo' ? 'Ej: Bolsa kraft 1 kg' : 'Ej: Almendras (500 g)'} {...register('nombre')} />
              {errors.nombre && <p className="text-destructive text-xs">{errors.nombre.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Proveedor <span className="text-muted-foreground">(opcional)</span></Label>
                <Input placeholder="Ej: Cuyo Nut S.A." {...register('proveedor')} />
              </div>
              <div className="space-y-1">
                <Label>Unidad</Label>
                <Select value={watch('unidad')} onValueChange={v => v && setValue('unidad', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={tipo === 'Producto' ? 'grid grid-cols-2 gap-3' : ''}>
              <div className="space-y-1">
                <Label>Costo ($)</Label>
                <Input type="number" step="0.01" min="0" {...register('costo', { valueAsNumber: true })} />
                {errors.costo && <p className="text-destructive text-xs">{errors.costo.message}</p>}
              </div>
              {tipo === 'Producto' && (
                <div className="space-y-1">
                  <Label>Margen (%)</Label>
                  <Input type="number" step="0.1" min="0" max="100" {...register('margen', { valueAsNumber: true })} />
                  {errors.margen && <p className="text-destructive text-xs">{errors.margen.message}</p>}
                </div>
              )}
            </div>

            {tipo === 'Producto' && (
              <div className="rounded-md bg-zinc-50 border px-3 py-2 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Precio de venta</span>
                <span className="font-bold text-lg">{formatARS(precioVenta)}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editProducto ? 'Guardar cambios' : tipo === 'Insumo' ? 'Crear insumo' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará también todas las entradas y salidas asociadas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
