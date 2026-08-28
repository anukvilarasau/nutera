'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ChevronsUpDown, Check } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

import { createEntrada, deleteEntrada } from '@/lib/actions'
import type { Producto, Entrada } from '@/lib/types'

const schema = z.object({
  producto_id:    z.string().min(1, 'Seleccioná un producto'),
  fecha:          z.string().min(1, 'Requerido'),
  cantidad:       z.coerce.number().positive('Debe ser mayor a 0'),
  costo_unitario: z.coerce.number().min(0, 'Debe ser ≥ 0'),
})
type FormValues = z.infer<typeof schema>

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function EntradasClient({
  productos,
  entradas,
}: {
  productos: Producto[]
  entradas: Entrada[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [comboOpen, setComboOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { producto_id: '', fecha: today(), cantidad: 1, costo_unitario: 0 },
  })

  const productoId    = watch('producto_id')
  const cantidad      = watch('cantidad') ?? 0
  const costoUnitario = watch('costo_unitario') ?? 0
  const total         = +(cantidad * costoUnitario).toFixed(2)
  const selectedProd  = productos.find(p => p.id === productoId)

  function openCreate() {
    reset({ producto_id: '', fecha: today(), cantidad: 1, costo_unitario: 0 })
    setDialogOpen(true)
  }

  function handleSelectProducto(p: Producto) {
    setValue('producto_id', p.id)
    setValue('costo_unitario', p.costo)
    setComboOpen(false)
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await createEntrada(values)
        toast.success('Entrada registrada')
        setDialogOpen(false)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al guardar')
      }
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deleteEntrada(deleteId)
        toast.success('Entrada eliminada')
        setDeleteId(null)
        router.refresh()
      } catch {
        toast.error('Error al eliminar')
      }
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entradas</h1>
          <p className="text-muted-foreground text-sm">Registro de ingresos de mercadería</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nueva entrada
        </Button>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Fecha</TableHead>
              <TableHead className="w-16">Cód.</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Sin entradas registradas todavía
                </TableCell>
              </TableRow>
            ) : (
              entradas.map(e => (
                <TableRow key={e.id} className="hover:bg-zinc-50">
                  <TableCell className="text-sm">{format(new Date(e.fecha + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-mono text-sm">{e.producto?.codigo ?? '—'}</TableCell>
                  <TableCell className="font-medium">{e.producto?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {e.cantidad} {e.producto?.unidad}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatARS(e.costo_unitario)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatARS(e.cantidad * e.costo_unitario)}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog nueva entrada */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva entrada</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Combobox de producto */}
            <div className="space-y-1">
              <Label>Producto</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={selectedProd ? '' : 'text-muted-foreground'}>
                    {selectedProd
                      ? `[${selectedProd.codigo}] ${selectedProd.nombre}`
                      : 'Seleccionar producto…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por código o nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {productos.map(p => (
                          <CommandItem key={p.id} value={`${p.codigo} ${p.nombre}`} onSelect={() => handleSelectProducto(p)}>
                            <Check className={cn('mr-2 h-4 w-4', productoId === p.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-mono text-xs mr-2 text-muted-foreground">[{p.codigo}]</span>
                            {p.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.producto_id && <p className="text-destructive text-xs">{errors.producto_id.message}</p>}
            </div>

            {/* Fecha */}
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" {...register('fecha')} />
              {errors.fecha && <p className="text-destructive text-xs">{errors.fecha.message}</p>}
            </div>

            {/* Cantidad + Costo unitario */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cantidad {selectedProd ? `(${selectedProd.unidad})` : ''}</Label>
                <Input type="number" step="0.001" min="0.001" {...register('cantidad')} />
                {errors.cantidad && <p className="text-destructive text-xs">{errors.cantidad.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Costo unitario ($)</Label>
                <Input type="number" step="0.01" min="0" {...register('costo_unitario')} />
                {errors.costo_unitario && <p className="text-destructive text-xs">{errors.costo_unitario.message}</p>}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-md bg-zinc-50 border px-3 py-2 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costo total</span>
              <span className="font-bold text-lg">{formatARS(total)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar entrada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta entrada?</AlertDialogTitle>
            <AlertDialogDescription>El stock se recalculará automáticamente. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
