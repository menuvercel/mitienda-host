import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || decoded.rol !== 'Almacen') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, password, telefono, rol } = body;

  try {
    const { rows } = await query(
      'INSERT INTO usuarios (nombre, password, telefono, rol) VALUES (?, ?, ?, ?)',
      [nombre, password, telefono, rol]
    );
    
    // Usar una aserción de tipo para acceder a insertId
    const insertId = (rows as any as ResultSetHeader).insertId;

    return NextResponse.json({
      id: insertId.toString(),
      nombre,
      telefono,
      rol
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}