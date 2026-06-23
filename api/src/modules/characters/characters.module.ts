import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { DatabaseModule } from '../../common/database/database.module';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';

@Module({
  imports: [DatabaseModule],
  controllers: [CharactersController],
  providers: [CharactersService, R2StorageProvider],
})
export class CharactersModule {}
