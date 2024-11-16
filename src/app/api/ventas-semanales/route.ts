import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || (decoded.rol !== 'Almacen' && decoded.rol !== 'Vendedor')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let result;
    if (decoded.rol === 'Almacen') {
      result = await query(
        `SELECT 
           DATE(DATE_SUB(fecha, INTERVAL WEEKDAY(fecha) DAY)) as week_start,
           DATE(DATE_ADD(DATE_SUB(fecha, INTERVAL WEEKDAY(fecha) DAY), INTERVAL 6 DAY)) as week_end,
           u.id as vendedor_id,
           u.nombre as vendedor_nombre,
           COALESCE(SUM(v.total), 0) as total_ventas
         FROM usuarios u
         LEFT JOIN ventas v ON v.vendedor = u.id
         WHERE u.rol = 'Vendedor'
         GROUP BY week_start, week_end, u.id, u.nombre
         ORDER BY week_start DESC, total_ventas DESC`
      );
    } else {
      result = await query(
        `SELECT 
           DATE(DATE_SUB(fecha, INTERVAL WEEKDAY(fecha) DAY)) as week_start,
           DATE(DATE_ADD(DATE_SUB(fecha, INTERVAL WEEKDAY(fecha) DAY), INTERVAL 6 DAY)) as week_end,
           ? as vendedor_id,
           ? as vendedor_nombre,
           COALESCE(SUM(total), 0) as total_ventas
         FROM ventas
         WHERE vendedor = ?
         GROUP BY week_start, week_end
         ORDER BY week_start DESC`,
        [decoded.id, decoded.rol, decoded.id]
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener ventas semanales:', error);
    return NextResponse.json({ error: 'Error al obtener ventas semanales' }, { status: 500 });
  }
}