'use client'

import { useState, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ChevronsUpDown } from 'lucide-react'
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

import { createCompra, deleteCompra } from '@/lib/client-api'
import type { Producto, Compra } from '@/lib/types'

type CartLine = {
  uid: string
  producto_id: string
  tipo: 'Producto' | 'Insumo'
  nombre: string
  codigo: number
  unidad: string
  cantidad: number
  costo_unitario: number
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ComprasClient({
  compras,
  productos,
}: {
  compras: Compra[]
  productos: Producto[]
}) {
  const [isPending, startTransition] = useTransition()
  const [listaCompras, setListaCompras] = useState<Compra[]>(compras)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)

  // Estado del modal
  const [fecha,      setFecha]      = useState(today())
  const [proveedor,  setProveedor]  = useState('')
  const [cartLines,  setCartLines]  = useState<CartLine[]>([])
  const [comboOpen,  setComboOpen]  = useState(false)

  const total = cartLines.reduce((sum, l) => sum + (l.cantidad || 0) * (l.costo_unitario || 0), 0)

  const proveedores = useMemo(
    () => [...new Set(productos.map(p => p.proveedor).filter(Boolean))].sort(),
    [productos],
  )

  const productosDisp = productos.filter(p => !cartLines.find(l => l.producto_id === p.id))

  function openCreate() {
    setFecha(today())
    setProveedor('')
    setCartLines([])
    setDialogOpen(true)
  }

  function addLine(p: Producto) {
    setCartLines(prev => [...prev, {
      uid:            crypto.randomUUID(),
      producto_id:    p.id,
      tipo:           p.tipo,
      nombre:         p.nombre,
      codigo:         p.codigo,
      unidad:         p.unidad,
      cantidad:       1,
      costo_unitario: p.costo,
    }])
    setComboOpen(false)
  }

  function updateCantidad(uid: string, value: number) {
    setCartLines(prev => prev.map(l => l.uid === uid ? { ...l, cantidad: value } : l))
  }

  function updateCosto(uid: string, value: number) {
    setCartLines(prev => prev.map(l => l.uid === uid ? { ...l, costo_unitario: value } : l))
  }

  function removeLine(uid: string) {
    setCartLines(prev => prev.filter(l => l.uid !== uid))
  }

  function handleSubmit() {
    if (cartLines.length === 0) {
      toast.error('Agregá al menos un ítem a la compra')
      return
    }
    startTransition(async () => {
      try {
        const nueva = await createCompra({
          fecha,
          proveedor,
          items: cartLines.map(l => ({
            producto_id:    l.producto_id,
            cantidad:       l.cantidad,
            costo_unitario: l.costo_unitario,
          })),
        })
        setListaCompras(prev => [nueva, ...prev])
        toast.success('Compra registrada')
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
        await deleteCompra(id)
        setListaCompras(prev => prev.filter(c => c.id !== id))
        toast.success('Compra eliminada')
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
          <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground text-sm">Órdenes de compra e ingreso de mercadería</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nueva compra
        </Button>
      </div>

      {/* Tabla de compras */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-28">Fecha</TableHead>
              <TableHead className="w-40">Proveedor</TableHead>
              <TableHead>Ítems</TableHead>
              <TableHead className="text-right w-36">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listaCompras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Sin compras registradas todavía
                </TableCell>
              </TableRow>
            ) : (
              listaCompras.map(c => (
                <TableRow key={c.id} className="hover:bg-zinc-50 align-top">
                  <TableCell className="text-sm pt-3 whitespace-nowrap">
                    {format(new Date(c.fecha + 'T12:00:00'), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-sm pt-3 font-medium">
                    {c.proveedor || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    <ul className="space-y-0.5">
                      {c.items.map(i => (
                        <li key={i.id}>
                          <span className="font-medium">{i.producto?.nombre ?? '?'}</span>
                          <span className="text-muted-foreground ml-1.5">
                            × {i.cantidad} {i.producto?.unidad}
                            {' · '}{formatARS(i.costo_unitario)}/u
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium pt-3 whitespace-nowrap">
                    {formatARS(c.total)}
                  </TableCell>
                  <TableCell className="pt-2">
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog nueva compra */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Fecha + Proveedor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Input
                  list="proveedores-list"
                  placeholder="Proveedor (opcional)"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  autoComplete="off"
                />
                <datalist id="proveedores-list">
                  {proveedores.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>

            {/* Ítems */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Ítems comprados</p>

              {cartLines.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Producto / Insumo</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Cantidad</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-32">Costo unit.</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cartLines.map(l => (
                        <tr key={l.uid}>
                          <td className="px-3 py-2">
                            <div className="font-medium leading-none">{l.nombre}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              [{l.codigo}] · {l.tipo} · {l.unidad}
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
                              value={l.costo_unitario}
                              onChange={e => updateCosto(l.uid, +e.target.value)}
                              className="w-28 text-right ml-auto h-8"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium whitespace-nowrap">
                            {formatARS((l.cantidad || 0) * (l.costo_unitario || 0))}
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

              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                  <Plus className="h-4 w-4" /> Agregar ítem
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por código o nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin productos disponibles</CommandEmpty>
                      <CommandGroup heading="Productos">
                        {productosDisp.filter(p => p.tipo === 'Producto').map(p => (
                          <CommandItem key={p.id} value={`${p.codigo} ${p.nombre}`} onSelect={() => addLine(p)}>
                            <span className="font-mono text-xs mr-2 text-muted-foreground">[{p.codigo}]</span>
                            <span className="flex-1">{p.nombre}</span>
                            <span className="text-xs text-muted-foreground ml-2">{p.unidad}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Insumos">
                        {productosDisp.filter(p => p.tipo === 'Insumo').map(p => (
                          <CommandItem key={p.id} value={`${p.codigo} ${p.nombre}`} onSelect={() => addLine(p)}>
                            <span className="font-mono text-xs mr-2 text-muted-foreground">[{p.codigo}]</span>
                            <span className="flex-1">{p.nombre}</span>
                            <span className="text-xs text-muted-foreground ml-2">{p.unidad}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Total */}
            <div className="rounded-md bg-zinc-50 border px-3 py-2.5 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total compra</span>
              <span className="font-bold text-lg">{formatARS(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán la orden y todos sus ítems. El stock se recalculará automáticamente. No se puede deshacer.
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
