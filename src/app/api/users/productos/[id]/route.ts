import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface ProductRow extends RowDataPacket {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  foto: string;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const { rows } = await query<ProductRow[]>(
      `SELECT p.id, p.nombre, p.precio, p.foto, up.cantidad
       FROM productos p
       JOIN usuario_productos up ON p.id = up.producto_id
       WHERE up.usuario_id = ?`,
      [id]
    );

    console.log('Productos obtenidos para el vendedor:', rows);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}