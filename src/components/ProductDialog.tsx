import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from 'next/image'
import { Producto, Vendedor } from '@/types';

interface ProductDialogProps {
  product: Producto
  onClose: () => void
  vendedores: Vendedor[]
  onEdit: (editedProduct: Producto, foto: File | null) => Promise<void>
  onDelete: (productId: string, vendedorId: string, cantidad: number) => Promise<void>
  onDeliver: (productId: string, vendedorId: string, cantidad: number) => Promise<void>
}

export default function ProductDialog({ product, onClose, vendedores, onEdit, onDelete, onDeliver }: ProductDialogProps) {
  console.log('Vendedores recibidos en ProductDialog:', vendedores);
  const [mode, setMode] = useState<'view' | 'edit' | 'deliver'>('view')
  const [editedProduct, setEditedProduct] = useState(product)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null)
  const [deliveryQuantity, setDeliveryQuantity] = useState<number>(0)

  useEffect(() => {
    console.log('Selected Vendedor changed:', selectedVendedor);
  }, [selectedVendedor]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedProduct(prev => ({
      ...prev,
      [name]: name === 'precio' || name === 'cantidad' ? Number(value) : value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(e.target.files[0])
    }
  }

  const handleEdit = async () => {
    await onEdit(editedProduct, newImage)
    setMode('view')
    setNewImage(null)
  }

  const handleDeliver = async () => {
    if (selectedVendedor && deliveryQuantity > 0 && deliveryQuantity <= product.cantidad) {
      try {
        console.log(`Entregando desde ProductDialog: ProductID=${product.id}, VendedorID=${selectedVendedor}, Cantidad=${deliveryQuantity}`);
        await onDeliver(product.id, selectedVendedor, deliveryQuantity)
        alert(`Se entregaron ${deliveryQuantity} unidades al vendedor seleccionado`)
        setDeliveryQuantity(0)
        setSelectedVendedor(null)
        setMode('view')
      } catch (error) {
        console.error('Error al entregar producto:', error)
        if (error instanceof Error) {
          alert(`Error al entregar producto: ${error.message}`)
        } else {
          alert('Error desconocido al entregar producto')
        }
      }
    } else {
      alert('Verifica que has seleccionado un vendedor y que la cantidad es correcta.')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      await onDelete(product.id, '', product.cantidad)
      onClose()
    }
  }

  const handleVendedorSelect = (vendedorId: string) => {
    console.log(`Attempting to select vendedor: ${vendedorId}`);
    console.log('Current selectedVendedor:', selectedVendedor);
    setSelectedVendedor(vendedorId);
    console.log('Updated selectedVendedor:', vendedorId);
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product.nombre}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
          <Image
            src={newImage ? URL.createObjectURL(newImage) : (product.foto || '/placeholder.svg')}
            alt={product.nombre}
            width={200}
            height={200}
            className="object-cover rounded"
            />
          </div>

          {mode === 'edit' ? (
            <>
              <Input
                name="nombre"
                value={editedProduct.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del producto"
              />
              <Input
                name="precio"
                type="number"
                value={editedProduct.precio}
                onChange={handleInputChange}
                placeholder="Precio"
              />
              <Input
                name="cantidad"
                type="number"
                value={editedProduct.cantidad}
                onChange={handleInputChange}
                placeholder="Cantidad"
              />
              <Input
                type="file"
                onChange={handleImageChange}
                accept="image/*"
              />
              <Button onClick={handleEdit}>Guardar cambios</Button>
              <Button variant="outline" onClick={() => setMode('view')}>Cancelar</Button>
            </>
          ) : mode === 'deliver' ? (
            <>
              <Label>Seleccionar vendedor:</Label>
              <div className="grid gap-2">
              {vendedores.map(vendedor => (
                <Button
                  key={vendedor.id}
                  onClick={() => handleVendedorSelect(vendedor.id)}
                  variant={selectedVendedor === vendedor.id ? 'default' : 'outline'}
                  className="w-full"
                >
                  {vendedor.nombre}
                </Button>
              ))}
              </div>
              <Label>Cantidad a entregar:</Label>
              <Input
                type="number"
                value={deliveryQuantity}
                onChange={(e) => setDeliveryQuantity(Number(e.target.value))}
                placeholder="Cantidad"
                min={1}
                max={product.cantidad}
              />
              <div className="flex justify-between gap-2">
                <Button onClick={handleDeliver} className="w-full">Confirmar entrega</Button>
                <Button variant="outline" onClick={() => setMode('view')} className="w-full">Cancelar</Button>
              </div>
            </>
          ) : (
            <>
              <p>Precio: ${product.precio}</p>
              <p>Cantidad disponible: {product.cantidad}</p>
              <div className="flex justify-between gap-2">
                <Button onClick={() => setMode('edit')} className="w-full">Editar</Button>
                <Button onClick={() => setMode('deliver')} className="w-full">Entregar</Button>
              </div>
              <Button variant="destructive" onClick={handleDelete} className="w-full">Eliminar</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}