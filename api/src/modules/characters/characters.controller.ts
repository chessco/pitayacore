import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CharactersService } from './characters.service';

@Controller('api/tenants/:tenantId/characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.charactersService.findAll(tenantId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  create(
    @Param('tenantId') tenantId: string,
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.charactersService.create(tenantId, data, file);
  }

  @Delete(':id')
  delete(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.charactersService.delete(tenantId, id);
  }

  @Post(':id/train-lora')
  trainLora(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { imageUrls: string[] },
  ) {
    return this.charactersService.trainLora(tenantId, id, body.imageUrls);
  }
}
