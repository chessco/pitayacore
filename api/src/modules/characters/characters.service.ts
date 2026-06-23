import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';

@Injectable()
export class CharactersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageProvider: R2StorageProvider,
  ) {}

  async findAll(tenantId: string) {
    const characters = await this.db.mysql.character.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return characters.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      industry: '', // No industry field in PitayaCore
      avatarUrl: c.avatar || '',
    }));
  }

  async create(tenantId: string, data: any, file?: Express.Multer.File) {
    let avatarUrl = '';

    if (file) {
      avatarUrl = await this.storageProvider.uploadFile(
        file.originalname,
        file.buffer,
        file.mimetype,
      );
    }

    return this.db.mysql.character.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: data.description,
        systemPrompt: data.systemPrompt || '',
        avatar: avatarUrl,
        status: 'ACTIVE',
      },
    });
  }

  async delete(tenantId: string, id: string) {
    return this.db.mysql.character.delete({
      where: { id, tenantId },
    });
  }
}
