'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Menu, ArrowUpDown, Plus, Truck, UserPlus } from "lucide-react"
import { 
  getVendedores, 
  getCurrentUser, 
  getInventario, 
  registerUser, 
  getProductosVendedor,
  getVentasVendedor,
  agregarProducto,
  editarProducto,
  entregarProducto,
  reducirProductoVendedor,
  getTransaccionesVendedor,
  editarVendedor,
  eliminarProducto
} from '../../services/api'
import ProductDialog from '@/components/ProductDialog'
import VendorDialog from '@/components/VendedorDialog'
import SalesSection from '@/components/SalesSection'
import { Producto, Vendedor, Venta, Transaccion } from '@/types'

interface VendorDialogProps {
  vendor: Vendedor
  onClose: () => void
  productos: Producto[]
  transacciones: Transaccion[]
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

interface NewUser {
  nombre: string;
  password: string;
  telefono: string;
  rol: string;
}

interface NewProduct {
  nombre: string;
  precio: number;
  cantidad: number;
  foto: File | null;
}

const useAlmacenData = () => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [inventario, setInventario] = useState<Producto[]>([])

  const fetchVendedores = useCallback(async () => {
    try {
      const data = await getVendedores()
      setVendedores(data)
      console.log('Lista de vendedores cargada:', data)
    } catch (error) {
      console.error('Error al obtener vendedores:', error)
      alert('No se pudieron cargar los vendedores. Por favor, inténtalo de nuevo.')
    }
  }, [])

  const fetchInventario = useCallback(async () => {
    try {
      const data = await getInventario()
      setInventario(data as Producto[])
    } catch (error) {
      console.error('Error al obtener inventario:', error)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (user.rol === 'Almacen') {
          setIsAuthenticated(true)
          await Promise.all([fetchVendedores(), fetchInventario()])
        } else {
          router.push('/pages/LoginPage')
        }
      } catch (error) {
        console.error('Error de autenticación:', error)
        router.push('/pages/LoginPage')
      }
    }

    checkAuth()
  }, [router, fetchVendedores, fetchInventario])

  return { isAuthenticated, vendedores, inventario, fetchVendedores, fetchInventario, setInventario }
}

export default function AlmacenPage() {
  const { isAuthenticated, vendedores, inventario, fetchVendedores, fetchInventario, setInventario } = useAlmacenData()
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newUser, setNewUser] = useState<NewUser>({
    nombre: '',
    password: '',
    telefono: '',
    rol: ''
  })
  const [productosVendedor, setProductosVendedor] = useState<Producto[]>([])
  const [ventasVendedor, setVentasVendedor] = useState<Venta[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [transaccionesVendedor, setTransaccionesVendedor] = useState<Transaccion[]>([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<Vendedor | null>(null)
  const [ventasSemanales, setVentasSemanales] = useState<VentaSemana[]>([])
  const [ventasDiarias, setVentasDiarias] = useState<VentaDia[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    nombre: '',
    precio: 0,
    cantidad: 0,
    foto: null
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('productos')
  const [showMassDeliveryDialog, setShowMassDeliveryDialog] = useState(false)
  const [massDeliveryStep, setMassDeliveryStep] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({})
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad'>('nombre')


  const obtenerVentasDelDia = useCallback(async (fecha: Date, vendedorId: string) => {
    try {
      const startDate = fecha.toISOString().split('T')[0]
      const endDate = startDate
      const response = await fetch(`/api/ventas?vendedorId=${vendedorId}&startDate=${startDate}&endDate=${endDate}`)
      if (!response.ok) {
        throw new Error(`Error al obtener ventas para el vendedor ${vendedorId}`)
      }
      const ventas: Venta[] = await response.json()
      return ventas
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      throw error
    }
  }, [])

  const handleDeleteProduct = async (productId: string) => {
    try {
      await eliminarProducto(productId);
      await fetchInventario();
      setSelectedProduct(null);
      alert('Producto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto. Por favor, inténtelo de nuevo.');
    }
  };


  const handleMassDelivery = async () => {
    try {
      for (const [productId, quantity] of Object.entries(selectedProducts)) {
        for (const vendorId of selectedVendors) {
          await entregarProducto(productId, vendorId, quantity)
        }
      }
      
      await fetchInventario()
      setShowMassDeliveryDialog(false)
      setMassDeliveryStep(1)
      setSelectedProducts({})
      setSelectedVendors([])
      alert('Entrega masiva realizada con éxito')
    } catch (error) {
      console.error('Error en la entrega masiva:', error)
      alert('Hubo un error al realizar la entrega masiva. Por favor, inténtelo de nuevo.')
    }
  }

  const handleSort = (key: 'nombre' | 'cantidad') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const sortedInventario = [...inventario].sort((a, b) => {
    if (sortBy === 'nombre') {
      return sortOrder === 'asc' 
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    } else {
      return sortOrder === 'asc'
        ? a.cantidad - b.cantidad
        : b.cantidad - a.cantidad
    }
  })

  const filteredInventarioForMassDelivery = inventario.filter((producto) =>
    producto.nombre.toLowerCase().includes(productSearchTerm.toLowerCase())
  )
  
  const handleProductQuantityChange = (productId: string, value: string) => {
    const numValue = Number(value)
    setSelectedProducts(prev => ({...prev, [productId]: numValue}))
  }

  const handleProductQuantityBlur = (productId: string, maxQuantity: number) => {
    setSelectedProducts(prev => {
      const currentValue = prev[productId] || 0
      const adjustedValue = Math.max(1, Math.min(currentValue, Math.floor(maxQuantity / selectedVendors.length)))
      return {...prev, [productId]: adjustedValue}
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (value: string) => {
    setNewUser({ ...newUser, rol: value })
  }

  const handleRegisterUser = async () => {
    try {
      await registerUser(newUser)
      setShowRegisterModal(false)
      setNewUser({
        nombre: '',
        password: '',
        telefono: '',
        rol: ''
      })
      await fetchVendedores()
    } catch (error) {
      console.error('Error al registrar usuario:', error)
    }
  }

  const calcularVentasDiarias = (ventas: Venta[]): VentaDia[] => {
    const ventasPorDia: { [key: string]: Venta[] } = {};
    ventas.forEach(venta => {
      const fecha = venta.fecha.split('T')[0];
      if (!ventasPorDia[fecha]) ventasPorDia[fecha] = [];
      ventasPorDia[fecha].push(venta);
    });
  
    return Object.entries(ventasPorDia).map(([fecha, ventasDelDia]) => ({
      fecha,
      ventas: ventasDelDia,
      total: ventasDelDia.reduce((sum, venta) => sum + parseFloat(venta.total.toString()), 0)
    }));
  };
  
  const calcularVentasSemanales = (ventas: Venta[]): VentaSemana[] => {
    const weekMap = new Map();
  
    const getWeekKey = (date: Date) => {
      // Asegúrate de que la semana empiece en lunes
      const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 });
      // Asegura que la semana empieza el lunes
      const sundayOfWeek = endOfWeek(date, { weekStartsOn: 1 });
      // Y termina el domingo
      return `${format(mondayOfWeek, 'yyyy-MM-dd')}_${format(sundayOfWeek, 'yyyy-MM-dd')}`;
    };
  
    ventas.forEach((venta) => {
      const ventaDate = new Date(venta.fecha);
  
      // Validar que la fecha sea válida
      if (isNaN(ventaDate.getTime())) {
        console.error(`Fecha inválida en la venta: ${venta.fecha}`);
        return;
      }
  
      const weekKey = getWeekKey(ventaDate);
  
      // Si la semana no existe en el Map, se agrega
      if (!weekMap.has(weekKey)) {
        const mondayOfWeek = startOfWeek(ventaDate, { weekStartsOn: 1 });
        const sundayOfWeek = endOfWeek(ventaDate, { weekStartsOn: 1 });
        weekMap.set(weekKey, {
          fechaInicio: format(mondayOfWeek, 'yyyy-MM-dd'),
          fechaFin: format(sundayOfWeek, 'yyyy-MM-dd'),
          ventas: [],
          total: 0,
          ganancia: 0,
        });
      }
  
      // Obtener la semana y agregar una copia de la venta
      const currentWeek = weekMap.get(weekKey)!;
      currentWeek.ventas.push({ ...venta });
  
      // Acumulación del total
      currentWeek.total += typeof venta.total === 'number' ? venta.total : parseFloat(venta.total) || 0;
  
      // Calcular la ganancia
      currentWeek.ganancia = parseFloat((currentWeek.total * 0.08).toFixed(2));
    });
  
    return Array.from(weekMap.values());
  };
  

  const handleVerVendedor = async (vendedor: Vendedor) => {
    try {
      const [productos, ventas, transacciones] = await Promise.all([
        getProductosVendedor(vendedor.id),
        getVentasVendedor(vendedor.id), // Ahora no es necesario pasar las fechas
        getTransaccionesVendedor(vendedor.id)
      ]);
  
      // Calcular ventas diarias
      const ventasDiarias = calcularVentasDiarias(ventas);
  
      // Calcular ventas semanales
      const ventasSemanales = calcularVentasSemanales(ventas);
  
      setProductosVendedor(productos);
      setVentasVendedor(ventas);
      setVentasDiarias(ventasDiarias);
      setVentasSemanales(ventasSemanales);
      setTransaccionesVendedor(transacciones);
      setVendedorSeleccionado(vendedor);
    } catch (error) {
      console.error('Error al obtener datos del vendedor:', error);
      alert('No se pudieron cargar todos los datos del vendedor. Algunos datos pueden estar incompletos.');
      setVendedorSeleccionado(vendedor);
    }
  };
  

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    if (type === 'file') {
      const fileList = e.target.files
      if (fileList && fileList.length > 0) {
        setNewProduct({ ...newProduct, [name]: fileList[0] })
      }
    } else {
      setNewProduct({ ...newProduct, [name]: type === 'number' ? parseFloat(value) : value })
    }
  }

  const handleAddProduct = async () => {
    try {
      const formData = new FormData()
      formData.append('nombre', newProduct.nombre)
      formData.append('precio', newProduct.precio.toString())
      formData.append('cantidad', newProduct.cantidad.toString())
      
      if (newProduct.foto) {
        formData.append('foto', newProduct.foto)
      }
  
      await agregarProducto(formData)
      setShowAddProductModal(false)
      setNewProduct({
        nombre: '',
        precio: 0,
        cantidad: 0,
        foto: null
      })
      await fetchInventario()
    } catch (error) {
      console.error('Error al agregar producto:', error)
    }
  }

  const handleProductDelivery = async (productId: string, vendedorId: string, cantidad: number) => {
    try {
      console.log(`Entregando producto: ID=${productId}, VendedorID=${vendedorId}, Cantidad=${cantidad}`)
      await entregarProducto(productId, vendedorId, cantidad)
      
      await fetchInventario()
      setSelectedProduct(null)
  
      alert('Producto entregado exitosamente')
    } catch (error) {
      console.error('Error entregando producto:', error)
      if (error instanceof Error) {
        alert(`Error al entregar producto: ${error.message}`)
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as any
        alert(`Error al entregar producto: ${axiosError.response?.data?.error || 'Error desconocido'}`)
      } else {
        alert('Error desconocido al entregar producto')
      }
    }
  }

  const handleEditProduct = async (editedProduct: Producto, foto: File | null) => {
    try {
      const formData = new FormData()
      formData.append('nombre', editedProduct.nombre)
      formData.append('precio', editedProduct.precio.toString())
      formData.append('cantidad', editedProduct.cantidad.toString())
      
      if (foto) {
        formData.append('foto', foto)
      } else if (editedProduct.foto) {
        formData.append('fotoUrl', editedProduct.foto)
      }
  
      await editarProducto(editedProduct.id, formData)
      await fetchInventario()
      setSelectedProduct(null)
    } catch (error) {
      console.error('Error editing product:', error)
      alert('Error al editar el producto. Por favor, inténtelo de nuevo.')
    }
  }

  const handleReduceVendorProduct = async (productId: string, vendorId: string, cantidad: number) => {
    try {
      await reducirProductoVendedor(productId, vendorId, cantidad);

      if (vendedorSeleccionado) {
        const updatedProducts = await getProductosVendedor(vendedorSeleccionado.id);
        setProductosVendedor(updatedProducts);
        const updatedTransactions = await getTransaccionesVendedor(vendedorSeleccionado.id);
        setTransaccionesVendedor(updatedTransactions);
      }

      await fetchInventario();

      alert('Cantidad de producto reducida exitosamente');
    } catch (error) {
      console.error('Error reducing vendor product quantity:', error);
      alert('Error al reducir la cantidad del producto. Por favor, inténtelo de nuevo.');
    }
  };

  const handleEditVendedor = async (editedVendor: Vendedor) => {
    try {
      await editarVendedor(editedVendor.id, editedVendor);
      await fetchVendedores();
      setVendedorSeleccionado(null);
      alert('Vendedor actualizado exitosamente');
    } catch (error) {
      console.error('Error editing vendor:', error);
      if (error instanceof Error) {
        alert(`Error al editar el vendedor: ${error.message}`);
      } else {
        alert('Error desconocido al editar el vendedor');
      }
    }
  };

  const filteredInventario = sortedInventario.filter((producto) =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAuthenticated) {
    return <div>Cargando...</div>
  }

  return (
    <div className="container mx-auto p-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel de Almacén</h1>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col space-y-4">
              <Button
                variant="ghost"
                className={activeSection === 'productos' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('productos')
                  setIsMenuOpen(false)
                }}
              >
                Productos
              </Button>
              <Button
                variant="ghost"
                
                className={activeSection === 'vendedores' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('vendedores')
                  setIsMenuOpen(false)
                }}
              >
                Vendedores
              </Button>
              <Button
                variant="ghost"
                className={activeSection === 'ventas' ? 'bg-accent' : ''}
                onClick={() => {
                  setActiveSection('ventas')
                  setIsMenuOpen(false)
                }}
              >
                Ventas
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {activeSection === 'productos' && (
        <div>
          <div className="flex justify-end mb-4 space-x-2">
            <Button
              onClick={() => setShowAddProductModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar Producto
            </Button>
            <Button
              onClick={() => setShowMassDeliveryDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Truck className="mr-2 h-4 w-4" /> Entrega Masiva
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Lista de productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex justify-start space-x-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort('nombre')}
                  className="flex items-center text-xs px-2 py-1"
                >
                  Nombre
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSort('cantidad')}
                  className="flex items-center text-xs px-2 py-1"
                >
                  Cantidad
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {filteredInventario.map((producto) => (
                  <Button
                    key={producto.id}
                    onClick={() => setSelectedProduct(producto)}
                    className={`w-full h-auto p-2 flex items-center text-left border border-gray-200 rounded-lg shadow-sm transition-colors ${
                      producto.cantidad === 0 ? 'bg-red-100 hover:bg-red-200' : 'bg-white hover:bg-gray-100'
                    }`}
                    variant="ghost"
                  >
                    {producto.foto ? (
                      <Image
                        src={producto.foto}
                        alt={producto.nombre}
                        width={50}
                        height={50}
                        className="object-cover rounded mr-4"
                        onError={(e) => {
                          console.error(`Error loading image for ${producto.nombre}:`, e)
                          e.currentTarget.src = '/placeholder.svg'
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mr-4">
                        <span className="text-gray-500 text-xs">Sin imagen</span>
                      </div>
                    )}
                    <div className="flex-grow">
                      <span className="font-semibold text-gray-800">{producto.nombre}</span>
                      <div className="text-sm text-gray-600">
                        <span className="mr-4">Precio: ${producto.precio}</span>
                        <span className={producto.cantidad === 0 ? 'text-red-600 font-bold' : ''}>
                          Cantidad: {producto.cantidad}
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'vendedores' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowRegisterModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Agregar Usuario
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vendedores.map((vendedor) => (
                  <Button
                    key={vendedor.id}
                    onClick={() => handleVerVendedor(vendedor)}
                    className="w-full h-auto p-4 flex items-center text-left bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition-colors"
                    variant="ghost"
                  >
                    <div className="flex-grow">
                      <span className="font-semibold text-gray-800">{vendedor.nombre}</span>
                      <div className="text-sm text-gray-600">
                        <span>Teléfono: {vendedor.telefono}</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'ventas' && (
        <SalesSection userRole="Almacen" />
      )}

    <Dialog open={showMassDeliveryDialog} onOpenChange={setShowMassDeliveryDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Entrega Masiva</DialogTitle>
        </DialogHeader>
        {massDeliveryStep === 1 ? (
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {vendedores.map((vendedor) => (
                <div key={vendedor.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vendor-${vendedor.id}`}
                    checked={selectedVendors.includes(vendedor.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedVendors([...selectedVendors, vendedor.id])
                      } else {
                        setSelectedVendors(selectedVendors.filter(id => id !== vendedor.id))
                      }
                    }}
                  />
                  <label htmlFor={`vendor-${vendedor.id}`}>{vendedor.nombre}</label>
                </div>
              ))}
            </div>
            <Button onClick={() => setMassDeliveryStep(2)} 
              disabled={selectedVendors.length === 0}>
              Siguiente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Buscar productos..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredInventarioForMassDelivery.map((producto) => (
                <div key={producto.id} className="flex items-center space-x-2 p-2 border rounded">
                  <Checkbox
                    id={`product-${producto.id}`}
                    checked={!!selectedProducts[producto.id]}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProducts({...selectedProducts, [producto.id]: 1})
                      } else {
                        const { [producto.id]: _, ...rest } = selectedProducts
                        setSelectedProducts(rest)
                      }
                    }}
                  />
                  <div className="flex-grow flex items-center space-x-2">
                    <Image
                      src={producto.foto || '/placeholder.svg'}
                      alt={producto.nombre}
                      width={40}
                      height={40}
                      className="object-cover rounded"
                    />
                    <div>
                      <label htmlFor={`product-${producto.id}`} className="font-medium">{producto.nombre}</label>
                      <div className="text-sm text-gray-600">
                        <span className="mr-2">Precio: ${producto.precio}</span>
                        <span>Disponible: {producto.cantidad}</span>
                      </div>
                    </div>
                  </div>
                  {selectedProducts[producto.id] !== undefined && (
                    <Input
                      type="number"
                      value={selectedProducts[producto.id]}
                      onChange={(e) => handleProductQuantityChange(producto.id, e.target.value)}
                      onBlur={() => handleProductQuantityBlur(producto.id, producto.cantidad)}
                      className="w-20"
                      min={1}
                      max={Math.floor(producto.cantidad / selectedVendors.length)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setMassDeliveryStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleMassDelivery} disabled={Object.keys(selectedProducts).length === 0}>
                Entregar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <Input
                id="nombre"
                name="nombre"
                value={newUser.nombre}
                onChange={handleInputChange}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleInputChange}
                placeholder="Contraseña"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <Input
                id="telefono"
                name="telefono"
                value={newUser.telefono}
                onChange={handleInputChange}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-gray-700">Rol</label>
              <Select onValueChange={handleRoleChange} value={newUser.rol}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Almacen">Almacén</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRegisterUser}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
              <Input
                id="nombre"
                name="nombre"
                value={newProduct.nombre}
                onChange={handleProductInputChange}
                placeholder="Nombre del producto"
              />
            </div>
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700">Precio</label>
              <Input
                id="precio"
                name="precio"
                type="number"
                value={newProduct.precio}
                onChange={handleProductInputChange}
                placeholder="Precio del producto"
              />
            </div>
            <div>
              <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700">Cantidad</label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                value={newProduct.cantidad}
                onChange={handleProductInputChange}
                placeholder="Cantidad del producto"
              />
            </div>
            <div>
              <label htmlFor="foto" className="block text-sm font-medium text-gray-700">Foto del producto</label>
              <Input
                id="foto"
                name="foto"
                type="file"
                onChange={handleProductInputChange}
                accept="image/*"
              />
            </div>
            <Button onClick={handleAddProduct}>Agregar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedProduct && (
        <ProductDialog
          product={{...selectedProduct, foto: selectedProduct.foto || ''}}
          onClose={() => setSelectedProduct(null)}
          vendedores={vendedores}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onDeliver={handleProductDelivery}
        />
      )}

        {vendedorSeleccionado && (
          <VendorDialog
            vendor={vendedorSeleccionado}
            onClose={() => setVendedorSeleccionado(null)}
            onEdit={handleEditVendedor}
            productos={productosVendedor}
            ventas={ventasVendedor}
            ventasSemanales={ventasSemanales}
            ventasDiarias={ventasDiarias}
            transacciones={transaccionesVendedor}
            onProductReduce={handleReduceVendorProduct}
          />
        )}
    </div>
  )
} 