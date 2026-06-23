import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../common/database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  async login(email: string, password?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    // Find user in DB (flexible search)
    const user = await this.db.mysql.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
        },
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Use bcrypt to compare password
    if (password) {
      if (!user.password) {
        throw new UnauthorizedException(
          'El usuario no tiene una contraseña configurada',
        );
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
    }

    // Default permissions mapping if not set in DB
    const defaultPermissions = {
      menus:
        user.role === 'SYSTEM'
          ? [
              'dashboard',
              'conversations',
              'hitl',
              'agents',
              'skills',
              'kb',
              'corrections',
              'tenants',
              'infra',
              'logs',
            ]
          : user.role === 'ADMIN'
            ? [
                'dashboard',
                'conversations',
                'users',
                'hitl',
                'corrections',
                'kb',
                'capsules',
                'agents',
                'skills',
                'predictive',
                'protocols',
                'vision',
                'analytics',
                'settings',
              ]
            : ['dashboard', 'conversations', 'settings'],
      actions:
        user.role === 'SYSTEM' || user.role === 'ADMIN' ? ['all'] : ['read'],
    };

    const permissions = user.permissions || defaultPermissions;

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        permissions: permissions,
      },
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (e) {
      return null;
    }
  }
}
