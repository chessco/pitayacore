import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class AIService {
  constructor(
    private readonly db: DatabaseService,
    private readonly aiService: AiService,
  ) {}

  async ask(tenantId: string, userId: string, question: string) {
    // 1. Fetch workspace assistant agent
    const agent = await this.db.mysql.agent.findFirst({
      where: {
        slug: 'workspace-assistant',
        tenantId,
        isActive: true,
      },
    });

    const basePrompt =
      agent?.prompt ||
      'Eres el Asistente de Workspace de PitayaCore AI. Tu función es analizar notas, documentos e ideas del Workspace para responder preguntas, resumir información y extraer conocimiento clave de forma proactiva. Responde siempre en español y mantén un tono profesional.';

    // 2. Fetch workspace items
    const [notes, documents, ideas] = await Promise.all([
      this.db.mysql.workspaceNote.findMany({
        where: { tenantId, deletedAt: null },
        select: { title: true, content: true },
      }),
      this.db.mysql.workspaceDocument.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          title: true,
          description: true,
          filePath: true,
          fileType: true,
        },
      }),
      this.db.mysql.workspaceIdea.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          title: true,
          description: true,
          status: true,
          priority: true,
          category: true,
        },
      }),
    ]);

    // 3. Construct Context Block
    let context = '\n\nAquí está la información registrada en el Workspace:\n';

    if (notes.length > 0) {
      context += '\n--- NOTAS ---\n';
      notes.forEach((n, i) => {
        context += `${i + 1}. Título: ${n.title}\nContenido: ${n.content}\n\n`;
      });
    }

    if (documents.length > 0) {
      context += '\n--- DOCUMENTOS ---\n';
      documents.forEach((d, i) => {
        context += `${i + 1}. Título: ${d.title}\nDescripción: ${d.description || 'Sin descripción'}\nUbicación: ${d.filePath}\nTipo: ${d.fileType}\n\n`;
      });
    }

    if (ideas.length > 0) {
      context += '\n--- IDEAS / INICIATIVAS ---\n';
      ideas.forEach((id, i) => {
        context += `${i + 1}. Título: ${id.title}\nDescripción: ${id.description || 'Sin descripción'}\nEstado: ${id.status}\nPrioridad: ${id.priority || 'No asignada'}\nCategoría: ${id.category || 'Sin categoría'}\n\n`;
      });
    }

    if (notes.length === 0 && documents.length === 0 && ideas.length === 0) {
      context +=
        '\nEl workspace está actualmente vacío. No hay notas, documentos ni ideas guardadas por el usuario.';
    }

    const fullInstruction = `${basePrompt}\n${context}`;

    // 4. Generate Response from Gemini via AiService
    try {
      const response = await this.aiService.generateResponse(
        question,
        [], // history
        undefined, // default model
        fullInstruction,
        'web', // channel
      );

      return {
        answer: response.content,
        sources: [
          ...notes.map((n) => ({ type: 'note', title: n.title })),
          ...documents.map((d) => ({ type: 'document', title: d.title })),
        ],
      };
    } catch (error) {
      console.error('Error generating AI response in Workspace:', error);
      return {
        answer:
          'Lo siento, en este momento no puedo procesar tu solicitud debido a una falla técnica de conexión.',
        sources: [],
      };
    }
  }

  async generateEmbeddings(
    tenantId: string,
    content: string,
    refId: string,
    refType: string,
  ) {
    // Save to VectorRecord in Postgres using raw queries or Prisma extension
    try {
      const embedding = await this.aiService.getEmbedding(content);

      // VectorRecord model represents standard pgvector record
      // We can insert this using PGVector or SQL query in postgres connection
      const embeddingString = `[${embedding.join(',')}]`;

      await this.db.postgres.$executeRawUnsafe(
        `INSERT INTO "VectorRecord" ("id", "tenantId", "content", "embedding", "refId", "refType", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4::vector, $5, $6, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "content" = $3, "embedding" = $4::vector, "updatedAt" = NOW()`,
        `${refType}-${refId}`,
        tenantId,
        content,
        embeddingString,
        refId,
        refType,
      );
    } catch (e) {
      console.error(
        'Failed to generate and save embeddings to pgvector:',
        e.message,
      );
    }
  }
}
