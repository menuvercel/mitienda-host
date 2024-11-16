import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

export interface DecodedToken {
  id: string;
  rol: string;
  // Add any other properties that might be in your token
}

export interface User {
  _id: string;
  rol: string;
}

export function generateToken(user: { id: string; nombre: string; rol: string }) {
  return jwt.sign(user, SECRET_KEY, { expiresIn: '1d' });
}

export function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}