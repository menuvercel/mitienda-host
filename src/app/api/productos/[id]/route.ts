// productos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, executeUpdate } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { put } from '@vercel/blob';
import { RowDataPacket } from 'mysql2';

interface ProductRow extends RowDataPacket {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  foto: string;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const formData = await request.formData();
    const nombre = formData.get('nombre') as string;
    const precio = formData.get('precio') as string;
    const cantidad = formData.get('cantidad') as string;
    const foto = formData.get('foto') as File | null;

    // Fetch the current product data
    const { rows: currentProductRows } = await query<ProductRow[]>(
      'SELECT * FROM productos WHERE id = ?', 
      [id]
    );
    const currentProduct = currentProductRows[0];
    
    if (!currentProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    let fotoUrl = currentProduct.foto;

    if (foto && foto instanceof File) {
      try {
        const blob = await put(foto.name, foto, { access: 'public' });
        fotoUrl = blob.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
      }
    }

    // Usar executeUpdate para operaciones UPDATE/DELETE/INSERT
    const { result: updateResult } = await executeUpdate(
      'UPDATE productos SET nombre = ?, precio = ?, cantidad = ?, foto = ? WHERE id = ?',
      [nombre, Number(precio), Number(cantidad), fotoUrl, id]
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ error: 'No se pudo actualizar el producto' }, { status: 404 });
    }

    return NextResponse.json({ 
      id, 
      nombre, 
      precio: Number(precio), 
      cantidad: Number(cantidad), 
      foto: fotoUrl 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const { rows: checkProductRows } = await query<ProductRow[]>(
      'SELECT * FROM productos WHERE id = ?', 
      [id]
    );
    
    if (!checkProductRows[0]) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    await query('START TRANSACTION');

    try {
      await executeUpdate('DELETE FROM usuario_productos WHERE producto_id = ?', [id]);
      await executeUpdate('DELETE FROM transacciones WHERE producto = ?', [id]);
      await executeUpdate('DELETE FROM ventas WHERE producto = ?', [id]);
      
      const { result: deleteResult } = await executeUpdate(
        'DELETE FROM productos WHERE id = ?', 
        [id]
      );

      if (deleteResult.affectedRows === 0) {
        throw new Error('No se pudo eliminar el producto');
      }

      await query('COMMIT');
      return NextResponse.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in DELETE function:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const { rows: products } = await query<ProductRow[]>(
      `SELECT up.producto_id as id, p.nombre, p.precio, up.cantidad, p.foto
       FROM usuario_productos up
       JOIN productos p ON up.producto_id = p.id
       WHERE up.usuario_id = ?`,
      [id]
    );

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}