import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async findAll(tenantId: string, userId?: string) {
    const notes = await this.db.mysql.workspaceNote.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        votes: userId
          ? {
              where: { userId },
              select: { value: true },
            }
          : false,
      },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    });

    return notes.map((note: any) => {
      const userVoteRecord = note.votes?.[0];
      const { votes, ...rest } = note;
      return {
        ...rest,
        userVote: userVoteRecord ? userVoteRecord.value : 0,
      };
    });
  }

  async findOne(tenantId: string, id: string, userId?: string) {
    const note = await this.db.mysql.workspaceNote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        votes: userId
          ? {
              where: { userId },
              select: { value: true },
            }
          : false,
      },
    });
    if (!note) throw new NotFoundException('Note not found');

    const userVoteRecord = note.votes?.[0];
    const { votes, ...rest } = note;
    return {
      ...rest,
      userVote: userVoteRecord ? userVoteRecord.value : 0,
    };
  }

  async vote(tenantId: string, id: string, userId: string, value: number) {
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Vote value must be 1 or -1');
    }

    // Ensure note exists and belongs to tenant
    await this.findOne(tenantId, id);

    // Find existing vote
    const existingVote = await this.db.mysql.workspaceNoteVote.findUnique({
      where: {
        noteId_userId: {
          noteId: id,
          userId,
        },
      },
    });

    let scoreDiff = 0;

    if (existingVote) {
      if (existingVote.value === value) {
        // User voted same value again -> retract vote (unvote)
        await this.db.mysql.workspaceNoteVote.delete({
          where: { id: existingVote.id },
        });
        scoreDiff = -value;
      } else {
        // User changed vote value (e.g. +1 to -1)
        await this.db.mysql.workspaceNoteVote.update({
          where: { id: existingVote.id },
          data: { value },
        });
        scoreDiff = value - existingVote.value; // e.g. 1 - (-1) = 2, or -1 - 1 = -2
      }
    } else {
      // First time voting
      await this.db.mysql.workspaceNoteVote.create({
        data: {
          noteId: id,
          userId,
          value,
        },
      });
      scoreDiff = value;
    }

    // Update the note's total score
    const updatedNote = await this.db.mysql.workspaceNote.update({
      where: { id },
      data: {
        score: {
          increment: scoreDiff,
        },
      },
    });

    return {
      noteId: id,
      score: updatedNote.score,
      userVote: existingVote && existingVote.value === value ? 0 : value,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateNoteDto) {
    // Ensure note exists
    await this.findOne(tenantId, id);
    const updated = await this.db.mysql.workspaceNote.update({
      where: { id },
      data: dto,
    });

    // TODO: Emit WorkspaceNoteUpdated event
    // TODO: Trigger embeddings update

    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.db.mysql.workspaceNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
