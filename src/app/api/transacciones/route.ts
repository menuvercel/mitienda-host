import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ProductRow extends RowDataPacket {
  precio: number;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;
    if (!decoded || decoded.rol !== 'Almacen') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, vendedorId, cantidad, tipo } = body;
    console.log('Datos de transacción recibidos:', { productoId, vendedorId, cantidad, tipo });

    if (!productoId || !vendedorId || !cantidad || !tipo) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Iniciar una transacción
    await query('START TRANSACTION');

    try {
      // Insertar en la tabla transacciones
      const transactionResult = await query(
        'INSERT INTO transacciones (producto, cantidad, tipo, desde, hacia, fecha) VALUES (?, ?, ?, ?, ?, ?)',
        [productoId, cantidad, tipo, decoded.id, vendedorId, new Date()]
      );
    
      // Obtener el precio del producto
      const { rows: productRows } = await query<ProductRow[]>(
        'SELECT precio FROM productos WHERE id = ?',
        [productoId]
      );
      
      if (!productRows.length) {
        throw new Error('No se pudo obtener el precio del producto');
      }
      
      const productPrice = productRows[0].precio;
    
      // Actualizar la tabla productos
      const updateProductResult = await query(
        'UPDATE productos SET cantidad = cantidad - ? WHERE id = ?',
        [cantidad, productoId]
      );
    
      // Insertar o actualizar la tabla usuario_productos
      const upsertResult = await query(
        `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad, precio) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         cantidad = cantidad + VALUES(cantidad),
         precio = VALUES(precio)`,
        [vendedorId, productoId, cantidad, productPrice]
      );
    
      // Confirmar la transacción
      await query('COMMIT');
    
      return NextResponse.json({ message: 'Producto entregado exitosamente', transaction: transactionResult });
    } catch (error) {
      // Revertir la transacción si hay un error
      await query('ROLLBACK');
      console.error('Error durante la transacción:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error al entregar producto:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Error al entregar producto', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Error desconocido al entregar producto' }, { status: 500 });
    }
  }
}

interface TransactionRow extends RowDataPacket {
  id: number;
  producto: string;
  cantidad: number;
  tipo: string;
  fecha: Date;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const productoId = searchParams.get('productoId');

    if (!vendedorId && !productoId) {
      return NextResponse.json({ error: 'Se requiere el ID del vendedor o el ID del producto' }, { status: 400 });
    }

    let result;
    if (productoId) {
      const { rows } = await query<TransactionRow[]>(
        `SELECT t.id, p.nombre as producto, t.cantidad, t.tipo, t.fecha
         FROM transacciones t 
         JOIN productos p ON t.producto = p.id 
         WHERE t.producto = ?
         ORDER BY t.fecha DESC`,
        [productoId]
      );
      result = rows;
    } else {
      const { rows } = await query<TransactionRow[]>(
        `SELECT t.id, p.nombre as producto, t.cantidad, t.tipo, t.fecha
         FROM transacciones t 
         JOIN productos p ON t.producto = p.id 
         WHERE t.tipo = ?
         ORDER BY t.fecha DESC`,
        [vendedorId]
      );
      result = rows;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}