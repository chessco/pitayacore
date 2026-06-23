import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Controller('corrections')
export class CorrectionsController {
  private readonly logger = new Logger(CorrectionsController.name);

  constructor(private db: DatabaseService) {}

  @Get()
  async findAll(@Query('tenantId') tenantIdParam?: string) {
    const tenantId = tenantIdParam || getTenantId();
    return this.db.mysql.humanCorrection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(
    @Body() data: { trigger: string; response: string; tenantId?: string },
  ) {
    const tenantId = data.tenantId || getTenantId();
    return this.db.mysql.humanCorrection.create({
      data: {
        tenantId,
        trigger: data.trigger,
        response: data.response,
      },
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { trigger?: string; response?: string; isActive?: boolean },
  ) {
    return this.db.mysql.humanCorrection.update({
      where: { id },
      data,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.db.mysql.humanCorrection.delete({
      where: { id },
    });
  }
}
