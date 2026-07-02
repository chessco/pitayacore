import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

// TODO: Import the specific auth and permissions guard for PitayaCore

@Controller('workspace/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Request() req: any, @Body() createNoteDto: CreateNoteDto) {
    const tenantId = getTenantId();
    const userId = req.user.id;
    return this.notesService.create(tenantId, userId, createNoteDto);
  }

  @Get()
  findAll() {
    const tenantId = getTenantId();
    return this.notesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.notesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    const tenantId = getTenantId();
    return this.notesService.update(tenantId, id, updateNoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.notesService.remove(tenantId, id);
  }
}
