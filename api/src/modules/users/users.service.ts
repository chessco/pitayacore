import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findAll(requesterRole: string, requesterTenantId: string, targetTenantId?: string) {
    // System role can see all or specific tenant
    if (requesterRole.toUpperCase() === 'SYSTEM') {
      return this.db.mysql.user.findMany({
        where: targetTenantId ? { tenantId: targetTenantId } : {},
        include: { tenant: { select: { name: true } } }
      });
    }

    // Admin can only see their own tenant
    if (requesterRole.toUpperCase() === 'ADMIN') {
      return this.db.mysql.user.findMany({
        where: { tenantId: requesterTenantId },
        include: { tenant: { select: { name: true } } }
      });
    }

    throw new ForbiddenException(`No tienes permisos para ver usuarios. (Rol: ${requesterRole})`);
  }

  async create(requesterRole: string, requesterTenantId: string, data: any) {
    const tenantId = requesterRole.toUpperCase() === 'SYSTEM' ? data.tenantId : requesterTenantId;
    
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID es requerido.');
    }

    if (data.email) {
      data.email = data.email.trim().toLowerCase();
    }

    const result = await this.db.mysql.user.create({
      data: {
        ...data,
        tenantId,
        password: data.password || 'pitayacore123', // Default password if not provided
      }
    });

    await this.db.logAction({
      tenantId,
      userId: data.email,
      action: 'CREATE',
      entity: 'USER',
      entityId: result.id,
      changes: { name: result.name, role: result.role }
    });

    return result;
  }

  async update(requesterRole: string, requesterTenantId: string, id: string, data: any) {
    const user = await this.db.mysql.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (requesterRole.toUpperCase() !== 'SYSTEM' && user.tenantId !== requesterTenantId) {
      throw new ForbiddenException('No puedes modificar usuarios de otros inquilinos.');
    }

    const updateData = { ...data };
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    // Only update password if a new one is provided
    if (!updateData.password || updateData.password === '') {
      delete updateData.password;
    }

    const result = await this.db.mysql.user.update({
      where: { id },
      data: updateData
    });

    await this.db.logAction({
      tenantId: result.tenantId,
      userId: result.email,
      action: 'UPDATE',
      entity: 'USER',
      entityId: result.id,
      changes: updateData
    });

    return result;
  }

  async delete(requesterRole: string, requesterTenantId: string, id: string) {
    const user = await this.db.mysql.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (requesterRole.toUpperCase() !== 'SYSTEM' && user.tenantId !== requesterTenantId) {
      throw new ForbiddenException('No puedes eliminar usuarios de otros inquilinos.');
    }

    const result = await this.db.mysql.user.delete({ where: { id } });

    await this.db.logAction({
      tenantId: result.tenantId,
      userId: result.email,
      action: 'DELETE',
      entity: 'USER',
      entityId: id,
      changes: { name: result.name }
    });

    return result;
  }
}
