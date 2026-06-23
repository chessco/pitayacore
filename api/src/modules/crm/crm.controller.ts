import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { WorkflowsService } from './workflows.service';

@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Get('forecast')
  async getForecast(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.getSalesForecast(tenantId);
  }

  @Get('contacts')
  async findAll(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.findAllContacts(tenantId);
  }

  @Get('segments')
  async getSegments(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.getSmartSegments(tenantId);
  }

  @Get('scoring')
  async getScoring(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.calculateLeadScores(tenantId);
  }

  @Post('workflows/check-stale')
  async checkStale(@Headers('x-tenant-id') tenantId: string) {
    return this.workflowsService.checkStaleDeals(tenantId);
  }

  @Get('contacts/by-email')
  async findByEmail(
    @Headers('x-tenant-id') tenantId: string,
    @Query('email') email: string,
  ) {
    return this.crmService.findByEmail(email, tenantId);
  }

  @Get('contacts/:id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.crmService.findContactById(id, tenantId);
  }

  @Post('contacts')
  async create(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.crmService.createContact(tenantId, data);
  }

  @Patch('contacts/:id')
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.updateContact(id, tenantId, data);
  }

  @Post('activities')
  async createActivity(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.createActivity(tenantId, data);
  }

  @Get('deals')
  async getDeals(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.getDeals(tenantId);
  }

  @Post('deals')
  async createDeal(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.createDeal(tenantId, data);
  }

  @Patch('deals/:id')
  async updateDeal(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.updateDeal(id, tenantId, data);
  }

  @Get('tasks')
  async getTasks(@Headers('x-tenant-id') tenantId: string) {
    return this.crmService.findAllTasks(tenantId);
  }

  @Post('tasks')
  async createTask(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.createTask(tenantId, data);
  }

  @Patch('tasks/:id')
  async updateTask(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.crmService.updateTask(id, tenantId, data);
  }
}
