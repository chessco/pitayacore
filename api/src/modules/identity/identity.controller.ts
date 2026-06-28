import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import { Public } from '../../common/guards/public.decorator';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('status')
  getStatus() {
    return this.identityService.getStatus();
  }

  @Get('roles')
  getRoles() {
    return this.identityService.getRoles();
  }

  @Get('permissions')
  getPermissions() {
    return this.identityService.getPermissions();
  }

  @Get('user-roles')
  getUserRoles() {
    return this.identityService.getUserRoles();
  }

  @Get('vertical-roles')
  getVerticalRoles() {
    return this.identityService.getVerticalRoles();
  }

  @Get('user-contexts')
  getUserContexts() {
    return this.identityService.getUserContexts();
  }

  @Get('features')
  getFeatures() {
    return this.identityService.getFeatures();
  }

  // --- Roles ---
  @Post('roles')
  createRole(@Body() data: any) {
    return this.identityService.createRole(data);
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() data: any) {
    return this.identityService.updateRole(id, data);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.identityService.deleteRole(id);
  }

  // --- Permissions ---
  @Post('permissions')
  createPermission(@Body() data: any) {
    return this.identityService.createPermission(data);
  }

  @Put('permissions/:id')
  updatePermission(@Param('id') id: string, @Body() data: any) {
    return this.identityService.updatePermission(id, data);
  }

  @Delete('permissions/:id')
  deletePermission(@Param('id') id: string) {
    return this.identityService.deletePermission(id);
  }

  // --- UserContexts ---
  @Post('user-contexts')
  createUserContext(@Body() data: any) {
    return this.identityService.createUserContext(data);
  }

  @Put('user-contexts/:id')
  updateUserContext(@Param('id') id: string, @Body() data: any) {
    return this.identityService.updateUserContext(id, data);
  }

  @Delete('user-contexts/:id')
  deleteUserContext(@Param('id') id: string) {
    return this.identityService.deleteUserContext(id);
  }

  // --- VerticalRoles ---
  @Post('vertical-roles')
  createVerticalRole(@Body() data: any) {
    return this.identityService.createVerticalRole(data);
  }

  @Delete('vertical-roles/:id')
  deleteVerticalRole(@Param('id') id: string) {
    return this.identityService.deleteVerticalRole(id);
  }

  @Post('seed')
  seed() {
    return this.identityService.seed();
  }
}
