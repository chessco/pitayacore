import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/ideas.dto';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

// TODO: Import the specific auth guard

@Controller('workspace/ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  create(@Request() req: any, @Body() createIdeaDto: CreateIdeaDto) {
    const tenantId = getTenantId();
    const userId = req.user.id;
    return this.ideasService.create(tenantId, userId, createIdeaDto);
  }

  @Post('generate-ai')
  generateWithAI(@Body() body: { prompt?: string }) {
    const tenantId = getTenantId();
    return this.ideasService.generateWithAI(tenantId, body.prompt || '');
  }

  @Get()
  findAll() {
    const tenantId = getTenantId();
    return this.ideasService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.ideasService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIdeaDto: UpdateIdeaDto,
  ) {
    const tenantId = getTenantId();
    return this.ideasService.update(tenantId, id, updateIdeaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.ideasService.remove(tenantId, id);
  }
}
