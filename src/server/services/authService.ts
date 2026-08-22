import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/interfaces.js';
import { User, UserRole } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'elections_super_secret_jwt_key_2026';
const TOKEN_EXPIRY = '8h';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  fullName: string;
}

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async authenticate(username: string, password: string): Promise<{ user: User; token: string } | null> {
    const userWithHash = await this.userRepo.findByUsername(username);
    if (!userWithHash) {
      return null;
    }

    if (userWithHash.is_active !== 1) {
      throw new Error('Usuario deshabilitado en el sistema.');
    }

    const isValid = await bcrypt.compare(password, userWithHash.password_hash);
    if (!isValid) {
      return null;
    }

    const payload: AuthTokenPayload = {
      userId: userWithHash.id,
      username: userWithHash.username,
      role: userWithHash.role,
      fullName: userWithHash.full_name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    // Remove password_hash from return
    const { password_hash, ...user } = userWithHash;
    return { user, token };
  }

  verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) return false;
    
    // We need to get the user with the hash
    const userWithHash = await this.userRepo.findByUsername(user.username);
    if (!userWithHash) return false;

    const isValid = await bcrypt.compare(oldPassword, userWithHash.password_hash);
    if (!isValid) return false;

    const newHash = await this.hashPassword(newPassword);
    await this.userRepo.update(userId, { password_hash: newHash });
    
    return true;
  }
}
