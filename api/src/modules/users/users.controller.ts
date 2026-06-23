import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Headers('x-user-role') role: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('tenantId') targetTenantId?: string,
  ) {
    if (!role) throw new ForbiddenException('Rol no identificado');
    return this.usersService.findAll(role, tenantId, targetTenantId);
  }

  @Post()
  async create(
    @Headers('x-user-role') role: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.usersService.create(role, tenantId, data);
  }

  @Patch(':id')
  async update(
    @Headers('x-user-role') role: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.usersService.update(role, tenantId, id, data);
  }

  @Delete(':id')
  async remove(
    @Headers('x-user-role') role: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.delete(role, tenantId, id);
  }
}
