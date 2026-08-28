'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { createProducto, updateProducto, deleteProducto, getNextCodigo } from '@/lib/actions'
import type { Producto } from '@/lib/types'
import type { SubmitHandler } from 'react-hook-form'

const schema = z.object({
  codigo:  z.coerce.number().min(1, 'Requerido'),
  tipo:    z.enum(['Producto', 'Insumo']),
  nombre:  z.string().min(1, 'Requerido'),
  marca:   z.string(),
  unidad:  z.string().min(1, 'Requerido'),
  costo:   z.coerce.number().min(0, 'Debe ser ≥ 0'),
  margen:  z.coerce.number().min(0).max(100, 'Entre 0 y 100'),
})
type FormValues = z.infer<typeof schema>

const UNIDADES = ['ud', 'kg', 'g', 'lt', 'ml', 'caja', 'bolsa', 'rollo']

function pct(decimal: number) {
  return +(decimal * 100).toFixed(2)
}
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

export default function ProductosClient({ initialProductos }: { initialProductos: Producto[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editProducto, setEditProducto] = useState<Producto | null>(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { codigo: 100, tipo: 'Producto', nombre: '', marca: '', unidad: 'ud', costo: 0, margen: 15 },
  })

  const tipo   = watch('tipo')
  const costo  = watch('costo') ?? 0
  const margen = watch('margen') ?? 0
  const precioVenta = +(costo * (1 + margen / 100)).toFixed(2)

  // Auto-generar código al cambiar tipo (solo en modo creación)
  useEffect(() => {
    if (!editProducto && dialogOpen) {
      getNextCodigo(tipo).then(code => setValue('codigo', code)).catch(() => null)
    }
  }, [tipo, editProducto, dialogOpen])

  const filtered = initialProductos
    .filter(p => {
      const q = search.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || p.codigo.toString().includes(q)
    })

  function openCreate() {
    reset({ codigo: 100, tipo: 'Producto', nombre: '', marca: '', unidad: 'ud', costo: 0, margen: 15 })
    setEditProducto(null)
    setDialogOpen(true)
    getNextCodigo('Producto').then(code => setValue('codigo', code)).catch(() => null)
  }

  function openEdit(p: Producto) {
    reset({
      codigo: p.codigo,
      tipo:   p.tipo,
      nombre: p.nombre,
      marca:  p.marca,
      unidad: p.unidad,
      costo:  p.costo,
      margen: pct(p.margen),
    })
    setEditProducto(p)
    setDialogOpen(true)
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const payload = { ...values, margen: values.margen / 100 }
    startTransition(async () => {
      try {
        if (editProducto) {
          await updateProducto(editProducto.id, payload)
          toast.success('Producto actualizado')
        } else {
          await createProducto(payload)
          toast.success('Producto creado')
        }
        setDialogOpen(false)
        router.refresh()
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
        toast.success('Producto eliminado')
        setDeleteId(null)
        router.refresh()
      } catch {
        toast.error('Error al eliminar')
      }
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground text-sm">{initialProductos.length} items en catálogo</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o nombre…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-16">Cód.</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Marca</TableHead>
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
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {search ? 'Sin resultados para esa búsqueda' : 'No hay productos cargados todavía'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                  <TableCell>
                    <Badge variant={p.tipo === 'Insumo' ? 'secondary' : 'outline'}>{p.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.marca || '—'}</TableCell>
                  <TableCell>{p.unidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatARS(p.costo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{pct(p.margen)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatARS(p.costo * (1 + p.margen))}
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
            <DialogTitle>{editProducto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo + Código */}
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
                <Input type="number" {...register('codigo')} />
                {errors.codigo && <p className="text-destructive text-xs">{errors.codigo.message}</p>}
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Almendras (500g)" {...register('nombre')} />
              {errors.nombre && <p className="text-destructive text-xs">{errors.nombre.message}</p>}
            </div>

            {/* Marca + Unidad */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Marca <span className="text-muted-foreground">(opcional)</span></Label>
                <Input placeholder="Ej: Cuyo Nut S.A." {...register('marca')} />
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

            {/* Costo + Margen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Costo ($)</Label>
                <Input type="number" step="0.01" min="0" {...register('costo')} />
                {errors.costo && <p className="text-destructive text-xs">{errors.costo.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Margen (%)</Label>
                <Input type="number" step="0.1" min="0" max="100" {...register('margen')} />
                {errors.margen && <p className="text-destructive text-xs">{errors.margen.message}</p>}
              </div>
            </div>

            {/* Precio de venta calculado */}
            <div className="rounded-md bg-zinc-50 border px-3 py-2 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Precio de venta</span>
              <span className="font-bold text-lg">{formatARS(precioVenta)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editProducto ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
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
