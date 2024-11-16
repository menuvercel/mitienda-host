import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded || decoded.rol !== 'Vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { productoId, cantidad, fecha } = body;

  if (!productoId || !cantidad || !fecha) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  try {
    const fechaVenta = new Date(fecha);
    
    await query('START TRANSACTION');

    const productResult = await query<RowDataPacket[]>(
      'SELECT p.precio, up.cantidad as stock_vendedor FROM productos p JOIN usuario_productos up ON p.id = up.producto_id WHERE p.id = ? AND up.usuario_id = ?',
      [productoId, decoded.id]
    );

    if (!productResult.rows.length) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Producto no encontrado o no asignado al vendedor' }, { status: 404 });
    }

    const { precio: precioUnitario, stock_vendedor } = productResult.rows[0];

    if (stock_vendedor < cantidad) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    await query(
      'UPDATE usuario_productos SET cantidad = cantidad - ? WHERE producto_id = ? AND usuario_id = ?',
      [cantidad, productoId, decoded.id]
    );

    const saleResult = await query<RowDataPacket[]>(
      'INSERT INTO ventas (producto, cantidad, precio_unitario, total, vendedor, fecha) VALUES (?, ?, ?, ?, ?, ?)',
      [productoId, cantidad, precioUnitario, precioUnitario * cantidad, decoded.id, fechaVenta]
    );

    await query('COMMIT');

    const newSale = await query<RowDataPacket[]>('SELECT * FROM ventas WHERE id = ?', [saleResult.rows[0].insertId]);
    return NextResponse.json(newSale.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token) as DecodedToken | null;

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get('vendedorId');
  const productoId = searchParams.get('productoId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if ((!vendedorId && !productoId) || !startDate || !endDate) {
    return NextResponse.json({ error: 'Se requieren vendedorId o productoId, startDate y endDate' }, { status: 400 });
  }

  try {
    let result;
    if (productoId) {
      result = await query<RowDataPacket[]>(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.producto = ? AND v.fecha BETWEEN ? AND ?
         ORDER BY v.fecha DESC`,
        [productoId, startDate, endDate]
      );
    } else {
      result = await query<RowDataPacket[]>(
        `SELECT v.*, p.nombre as producto_nombre, p.foto as producto_foto, v.precio_unitario
         FROM ventas v
         JOIN productos p ON v.producto = p.id
         WHERE v.vendedor = ? AND v.fecha BETWEEN ? AND ?
         ORDER BY v.fecha DESC`,
        [vendedorId, startDate, endDate]
      );
    }
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas', details: (error as Error).message }, { status: 500 });
  }
}