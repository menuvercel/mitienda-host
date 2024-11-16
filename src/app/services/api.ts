import axios from 'axios';
import { Venta, Vendedor, Producto, Transaccion } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  nombre: string;
  rol: string;
  telefono?: string;
}

interface DeliveryItem {
  productId: string;
  vendorId: string;
  quantity: number;
}

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/users/me');
    console.log('Raw user data:', response.data);
    return {
      ...response.data,
      id: response.data.id.toString() // Ensure ID is always a string
    };
  } catch (error) {
    console.error('Error al obtener el usuario actual:', error);
    throw new Error('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
  }
};

export const login = async (nombre: string, password: string): Promise<User> => {
  try {
    const response = await api.post('/auth/login', { nombre, password });
    localStorage.setItem('token', response.data.token); // Store the token
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en la solicitud de login:', error.response?.data || error.message);
    } else {
      console.error('Error en la solicitud de login:', error);
    }
    throw new Error('Error de autenticación. Por favor, verifica tus credenciales e intenta de nuevo.');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
};

export const getVendedores = async (): Promise<Vendedor[]> => {
  const response = await api.get('/users/vendedores');
  return response.data;
};

export const getInventario = async (): Promise<Producto[]> => {
  try {
    const response = await api.get<Producto[]>('/productos');
    console.log('Raw inventory data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const response = await api.post<User>('/auth/register', userData);
  return response.data;
};

export const getProductosVendedor = async (vendedorId: string) => {
  if (!vendedorId) {
    throw new Error('ID del vendedor no proporcionado');
  }
  try {
    const response = await api.get(`/users/productos/${vendedorId}`);
    console.log('Raw API response:', response);
    console.log('Productos del vendedor:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    throw new Error('No se pudieron obtener los productos del vendedor');
  }
};

export const agregarProducto = async (formData: FormData) => {
  const response = await api.post('/productos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const editarProducto = async (id: string, formData: FormData) => {
  const response = await api.put(`/productos/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const entregarProducto = async (productoId: string, vendedorId: string, cantidad: number) => {
  const response = await api.post('/transacciones', { 
    productoId, 
    vendedorId, 
    cantidad,
    tipo: 'Entrega' // Adding the 'tipo' field
  });
  return response.data;
};

export const getTransacciones = async () => {
  const response = await api.get('/transacciones');
  return response.data;
};

export const eliminarProducto = async (productId: string) => {
  try {
    const response = await api.delete(`/productos/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const crearBajaTransaccion = async (productoId: string, vendedorId: string, cantidad: number) => {
  try {
    const response = await api.post('/transacciones', {
      productoId,
      vendedorId,
      cantidad,
      tipo: 'Baja'
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Baja transaction:', error);
    throw error;
  }
};

export const realizarVenta = async (productoId: string, cantidad: number, fecha: string) => {
  try {
    // Ajustamos la fecha para que sea a las 12:00 PM en la zona horaria local
    const fechaAjustada = new Date(fecha + 'T12:00:00');
    const fechaISO = fechaAjustada.toISOString();

    const response = await api.post('/ventas', { productoId, cantidad, fecha: fechaISO });
    return response.data;
  } catch (error) {
    console.error('Error al realizar la venta:', error);
    throw new Error('No se pudo realizar la venta');
  }
};

export const getVentasMes = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando todas las ventas para vendedor:', vendedorId);

  // Eliminamos el cálculo de fechas y los parámetros de fecha en la solicitud
  const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
  
  console.log('Respuesta de todas las ventas:', response.data);
  return response.data;
};

export const getTransaccionesVendedor = async (vendedorId: string) => {
  try {
    const response = await api.get(`/transacciones?vendedorId=${vendedorId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener transacciones del vendedor:', error);
    throw new Error('No se pudieron obtener las transacciones del vendedor');
  }
};

const handleApiError = (error: unknown, context: string) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      console.error(`Error de respuesta del servidor (${context}):`, error.response.data);
      console.error('Estado HTTP:', error.response.status);
      if (error.response.status === 403) {
        console.error(`No tienes permiso para ver estos ${context}`);
        return [];
      }
      throw new Error(`Error de autenticación: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      throw new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.');
    } else {
      console.error('Error al configurar la solicitud:', error.message);
      throw new Error('Error al intentar autenticar. Por favor, intenta de nuevo más tarde.');
    }
  } else {
    console.error('Error desconocido:', error);
    throw new Error('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
  }
};

/*estas son las funciones nuevas*/

export const reducirProductoVendedor = async (productoId: string, vendedorId: string, cantidad: number) => {
  try {
    const response = await api.put(`/productos/reducir`, { productoId, vendedorId, cantidad });
    return response.data;
  } catch (error) {
    console.error('Error al reducir la cantidad del producto:', error);
    throw new Error('No se pudo reducir la cantidad del producto');
  }
};

export const getVentasVendedor = async (vendedorId: string): Promise<Venta[]> => {
  console.log('Solicitando todas las ventas para vendedor:', vendedorId);
  try {
    const response = await api.get(`/ventas?vendedorId=${vendedorId}`);
    console.log('Respuesta de ventas:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error(`No se pudieron obtener las ventas: ${(error as Error).message}`);
  }
};


export const editarVendedor = async (vendedorId: string, editedVendor: Vendedor): Promise<void> => {
  try {
    const response = await api.put(`/users/vendedores?id=${vendedorId}`, editedVendor);
    console.log('Vendedor actualizado:', response.data);
  } catch (error) {
    console.error('Error al editar vendedor:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
    throw new Error(`No se pudo editar el vendedor: ${(error as Error).message}`);
  }
};

export default api;


/*panel individual del vendedor*/

// ... (existing imports and functions)

export const getTransaccionesProducto = async (productoId: string): Promise<Transaccion[]> => {
  try {
    const response = await api.get<Transaccion[]>(`/transacciones`, {
      params: { productoId }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las transacciones del producto:', error);
    handleApiError(error, 'transacciones del producto');
    throw new Error('No se pudieron obtener las transacciones del producto');
  }
};

export const getVentasProducto = async (productoId: string, startDate: string, endDate: string): Promise<Venta[]> => {
  try {
    const response = await api.get<Venta[]>(`/ventas`, {
      params: { productoId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener las ventas del producto:', error);
    handleApiError(error, 'ventas del producto');
    throw new Error('No se pudieron obtener las ventas del producto');
  }
};