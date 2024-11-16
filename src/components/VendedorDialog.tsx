import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import Image from 'next/image'
import { Vendedor, Producto, Venta, Transaccion } from '@/types'
import { Minus, DollarSign, ArrowLeftRight, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isValid, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  onEdit: (editedVendor: Vendedor) => Promise<void>
  productos: Producto[]
  transacciones: Transaccion[]
  ventas: Venta[]
  ventasSemanales: VentaSemana[]
  ventasDiarias: VentaDia[]
  onProductReduce: (productId: string, vendorId: string, cantidad: number) => Promise<void>
}

interface VentaSemana {
  fechaInicio: string
  fechaFin: string
  ventas: Venta[]
  total: number
  ganancia: number
}

interface VentaDia {
  fecha: string
  ventas: Venta[]
  total: number
}

export default function VendorDialog({ vendor, onClose, onEdit, productos, transacciones, ventas, ventasSemanales, ventasDiarias, onProductReduce }: VendorDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'productos' | 'ventas' | 'transacciones'>('view')
  const [editedVendor, setEditedVendor] = useState(vendor)
  const [searchTerm, setSearchTerm] = useState('')
  const [reduceDialogOpen, setReduceDialogOpen] = useState(false)
  const [productToReduce, setProductToReduce] = useState<Producto | null>(null)
  const [quantityToReduce, setQuantityToReduce] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [ventasSemanalesState, setVentasSemanales] = useState<VentaSemana[]>([])

  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) {
        console.error(`Invalid date string: ${dateString}`)
        return 'Fecha inválida'
      }
      return format(date, 'dd/MM/yyyy', { locale: es })
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error)
      return 'Error en fecha'
    }
  }

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  const VentaDiaDesplegable = ({ venta }: { venta: VentaDia }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div className="border rounded-lg mb-2">
        <div 
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{formatDate(venta.fecha)}</span>
          <div className="flex items-center">
            <span className="mr-2">${formatPrice(venta.total)}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {isOpen && (
          <div className="p-4 bg-gray-50">
            {venta.ventas.map((v) => (
              <div key={v._id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <Image
                    src={v.producto_foto || '/placeholder.svg'}
                    alt={v.producto_nombre}
                    width={40}
                    height={40}
                    className="rounded-md mr-4"
                  />
                  <span>{v.producto_nombre}</span>
                </div>
                <div className="text-right">
                  <div>Cantidad: {v.cantidad}</div>
                  <div>${formatPrice(v.precio_unitario)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const VentaSemanaDesplegable = ({ venta }: { venta: VentaSemana }) => {
    const [isOpen, setIsOpen] = useState(false)

    const parsePrice = (price: number | string): number => {
      if (typeof price === 'number') return price
      const parsed = parseFloat(price)
      return isNaN(parsed) ? 0 : parsed
    }

    const ventasPorDia = venta.ventas.reduce((acc: Record<string, Venta[]>, v) => {
      const fecha = parseISO(v.fecha)
      if (!isValid(fecha)) {
        console.error(`Invalid date in venta: ${v.fecha}`)
        return acc
      }
      const fechaStr = format(fecha, 'yyyy-MM-dd')
      if (!acc[fechaStr]) {
        acc[fechaStr] = []
      }
      acc[fechaStr].push(v)
      return acc
    }, {})

    return (
      <div className="border rounded-lg mb-2">
        <div 
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>Semana {formatDate(venta.fechaInicio)} - {formatDate(venta.fechaFin)}</span>
          <div className="flex items-center space-x-4">
            <span>${formatPrice(venta.total)}</span>
            <span className="text-green-600">Ganancia: ${formatPrice(venta.ganancia)}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {isOpen && (
          <div className="p-4 bg-gray-50">
            {Object.entries(ventasPorDia)
              .sort(([dateA], [dateB]) => {
                const a = parseISO(dateA)
                const b = parseISO(dateB)
                return isValid(a) && isValid(b) ? a.getTime() - b.getTime() : 0
              })
              .map(([fecha, ventasDia]) => {
                const fechaVenta = parseISO(fecha)
                const fechaInicio = parseISO(venta.fechaInicio)
                const fechaFin = parseISO(venta.fechaFin)
                if (isValid(fechaVenta) && isValid(fechaInicio) && isValid(fechaFin) &&
                    fechaVenta >= fechaInicio && fechaVenta <= fechaFin) {
                  return (
                    <VentaDiaDesplegable 
                      key={fecha} 
                      venta={{
                        fecha, 
                        ventas: ventasDia, 
                        total: ventasDia.reduce((sum, v) => sum + parsePrice(v.total), 0)
                      }} 
                    />
                  )
                }
                return null
              })}
          </div>
        )}
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedVendor(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEdit = async () => {
    try {
      setIsLoading(true)
      await onEdit(editedVendor)
      setMode('view')
      toast({
        title: "Éxito",
        description: "Los datos del vendedor se han actualizado correctamente.",
      })
    } catch (error) {
      console.error('Error al editar el vendedor:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar los datos del vendedor. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReduceProduct = (product: Producto) => {
    setProductToReduce(product)
    setQuantityToReduce(0)
    setReduceDialogOpen(true)
  }

  const confirmReduce = async () => {
    if (productToReduce && quantityToReduce > 0) {
      setIsLoading(true)
      try {
        const productId = productToReduce.id.toString()
        await onProductReduce(productId, vendor.id, quantityToReduce)
        setReduceDialogOpen(false)
        setProductToReduce(null)
        setQuantityToReduce(0)
        toast({
          title: "Éxito",
          description: "La cantidad del producto se ha reducido correctamente.",
        })
      } catch (error) {
        console.error('Error al reducir la cantidad del producto:', error)
        toast({
          title: "Error",
          description: "No se pudo reducir la cantidad del producto. Por favor, inténtelo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const filterItems = useCallback((items: any[], term: string) => {
    return items.filter(item => 
      Object.values(item).some(value => 
        value && value.toString().toLowerCase().includes(term.toLowerCase())
      )
    )
  }, [])

  const renderProductList = (products: Producto[]) => {
    const filteredProducts = filterItems(products, searchTerm)
    return (
      <div className="space-y-2">
        {filteredProducts.map(producto => (
          <div key={producto.id} className="flex items-center bg-white p-4 rounded-lg shadow">
            <Image
              src={producto.foto || '/placeholder.svg'}
              alt={producto.nombre}
              width={50}
              height={50}
              className="object-cover rounded mr-4"
            />
            <div className="flex-grow">
              <h3 className="font-bold">{producto.nombre}</h3>
              <p className="text-sm">${formatPrice(producto.precio)} - Cantidad: {producto.cantidad}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReduceProduct(producto)}
              disabled={isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  const renderVentasList = () => {
    return (
      <Tabs defaultValue="por-dia">
        <TabsList>
          <TabsTrigger value="por-dia">Por día</TabsTrigger>
          <TabsTrigger value="por-semana">Por semana</TabsTrigger>
        </TabsList>
        <TabsContent value="por-dia">
          <div className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {ventasDiarias.length > 0 ? (
              ventasDiarias.map((venta) => (
                <VentaDiaDesplegable key={venta.fecha} venta={venta} />
              ))
            ) : (
              <div className="text-center py-4">No hay ventas registradas</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="por-semana">
          <div className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {ventasSemanalesState.length > 0 ? (
              ventasSemanalesState.map((venta) => (
                <VentaSemanaDesplegable key={`${venta.fechaInicio}-${venta.fechaFin}`} venta={venta} />
              ))
            ) : (
              <div className="text-center py-4">No hay ventas registradas</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  const renderTransaccionesList = () => {
    const filteredTransacciones = filterItems(transacciones, searchTerm)
    return (
      <div className="space-y-2">
        {filteredTransacciones.map(transaccion => {
          const transactionType = transaccion.tipo || 'Normal'
          const borderColor = 
            transactionType === 'Baja' ? 'border-red-500' :
            transactionType === 'Entrega' ? 'border-green-500' :
            'border-blue-500'
            
          // Convertimos el precio a número y validamos
          const precioFormateado = parseFloat(transaccion.precio || 0).toFixed(2)
  
          return (
            <div key={transaccion.id} className={`flex items-center bg-white p-2 rounded-lg shadow border-l-4 ${borderColor}`}>
              <ArrowLeftRight className="w-6 h-6 text-blue-500 mr-2 flex-shrink-0" />
              <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm truncate">{transaccion.producto}</p>
                  <p className="text-sm font-semibold text-green-600">
                    ${precioFormateado}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>{new Date(transaccion.fecha).toLocaleDateString()}</span>
                  <span>Cantidad: {transaccion.cantidad}</span>
                </div>
                <p className="text-xs font-semibold">{transactionType}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const agruparVentasPorSemana = useCallback((ventas: Venta[]) => {
    const weekMap = new Map<string, VentaSemana>()

    const getWeekKey = (date: Date) => {
      const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 })
      const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`
    }

    ventas.forEach((venta) => {
      const ventaDate = parseISO(venta.fecha)
      if (!isValid(ventaDate)) {
        console.error(`Invalid date in venta: ${venta.fecha}`)
        return
      }
      const weekKey = getWeekKey(ventaDate)

      if (!weekMap.has(weekKey)) {
        const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 })
        const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 })
        weekMap.set(weekKey, {
          fechaInicio: format(mondayOfWeek, 'yyyy-MM-dd'),
          fechaFin: format(sundayOfWeek, 'yyyy-MM-dd'),
          ventas: [],
          total: 0,
          ganancia: 0
        })
      }

      const currentWeek = weekMap.get(weekKey)!
      currentWeek.ventas.push(venta)
      currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0
      currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2))
    })

    const ventasSemanales = Array.from(weekMap.values())

    return ventasSemanales.sort((a, b) => {
      const dateA = parseISO(a.fechaInicio)
      const dateB = parseISO(b.fechaInicio)
      return isValid(dateB) && isValid(dateA) ? dateB.getTime() - dateA.getTime() : 0
    })
  }, [])

  useEffect(() => {
    setVentasSemanales(agruparVentasPorSemana(ventas))
  }, [ventas, agruparVentasPorSemana])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle>{vendor.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4">
          {mode === 'edit' ? (
            <div className="space-y-4">
              <Input
                name="nombre"
                value={editedVendor.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del vendedor"
              />
              <Input
                name="telefono"
                value={editedVendor.telefono}
                onChange={handleInputChange}
                placeholder="Teléfono"
              />
              <Button onClick={handleEdit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          ) : mode === 'productos' ? (
            <Tabs defaultValue="disponibles" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="disponibles">Disponibles</TabsTrigger>
                <TabsTrigger value="agotados">Agotados</TabsTrigger>
              </TabsList>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <TabsContent value="disponibles">
                {renderProductList(productos.filter(p => p.cantidad > 0))}
              </TabsContent>
              <TabsContent value="agotados">
                {renderProductList(productos.filter(p => p.cantidad === 0))}
              </TabsContent>
            </Tabs>
          ) : mode === 'ventas' ? (
            <div>
              <h2 className="text-lg font-bold mb-4">Ventas</h2>
              {renderVentasList()}
            </div>
          ) : mode === 'transacciones' ? (
            <div>
              <h2 className="text-lg font-bold mb-4">Transacciones</h2>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {renderTransaccionesList()}
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setMode('edit')}>Editar</Button>
              <Button onClick={() => setMode('productos')}>Productos</Button>
              <Button onClick={() => setMode('ventas')}>Ventas</Button>
              <Button onClick={() => setMode('transacciones')}>Transacciones</Button>
            </div>
          )}
        </div>
        {mode !== 'view' && (
          <div className="p-4">
            <Button onClick={() => setMode('view')}>Volver</Button>
          </div>
        )}
      </DialogContent>

      <Dialog open={reduceDialogOpen} onOpenChange={setReduceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reducir cantidad de producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Especifique la cantidad a reducir para {productToReduce?.nombre}</p>
            <Input
              type="number"
              value={quantityToReduce}
              onChange={(e) => setQuantityToReduce(Math.max(0, Math.min(Number(e.target.value), productToReduce?.cantidad || 0)))}
              max={productToReduce?.cantidad}
              min={0}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceDialogOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={confirmReduce} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

