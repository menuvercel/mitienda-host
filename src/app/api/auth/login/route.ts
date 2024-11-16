import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

// Definimos la interfaz para el usuario
interface Usuario extends RowDataPacket {
  id: number;
  nombre: string;
  password: string;
  rol: string;
}

export async function POST(request: NextRequest) {
  const { nombre, password }: { nombre: string; password: string } = await request.json();

  const { rows } = await query('SELECT * FROM usuarios WHERE nombre = ?', [nombre]);
  const user = (rows as Usuario[])[0];

  console.log('Usuario encontrado:', user); // Para depuración

  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const userForToken = {
    id: user.id.toString(),
    nombre: user.nombre,
    rol: user.rol
  };

  const token: string = generateToken(userForToken);

  const response: NextResponse = NextResponse.json({
    id: userForToken.id,
    nombre: userForToken.nombre,
    rol: userForToken.rol,
    token
  });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });

  return response;
}