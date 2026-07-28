import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert-rule.dto';

/** CRUD for configurable alert rules. */
@Controller('social-intelligence/alert-rules')
export class AlertRulesController {
  constructor(private readonly rules: AlertRulesService) {}

  @Post()
  create(@Body() dto: CreateAlertRuleDto) {
    return this.rules.create(getTenantId(), dto);
  }

  @Get()
  findAll() {
    return this.rules.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rules.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.rules.update(getTenantId(), id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rules.remove(getTenantId(), id);
  }
}
