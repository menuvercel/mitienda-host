import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

// Interfaces para tipar los datos
interface Producto {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  foto: string;
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        const decoded = verifyToken(token);
        
        if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
  
      const formData = await request.formData();
      const nombre = formData.get('nombre') as string;
      const precio = formData.get('precio') as string;
      const cantidad = formData.get('cantidad') as string;
      const foto = formData.get('foto') as File | null;
  
      console.log('Received form data:', { nombre, precio, cantidad, foto });
  
      let fotoUrl = '';
  
      if (foto && foto instanceof File) {
        try {
          console.log('Uploading image:', foto.name);
          const blob = await put(foto.name, foto, {
            access: 'public',
          });
          fotoUrl = blob.url;
          console.log('Image uploaded successfully:', fotoUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
        }
      } else {
        console.log('No image file received');
      }
  
      const { rows } = await query(
        'INSERT INTO productos (nombre, precio, cantidad, foto) VALUES (?, ?, ?, ?)',
        [nombre, Number(precio), Number(cantidad), fotoUrl]
      );
      
      // Convertir el resultado para obtener el insertId
      const insertId = (rows as unknown as ResultSetHeader).insertId;
  
      console.log('Product inserted:', insertId);
  
      return NextResponse.json({
        id: insertId,
        nombre,
        precio: Number(precio),
        cantidad: Number(cantidad),
        foto: fotoUrl
      });
    } catch (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
  
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  
    try {
      const decoded = verifyToken(token);
      
      if (!decoded || typeof decoded !== 'object' || !('id' in decoded)) {
        throw new Error('Token inválido');
      }
  
      const { rows } = await query('SELECT * FROM productos');
      const productos = rows as Producto[];
      
      return NextResponse.json(productos);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
    }
}