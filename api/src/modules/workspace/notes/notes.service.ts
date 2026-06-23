import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';

@Injectable()
export class NotesService {
  constructor(private db: DatabaseService) {}

  async create(tenantId: string, userId: string, dto: CreateNoteDto) {
    const note = await this.db.mysql.workspaceNote.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
      },
    });

    // TODO: Emit WorkspaceNoteCreated event
    // TODO: Trigger embeddings generation

    return note;
  }

  async findAll(tenantId: string) {
    return this.db.mysql.workspaceNote.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const note = await this.db.mysql.workspaceNote.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(tenantId: string, id: string, dto: UpdateNoteDto) {
    const note = await this.findOne(tenantId, id);
    const updated = await this.db.mysql.workspaceNote.update({
      where: { id },
      data: dto,
    });

    // TODO: Emit WorkspaceNoteUpdated event
    // TODO: Trigger embeddings update

    return updated;
  }

  async remove(tenantId: string, id: string) {
    const note = await this.findOne(tenantId, id);
    return this.db.mysql.workspaceNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
