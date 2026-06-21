import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { AiService } from '../../ai/ai.service';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/ideas.dto';

@Injectable()
export class IdeasService {
  constructor(
    private readonly db: DatabaseService,
    private readonly aiService: AiService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateIdeaDto) {
    const idea = await this.db.mysql.workspaceIdea.create({
      data: {
        ...dto,
        tenantId,
        createdBy: userId,
      },
    });

    // TODO: Emit WorkspaceIdeaCreated event
    // TODO: Trigger embeddings generation

    return idea;
  }

  async findAll(tenantId: string) {
    return this.db.mysql.workspaceIdea.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const idea = await this.db.mysql.workspaceIdea.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!idea) throw new NotFoundException('Idea not found');
    return idea;
  }

  async update(tenantId: string, id: string, dto: UpdateIdeaDto) {
    const idea = await this.findOne(tenantId, id);
    const updated = await this.db.mysql.workspaceIdea.update({
      where: { id },
      data: dto,
    });

    // TODO: Emit WorkspaceIdeaUpdated event

    return updated;
  }

  async remove(tenantId: string, id: string) {
    return this.db.mysql.workspaceIdea.updateMany({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  async generateWithAI(tenantId: string, prompt: string) {
    const systemPrompt = `
Eres el Asistente Creativo de PitayaCore AI.
Tu objetivo es generar ideas de proyectos, funcionalidades, aplicaciones o iniciativas de negocio basadas en el siguiente tema proporcionado por el usuario: "${prompt || 'Ideas innovadoras al azar'}".

INSTRUCCIONES IMPORTANTES:
1. Genera exactamente entre 3 y 5 ideas.
2. Cada idea debe ser accionable y realista.
3. Devuelve ÚNICAMENTE un arreglo JSON válido sin bloques de código Markdown (\`\`\`), con la siguiente estructura estricta:
[
  {
    "title": "Nombre corto y atractivo",
    "description": "Descripción detallada de la idea (1 a 2 párrafos).",
    "category": "Categoría (Ej. Aplicación, Funcionalidad, Proyecto Personal)",
    "priority": "ALTA", // Solo puede ser: "ALTA", "MEDIA", "BAJA"
  }
]
`;

    const rawResponse = await this.aiService.generateRaw(systemPrompt);
    
    try {
      // Intentar extraer el JSON si la IA devuelve texto alrededor
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;
      const ideas = JSON.parse(cleanJson);
      return ideas;
    } catch (e) {
      console.error('Error parsing AI ideas:', e, 'Raw:', rawResponse);
      throw new Error('No se pudieron generar las ideas en el formato correcto. Intenta de nuevo.');
    }
  }
}
