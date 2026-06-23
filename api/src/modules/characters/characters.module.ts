import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { DatabaseModule } from '../../common/database/database.module';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [CharactersController],
  providers: [CharactersService, R2StorageProvider, FalProvider],
})
export class CharactersModule {}
