import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

@Injectable()
export class CharactersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageProvider: R2StorageProvider,
    private readonly falProvider: FalProvider,
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

  async trainLora(
    tenantId: string,
    characterId: string,
    imageUrls: string[], // First element should be the URL to a ZIP archive of training images
  ) {
    const character = await this.db.mysql.character.findFirst({
      where: { id: characterId, tenantId },
    });

    if (!character) throw new NotFoundException('Character not found');

    const triggerWord = character.slug.replace(/-/g, '_');

    const { loraPath, loraId } = await this.falProvider.trainLora({
      triggerWord,
      imageUrls,
    });

    // Store the LoRA as an Asset of type LORA
    const loraAsset = await this.db.mysql.asset.create({
      data: {
        tenantId,
        name: `${character.name} LoRA`,
        type: 'LORA',
        storageProvider: 'FAL',
        storagePath: loraPath,
        metadata: JSON.stringify({
          characterId,
          triggerWord,
          loraId,
        }),
      },
    });

    // Link the LoRA back to the character
    await this.db.mysql.character.update({
      where: { id: characterId },
      data: { loraId: loraAsset.id },
    });

    return {
      characterId,
      loraAssetId: loraAsset.id,
      loraPath,
      triggerWord,
    };
  }
}
