import { Controller, Get, Post } from '@nestjs/common';
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

  @Post('seed')
  seed() {
    return this.identityService.seed();
  }
}
