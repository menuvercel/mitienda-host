// db.ts
import mysql, { RowDataPacket, FieldPacket, ResultSetHeader } from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10
});

// Modificamos la función query para aceptar cualquier tipo de resultado
export async function query<T extends RowDataPacket[] | ResultSetHeader[]>(
  text: string, 
  params?: any[]
) {
  try {
    console.log('Executing query:', text, 'with params:', params);
    const [rows, fields]: [T, FieldPacket[]] = await pool.execute<T>(text, params);
    console.log('Query result:', rows);
    return { rows, fields };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Función específica para consultas que devuelven ResultSetHeader
export async function executeUpdate(
  text: string, 
  params?: any[]
): Promise<{ result: ResultSetHeader, fields: FieldPacket[] }> {
  try {
    console.log('Executing update:', text, 'with params:', params);
    const [result, fields] = await pool.execute<ResultSetHeader>(text, params);
    console.log('Update result:', result);
    return { result, fields };
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
}