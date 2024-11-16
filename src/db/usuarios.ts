import { query } from '@/lib/db';
import { IUsuario } from '@/models/Usuario';

export async function createUsuario(usuario: Partial<IUsuario>): Promise<IUsuario> {
  const { nombre, password, telefono, rol } = usuario;
  const result = await query(
    'INSERT INTO usuarios (nombre, password, telefono, rol) VALUES ($1, $2, $3, $4) RETURNING *',
    [nombre, password, telefono, rol]
  );
  return result.rows[0];
}

export async function findUsuarioById(id: string): Promise<IUsuario | null> {
  const result = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function findUsuarioByNombre(nombre: string): Promise<IUsuario | null> {
  const result = await query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
  return result.rows[0] || null;
}

export async function getVendedores(): Promise<Partial<IUsuario>[]> {
  const result = await query('SELECT id, nombre, telefono, rol FROM usuarios WHERE rol = $1', ['Vendedor']);
  return result.rows;
}

export async function updateUsuarioProducto(
  usuarioId: string,
  productoId: string,
  cantidad: number,
  precio: number
): Promise<IUsuario | null> {
  const result = await query(
    `INSERT INTO usuario_productos (usuario_id, producto_id, cantidad, precio)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id, producto_id)
     DO UPDATE SET cantidad = usuario_productos.cantidad + $3, precio = $4
     RETURNING *`,
    [usuarioId, productoId, cantidad, precio]
  );
  return result.rows[0];
}

export async function getUsuarioProductos(usuarioId: string): Promise<Array<{ producto: string; cantidad: number; precio: number }>> {
  const result = await query(
    `SELECT p.id as producto, up.cantidad, up.precio
     FROM usuario_productos up
     JOIN productos p ON up.producto_id = p.id
     WHERE up.usuario_id = $1`,
    [usuarioId]
  );
  return result.rows;
}