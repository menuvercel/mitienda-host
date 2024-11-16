import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import sharp from 'sharp';
import { query } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

// Asegúrate de que esta ruta sea correcta y accesible
const UPLOAD_DIR = '/public/fotos';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const productoId = formData.get('productoId') as string;

  if (!file || !productoId) {
    return NextResponse.json({ error: 'No se proporcionó archivo o ID de producto' }, { status: 400 });
  }

  try {
    // Convertir el archivo a un buffer
    const buffer = await file.arrayBuffer();

    // Procesar la imagen con sharp
    const processedImageBuffer = await sharp(buffer)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Generar un nombre único para el archivo
    const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}.webp`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Guardar el archivo en el servidor
    await fs.writeFile(filePath, processedImageBuffer);

    // Construir la URL relativa de la imagen
    const imageUrl = `/uploads/${fileName}`;

    // Actualizar la columna 'foto' en la tabla de productos
    await query(
      'UPDATE productos SET foto = ? WHERE id = ?',
      [imageUrl, productoId]
    );

    return NextResponse.json({ 
      url: imageUrl,
      name: fileName
    });
  } catch (error) {
    console.error('Error al procesar o subir el archivo:', error);
    return NextResponse.json({ error: 'Error al procesar o subir el archivo' }, { status: 500 });
  }
}