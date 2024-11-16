import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Usuario extends RowDataPacket {
  id: number;
  nombre: string;
  telefono: string;
  rol: string;
}

export async function GET(request: NextRequest) {
  console.log('Iniciando solicitud GET /api/users/me');
  const token = request.cookies.get('token')?.value;
  console.log('Token obtenido:', token ? 'Presente' : 'Ausente');

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    console.log('Intentando verificar token');
    const decoded = verifyToken(token);
    console.log('Token verificado:', decoded);

    if (!decoded || typeof decoded !== 'object' || !('id' in decoded)) {
      throw new Error('Token inválido');
    }

    console.log('Intentando obtener usuario de la base de datos');
    const { rows } = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE id = ?', [decoded.id]);
    const user = (rows as Usuario[])[0];
    console.log('Usuario obtenido:', user);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      id: user.id.toString()
    });
  } catch (error) {
    console.error('Error detallado:', error);
    if (error instanceof Error && error.message === 'Token inválido') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener la información del usuario' }, { status: 500 });
  }
}