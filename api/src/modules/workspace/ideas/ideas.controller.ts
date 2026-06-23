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

// TODO: Import the specific auth guard

@Controller('workspace/ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  create(@Request() req: any, @Body() createIdeaDto: CreateIdeaDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.ideasService.create(tenantId, userId, createIdeaDto);
  }

  @Post('generate-ai')
  generateWithAI(@Request() req: any, @Body() body: { prompt?: string }) {
    const tenantId = req.user.tenantId;
    return this.ideasService.generateWithAI(tenantId, body.prompt || '');
  }

  @Get()
  findAll(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.ideasService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.ideasService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateIdeaDto: UpdateIdeaDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.ideasService.update(tenantId, id, updateIdeaDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.ideasService.remove(tenantId, id);
  }
}
