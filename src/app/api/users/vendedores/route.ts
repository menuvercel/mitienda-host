import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = ?', ['Vendedor']);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener vendedores:', error);
    return NextResponse.json({ error: 'Error al obtener vendedores' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded || (decoded as { rol: string }).rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
  }

  const { nombre, telefono } = await request.json();

  try {
    const result = await query(
      'UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?',
      [nombre, telefono, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const [updatedUser] = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE id = ?', [id]);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar vendedor:', error);
    return NextResponse.json({ error: 'Error al actualizar vendedor' }, { status: 500 });
  }
}