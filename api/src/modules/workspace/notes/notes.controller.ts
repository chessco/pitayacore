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
import { CreateNoteDto, UpdateNoteDto, VoteNoteDto } from './dto/notes.dto';
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
  findAll(@Request() req: any) {
    const tenantId = getTenantId();
    const userId = req.user?.id;
    return this.notesService.findAll(tenantId, userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = getTenantId();
    const userId = req.user?.id;
    return this.notesService.findOne(tenantId, id, userId);
  }

  @Post(':id/vote')
  vote(
    @Request() req: any,
    @Param('id') id: string,
    @Body() voteDto: VoteNoteDto,
  ) {
    const tenantId = getTenantId();
    const userId = req.user.id;
    return this.notesService.vote(tenantId, id, userId, voteDto.value);
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
