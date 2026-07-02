import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('workspace/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'public', 'uploads');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  create(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    const tenantId = getTenantId();
    const userId = req.user.id;

    // Populate DTO fields from the uploaded file metadata
    const finalDto = {
      ...createDocumentDto,
      title: createDocumentDto.title || file.originalname,
      filePath: `/static/uploads/${file.filename}`,
      fileType: file.mimetype,
    };

    return this.documentsService.create(tenantId, userId, finalDto);
  }

  @Get()
  findAll() {
    const tenantId = getTenantId();
    return this.documentsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.documentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const tenantId = getTenantId();
    return this.documentsService.update(tenantId, id, updateDocumentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.documentsService.remove(tenantId, id);
  }
}
