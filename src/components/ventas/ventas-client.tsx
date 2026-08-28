'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Check, ChevronsUpDown } from 'lucide-react'
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

import { createVenta, deleteVenta } from '@/lib/client-api'
import type { Producto, Venta, InventarioItem } from '@/lib/types'

type CartLine = {
  uid: string
  producto_id: string
  tipo: 'Producto' | 'Insumo'
  nombre: string
  codigo: number
  unidad: string
  stock: number
  cantidad: number
  precio_unitario: number  // solo relevante para tipo='Producto'
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function VentasClient({
  ventas,
  productos,
  inventario,
}: {
  ventas: Venta[]
  productos: Producto[]
  inventario: InventarioItem[]
}) {
  const [isPending, startTransition] = useTransition()
  const [listaVentas, setListaVentas] = useState<Venta[]>(ventas)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Estado del carrito
  const [fecha, setFecha] = useState(today())
  const [cartLines, setCartLines] = useState<CartLine[]>([])
  const [comboOpen, setComboOpen] = useState<'producto' | 'insumo' | null>(null)

  const productLines = cartLines.filter(l => l.tipo === 'Producto')
  const insumoLines  = cartLines.filter(l => l.tipo === 'Insumo')
  const total = productLines.reduce((sum, l) => sum + (l.cantidad || 0) * (l.precio_unitario || 0), 0)

  // Filtra los que ya están en el carrito
  const productosDisp = productos.filter(p => p.tipo === 'Producto' && !cartLines.find(l => l.producto_id === p.id))
  const insumosDisp   = productos.filter(p => p.tipo === 'Insumo'   && !cartLines.find(l => l.producto_id === p.id))

  function openCreate() {
    setFecha(today())
    setCartLines([])
    setDialogOpen(true)
  }

  function addLine(p: Producto) {
    const stock = inventario.find(i => i.id === p.id)?.stock_total ?? 0
    const precioVenta = p.tipo === 'Producto' ? +(p.costo * (1 + p.margen)).toFixed(2) : 0
    setCartLines(prev => [...prev, {
      uid: crypto.randomUUID(),
      producto_id: p.id,
      tipo: p.tipo,
      nombre: p.nombre,
      codigo: p.codigo,
      unidad: p.unidad,
      stock,
      cantidad: 1,
      precio_unitario: precioVenta,
    }])
    setComboOpen(null)
  }

  function updateCantidad(uid: string, value: number) {
    setCartLines(prev => prev.map(l => l.uid === uid ? { ...l, cantidad: value } : l))
  }

  function updatePrecio(uid: string, value: number) {
    setCartLines(prev => prev.map(l => l.uid === uid ? { ...l, precio_unitario: value } : l))
  }

  function removeLine(uid: string) {
    setCartLines(prev => prev.filter(l => l.uid !== uid))
  }

  function handleSubmit() {
    if (cartLines.length === 0) {
      toast.error('Agregá al menos un ítem a la venta')
      return
    }
    const overStock = cartLines.find(l => l.stock >= 0 && l.cantidad > l.stock)
    if (overStock) {
      toast.error(`Stock insuficiente para "${overStock.nombre}" (disponible: ${overStock.stock} ${overStock.unidad})`)
      return
    }
    startTransition(async () => {
      try {
        const payload = {
          fecha,
          items: cartLines.map(l => ({
            producto_id: l.producto_id,
            cantidad: l.cantidad,
            precio_unitario: l.tipo === 'Producto' ? l.precio_unitario : null,
          })),
        }
        const nueva = await createVenta(payload)
        setListaVentas(prev => [nueva, ...prev])
        toast.success('Venta registrada')
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
        await deleteVenta(id)
        setListaVentas(prev => prev.filter(v => v.id !== id))
        toast.success('Venta eliminada')
        setDeleteId(null)
      } catch {
        toast.error('Error al eliminar')
      }
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground text-sm">Registro de ventas y consumo de insumos</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nueva venta
        </Button>
      </div>

      {/* Tabla de ventas */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead>Productos vendidos</TableHead>
              <TableHead>Insumos consumidos</TableHead>
              <TableHead className="text-right w-32">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listaVentas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Sin ventas registradas todavía
                </TableCell>
              </TableRow>
            ) : (
              listaVentas.map(v => {
                const prodItems = v.items.filter(i => i.precio_unitario !== null)
                const insItems  = v.items.filter(i => i.precio_unitario === null)
                return (
                  <TableRow key={v.id} className="hover:bg-zinc-50 align-top">
                    <TableCell className="text-sm pt-3 whitespace-nowrap">
                      {format(new Date(v.fecha + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-sm py-2">
                      {prodItems.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {prodItems.map(i => (
                            <li key={i.id}>
                              <span className="font-medium">{i.producto?.nombre ?? '?'}</span>
                              <span className="text-muted-foreground ml-1">
                                × {i.cantidad} {i.producto?.unidad}
                                {i.precio_unitario != null && ` · ${formatARS(i.precio_unitario)}/u`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-sm py-2 text-muted-foreground">
                      {insItems.length === 0 ? (
                        <span>—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {insItems.map(i => (
                            <li key={i.id}>
                              {i.producto?.nombre ?? '?'}
                              <span className="ml-1">× {i.cantidad} {i.producto?.unidad}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium pt-3 whitespace-nowrap">
                      {formatARS(v.total)}
                    </TableCell>
                    <TableCell className="pt-2">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog nueva venta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Fecha */}
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-44"
              />
            </div>

            {/* ── Sección Productos ── */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Productos <span className="font-normal text-muted-foreground">(se cobran al cliente)</span>
              </p>

              {productLines.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Producto</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Cantidad</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-32">Precio unit.</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productLines.map(l => (
                        <tr key={l.uid}>
                          <td className="px-3 py-2">
                            <div className="font-medium leading-none">{l.nombre}</div>
                            <div className={cn('text-xs mt-0.5', l.stock <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                              Stock: {l.stock} {l.unidad}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number" step="0.001" min="0.001"
                              value={l.cantidad}
                              onChange={e => updateCantidad(l.uid, +e.target.value)}
                              className="w-24 text-right ml-auto h-8"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number" step="0.01" min="0"
                              value={l.precio_unitario}
                              onChange={e => updatePrecio(l.uid, +e.target.value)}
                              className="w-28 text-right ml-auto h-8"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium whitespace-nowrap">
                            {formatARS((l.cantidad || 0) * (l.precio_unitario || 0))}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeLine(l.uid)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Popover open={comboOpen === 'producto'} onOpenChange={open => setComboOpen(open ? 'producto' : null)}>
                <PopoverTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                  <Plus className="h-4 w-4" /> Agregar producto
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por código o nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin productos disponibles</CommandEmpty>
                      <CommandGroup>
                        {productosDisp.map(p => {
                          const stock = inventario.find(i => i.id === p.id)?.stock_total ?? 0
                          return (
                            <CommandItem key={p.id} value={`${p.codigo} ${p.nombre}`} onSelect={() => addLine(p)}>
                              <span className="font-mono text-xs mr-2 text-muted-foreground">[{p.codigo}]</span>
                              <span className="flex-1">{p.nombre}</span>
                              <span className={cn('text-xs ml-2', stock <= 0 ? 'text-red-500' : 'text-emerald-600')}>
                                {stock} {p.unidad}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="border-t" />

            {/* ── Sección Insumos ── */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Insumos <span className="font-normal text-muted-foreground">(se consumen, no se cobran al cliente)</span>
              </p>

              {insumoLines.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Insumo</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Cantidad</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {insumoLines.map(l => (
                        <tr key={l.uid}>
                          <td className="px-3 py-2">
                            <div className="font-medium leading-none">{l.nombre}</div>
                            <div className={cn('text-xs mt-0.5', l.stock <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                              Stock: {l.stock} {l.unidad}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number" step="0.001" min="0.001"
                              value={l.cantidad}
                              onChange={e => updateCantidad(l.uid, +e.target.value)}
                              className="w-24 text-right ml-auto h-8"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeLine(l.uid)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Popover open={comboOpen === 'insumo'} onOpenChange={open => setComboOpen(open ? 'insumo' : null)}>
                <PopoverTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                  <Plus className="h-4 w-4" /> Agregar insumo
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por código o nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin insumos disponibles</CommandEmpty>
                      <CommandGroup>
                        {insumosDisp.map(p => {
                          const stock = inventario.find(i => i.id === p.id)?.stock_total ?? 0
                          return (
                            <CommandItem key={p.id} value={`${p.codigo} ${p.nombre}`} onSelect={() => addLine(p)}>
                              <span className="font-mono text-xs mr-2 text-muted-foreground">[{p.codigo}]</span>
                              <span className="flex-1">{p.nombre}</span>
                              <span className={cn('text-xs ml-2', stock <= 0 ? 'text-red-500' : 'text-emerald-600')}>
                                {stock} {p.unidad}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Total */}
            <div className="rounded-md bg-zinc-50 border px-3 py-2.5 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total venta</span>
              <span className="font-bold text-lg">{formatARS(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán la venta y todos sus ítems. El stock se recalculará automáticamente. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
