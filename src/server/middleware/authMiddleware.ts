import { NextFunction, Request, Response } from 'express';
import { AuthService, AuthTokenPayload } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { UserRole } from '../../shared/types.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

const authService = new AuthService(new UserRepository());

export function requireAuth(roles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    let token = req.cookies?.auth_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Acceso no autorizado. Por favor inicia sesión.' });
      return;
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, message: 'Sesión expirada o inválida. Inicia sesión nuevamente.' });
      return;
    }

    if (roles && roles.length > 0) {
      if (!roles.includes(payload.role) && payload.role !== 'SUPERADMIN') {
        res.status(403).json({ success: false, message: 'No cuentas con los permisos suficientes para esta acción.' });
        return;
      }
    }

    req.user = payload;
    next();
  };
}
