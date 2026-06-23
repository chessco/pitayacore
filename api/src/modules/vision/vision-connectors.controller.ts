import { Controller, Post, Body, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';
import { VisionConnectorsService } from './vision-connectors.service';

@Controller('tenants/:tenantId/vision/connectors')
@UseGuards(TenantOwnershipGuard)
export class VisionConnectorsController {
  constructor(private readonly connectorsService: VisionConnectorsService) {}

  @Post('generate')
  async generateFromConnector(
    @Param('tenantId') tenantId: string,
    @Body() body: { verticalId: string; inputData: any }
  ) {
    if (!body.verticalId || !body.inputData) {
      throw new HttpException('verticalId and inputData are required', HttpStatus.BAD_REQUEST);
    }
    
    return this.connectorsService.generateFromConnector(tenantId, body.verticalId, body.inputData);
  }
}
