import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DatabaseService } from '../../common/database/database.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    private db: DatabaseService,
    private kbService: KnowledgeBaseService,
  ) {}

  @Get()
  async list() {
    const tenantId = getTenantId();
    return this.db.mysql.knowledgeBase.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Post()
  async create(@Body() body: { title: string; content: string }) {
    return this.kbService.addEntry(body.content, body.title);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const content = await this.kbService.extractTextFromPdf(file.buffer);
    const title = file.originalname.replace('.pdf', '');
    return this.kbService.addEntry(content, title);
  }

  @Post('generate')
  async generateContent(@Body() body: { title: string; isCopilot?: boolean }) {
    let prompt = `Actúa como un experto en acuicultura. Genera un documento técnico detallado en formato Markdown sobre: "${body.title}". 
    Incluye secciones como: Introducción, Procedimientos Estándar (SOP), Parámetros Críticos y Conclusión. 
    Usa un tono profesional y técnico.`;

    if (body.isCopilot) {
      prompt = `Actúa como un Arquitecto de Conocimiento Senior especializado en certificaciones ASC y BAP. 
      Genera un Protocolo Operativo Maestro en Markdown sobre: "${body.title}". 
      REGLAS CRÍTICAS:
      1. Alineación estricta con normativas ASC/BAP.
      2. Incluye tablas de monitoreo técnico sugeridas.
      3. Define KPIs de éxito biológico.
      4. Estructura: Resumen Ejecutivo, Marco Normativo, Ejecución Técnica, Mitigación de Riesgos y Control de Calidad.
      Usa un lenguaje extremadamente técnico y profesional.`;
    }

    const content = await this.kbService.generateWithAi(prompt);
    return { content };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.kbService.deleteDocument(id);
  }

  @Post(':id/reindex')
  async reindex(@Param('id') id: string) {
    await this.kbService.reindexDocument(id);
    return { status: 'success', message: 'Document reindexed' };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    const doc = await this.db.mysql.knowledgeBase.findFirst({
      where: {
        id,
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        chunks: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!doc) return null;

    // Fetch vectors from PostgreSQL with explicit casting
    const vectors: any[] = await this.db.postgres.$queryRawUnsafe(
      `SELECT "id", "content", CAST("embedding" AS TEXT) as "embedding" 
       FROM "VectorRecord" 
       WHERE "refId" = '${id}'`,
    );

    console.log(`Fetched ${vectors.length} vectors for doc ${id}`);

    return {
      ...doc,
      vectors: vectors.map((v) => ({
        ...v,
        embedding: v.embedding || 'Vector no disponible',
      })),
    };
  }

  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string) {
    try {
      return await this.kbService.toggleStatus(id);
    } catch (error) {
      console.error('Error in toggleStatus:', error);
      throw new Error(error.message);
    }
  }
}
