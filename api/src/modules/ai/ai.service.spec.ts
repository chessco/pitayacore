import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiService } from './ai.service';
import { DatabaseService } from '../../common/database/database.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

jest.mock('../../common/tenant/tenant.middleware', () => ({
  getTenantId: jest.fn(() => 'tenant-cared'),
}));

describe('AiService - Tool Calling & Callbacks', () => {
  let service: AiService;
  let dbService: any;
  let configService: any;
  let systemSettingsService: any;
  let axiosPostSpy: jest.SpyInstance;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'FREELLMAPI_URL') return 'http://llm.pitayacode.io/v1';
        return '';
      }),
    };

    dbService = {
      mysql: {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-cared',
            name: 'Cared',
            aiConfig: {
              provider: 'freellmapi',
              model: 'auto',
              freellmUrl: 'http://llm.pitayacode.io/v1',
              toolCallbackHosts: ['api.luxuryos.com', 'luxuryos-internal:3000'],
            },
          }),
        },
        aiCostLog: {
          create: jest.fn().mockResolvedValue({ id: 'cost-1' }),
        },
        agent: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };

    systemSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        AI_PROVIDER: 'freellmapi',
        AI_MODEL: 'auto',
        FREELLMAPI_URL: 'http://llm.pitayacode.io/v1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: configService },
        { provide: DatabaseService, useValue: dbService },
        { provide: SystemSettingsService, useValue: systemSettingsService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);

    // Configurar estado activo para freellmapi
    (service as any).activeProvider = 'freellmapi';
    (service as any).freellmUrl = 'http://llm.pitayacode.io/v1';

    axiosPostSpy = jest.spyOn(axios, 'post');
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        data: [
          { id: 'claude-haiku-4-5', available: true },
          { id: 'claude-sonnet-4-5', available: true },
          { id: 'gpt-oss-120b', available: true },
        ],
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Bucle con 1 tool call', () => {
    it('debería ejecutar la tool vía callback y retornar la respuesta final del LLM con usage', async () => {
      // 1ª llamada: el LLM solicita ejecutar una tool
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(url).toContain('/chat/completions');
        expect(payload.tools).toBeDefined();
        expect(payload.tools[0].function.name).toBe('consultar_saldo');
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_1',
                      type: 'function',
                      function: {
                        name: 'consultar_saldo',
                        arguments: JSON.stringify({ pacienteId: 'P123' }),
                      },
                    },
                  ],
                },
              },
            ],
            usage: { prompt_tokens: 50, completion_tokens: 15 },
          },
        };
      });

      // 2ª llamada: ejecución del callback de la tool por HTTP POST
      axiosPostSpy.mockImplementationOnce(
        async (url: string, body: any, config: any) => {
          expect(url).toBe('https://api.luxuryos.com/tools');
          expect(body).toEqual({
            name: 'consultar_saldo',
            arguments: { pacienteId: 'P123' },
          });
          expect(config.headers['Authorization']).toBe(
            'Bearer token-opaco-123',
          );
          expect(config.timeout).toBe(10000);
          return { data: { saldo: 1500, moneda: 'USD' } };
        },
      );

      // 3ª llamada: el LLM recibe el resultado de la tool y devuelve la respuesta final
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(url).toContain('/chat/completions');
        // Debe incluir el mensaje role "tool" con tool_call_id
        const toolMsg = payload.messages.find((m: any) => m.role === 'tool');
        expect(toolMsg).toBeDefined();
        expect(toolMsg.tool_call_id).toBe('call_1');
        expect(toolMsg.content).toContain('1500');

        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'El saldo del paciente es $1,500 USD.',
                },
              },
            ],
            usage: { prompt_tokens: 80, completion_tokens: 25 },
          },
        };
      });

      const response = await service.generateResponse(
        '¿Cuál es el saldo del paciente P123?',
        [],
        undefined,
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [
          {
            name: 'consultar_saldo',
            description: 'Obtiene el saldo del paciente',
            parameters: {
              type: 'object',
              properties: { pacienteId: { type: 'string' } },
            },
          },
        ],
        {
          url: 'https://api.luxuryos.com/tools',
          token: 'token-opaco-123',
        },
      );

      expect(response.content).toBe('El saldo del paciente es $1,500 USD.');
      expect(response.usage).toEqual({
        promptTokens: 130, // 50 + 80
        completionTokens: 40, // 15 + 25
        toolCalls: 1,
      });

      // Validar que se registró el costo sumando todos los tokens
      expect(dbService.mysql.aiCostLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-cared',
          tokensIn: 130,
          tokensOut: 40,
        }),
      });
    });
  });

  describe('2. Bucle con 2 tool calls', () => {
    it('debería ejecutar múltiples tools en una iteración respetando el límite', async () => {
      // LLM devuelve 2 tool calls simultáneas
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_a',
                    type: 'function',
                    function: { name: 'tool_a', arguments: '{"q":1}' },
                  },
                  {
                    id: 'call_b',
                    type: 'function',
                    function: { name: 'tool_b', arguments: '{"q":2}' },
                  },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 40, completion_tokens: 20 },
        },
      }));

      // Callbacks
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: { res: 'resultado_a' },
      }));
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: { res: 'resultado_b' },
      }));

      // Respuesta final
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Ambas herramientas ejecutadas correctamente.',
              },
            },
          ],
          usage: { prompt_tokens: 70, completion_tokens: 30 },
        },
      }));

      const response = await service.generateResponse(
        'Ejecuta dos tools',
        [],
        undefined,
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [
          { name: 'tool_a', description: 'Tool A' },
          { name: 'tool_b', description: 'Tool B' },
        ],
        { url: 'https://api.luxuryos.com/tools' },
      );

      expect(response.content).toBe(
        'Ambas herramientas ejecutadas correctamente.',
      );
      expect(response.usage?.toolCalls).toBe(2);
    });
  });

  describe('3. Límite de iteraciones (máximo 4)', () => {
    it('debería detener el bucle tras 4 iteraciones y responder con lo disponible', async () => {
      // Simular que el LLM siempre pide una tool call indefinidamente
      axiosPostSpy.mockImplementation(async (url: string) => {
        if (url.includes('/chat/completions')) {
          return {
            data: {
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Progreso parcial',
                    tool_calls: [
                      {
                        id: 'call_loop',
                        type: 'function',
                        function: { name: 'loop_tool', arguments: '{}' },
                      },
                    ],
                  },
                },
              ],
              usage: { prompt_tokens: 20, completion_tokens: 10 },
            },
          };
        }
        return { data: { step: 'ok' } };
      });

      const response = await service.generateResponse(
        'Loop infinito de tools',
        [],
        undefined,
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'loop_tool', description: 'Loop tool' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      // No debe quedar en bucle infinito y debe retornar el texto disponible
      expect(response.content).toContain('Progreso parcial');
      // Debe haber ejecutado exactamente 4 iteraciones LLM
      const llmCalls = axiosPostSpy.mock.calls.filter((c) =>
        c[0].includes('/chat/completions'),
      );
      expect(llmCalls.length).toBe(4);
    });
  });

  describe('4. Seguridad SSRF: Callback fuera de allowlist rechazado', () => {
    it('debería rechazar URLs de callback que no pertenezcan a la allowlist', async () => {
      // LLM intenta ejecutar tool hacia una URL maliciosa o no autorizada
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_ssrf',
                    type: 'function',
                    function: { name: 'malicious_tool', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        },
      }));

      // En la 2ª llamada al LLM, debe recibir el error de rechazo sin haber hecho petición al host
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        const toolMsg = payload.messages.find((m: any) => m.role === 'tool');
        expect(toolMsg.content).toContain('not allowed');
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content:
                    'No pude acceder al servicio externo por políticas de seguridad.',
                },
              },
            ],
          },
        };
      });

      const response = await service.generateResponse(
        'Ejecutar con URL no permitida',
        [],
        undefined,
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'malicious_tool', description: 'desc' }],
        { url: 'https://evil-server.com/callback' },
      );

      expect(response.content).toContain('políticas de seguridad');

      // Comprobar que NUNCA se hizo POST a evil-server.com
      const evilCalls = axiosPostSpy.mock.calls.filter((c) =>
        c[0].includes('evil-server.com'),
      );
      expect(evilCalls.length).toBe(0);
    });

    it('debería rechazar accesos a IPs de metadata (169.254.169.254)', async () => {
      const validation = await service.validateToolCallbackUrl(
        'http://169.254.169.254/latest/meta-data',
        'tenant-cared',
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('debería permitir hosts autorizados en allowlist por HTTPS', async () => {
      const validation = await service.validateToolCallbackUrl(
        'https://api.luxuryos.com/tools',
        'tenant-cared',
      );
      expect(validation.valid).toBe(true);
    });

    it('debería permitir hosts internos de red docker configurados en la allowlist', async () => {
      const validation = await service.validateToolCallbackUrl(
        'http://luxuryos-internal:3000/tools',
        'tenant-cared',
      );
      expect(validation.valid).toBe(true);
    });
  });

  describe('5. Tool que falla (manejo de errores resiliente)', () => {
    it('debería enviar mensaje de error corto al LLM sin detalles internos y permitir que continúe', async () => {
      // 1ª llamada: el LLM solicita tool
      axiosPostSpy.mockImplementationOnce(async () => ({
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_fail',
                    type: 'function',
                    function: { name: 'failing_tool', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        },
      }));

      // Callback falla con error 500 y datos sensibles internos
      axiosPostSpy.mockImplementationOnce(async () => {
        const error: any = new Error(
          'Database connection failed to 10.0.0.5:5432 with password xyz',
        );
        error.response = { status: 500 };
        throw error;
      });

      // 2ª llamada: LLM recibe mensaje corto sin filtrar secretos
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        const toolMsg = payload.messages.find((m: any) => m.role === 'tool');
        expect(toolMsg.content).toBe(
          JSON.stringify({ error: 'Tool execution failed' }),
        );
        expect(toolMsg.content).not.toContain('10.0.0.5');
        expect(toolMsg.content).not.toContain('password');

        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content:
                    'Hubo un error al ejecutar la herramienta. ¿Deseas intentar otra cosa?',
                },
              },
            ],
          },
        };
      });

      const response = await service.generateResponse(
        'Ejecutar tool con fallo',
        [],
        undefined,
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'failing_tool', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      expect(response.content).toContain(
        'Hubo un error al ejecutar la herramienta',
      );
    });
  });

  describe('6. Modelo no disponible -> fallback a modelo preferido', () => {
    it('debería reintentar con el siguiente modelo de preferencia si el primer modelo falla con 404 o unavailable', async () => {
      // 1ª llamada: el modelo solicitado falla con 404 / unavailable
      const notFoundErr: any = new Error("Model 'gemini-2.5-flash' not found");
      notFoundErr.response = {
        status: 404,
        data: { error: { message: "Model 'gemini-2.5-flash' not found" } },
      };
      axiosPostSpy.mockRejectedValueOnce(notFoundErr);

      // 2ª llamada: reintenta con el primer modelo preferido ('gpt-oss-120b') y tiene éxito
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(payload.model).toBe('gpt-oss-120b');
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Respuesta generada con modelo de respaldo exitoso.',
                },
              },
            ],
            usage: {
              prompt_tokens: 45,
              completion_tokens: 15,
            },
          },
        };
      });

      const response = await service.generateResponse(
        'Consulta con modelo no disponible',
        [],
        'gemini-2.5-flash',
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'buscar_orden', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      expect(response.content).toBe(
        'Respuesta generada con modelo de respaldo exitoso.',
      );
      expect(response.usage).toEqual({
        promptTokens: 45,
        completionTokens: 15,
        toolCalls: 0,
      });
      // Verificamos que se registraron los costos con el modelo que realmente funcionó
      expect(dbService.mysql.aiCostLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: 'gpt-oss-120b',
            tokensIn: 45,
            tokensOut: 15,
          }),
        }),
      );
    });

    it("debería reintentar cuando el gateway devuelve error de catálogo (\"Model 'claude-haiku-4-5' is not in the catalog. Use 'auto'...\")", async () => {
      // 1ª llamada: falla con el mensaje real que devuelve llm.pitayacode.io
      const catalogErr: any = new Error(
        "Model 'claude-haiku-4-5' is not in the catalog. Use 'auto' to let the router choose or check available models.",
      );
      catalogErr.response = {
        status: 400,
        data: {
          error: {
            message:
              "Model 'claude-haiku-4-5' is not in the catalog. Use 'auto' to let the router choose or check available models.",
          },
        },
      };
      axiosPostSpy.mockRejectedValueOnce(catalogErr);

      // 2ª llamada: pasa al siguiente modelo candidato ('gpt-oss-120b')
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(payload.model).toBe('gpt-oss-120b');
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Respuesta recuperada tras error de catálogo.',
                },
              },
            ],
            usage: { prompt_tokens: 35, completion_tokens: 12 },
          },
        };
      });

      const response = await service.generateResponse(
        'Consulta con modelo fuera de catálogo',
        [],
        'claude-haiku-4-5',
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'buscar_orden', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      expect(response.content).toBe(
        'Respuesta recuperada tras error de catálogo.',
      );
      expect(response.usage?.promptTokens).toBe(35);
      expect(dbService.mysql.aiCostLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: 'gpt-oss-120b',
          }),
        }),
      );
    });
  });

  describe('7. Sin modelos disponibles -> error claro', () => {
    it('debería lanzar un error claro cuando todos los modelos candidatos fallan', async () => {
      // Configuramos axios.post para que falle siempre por modelo no disponible
      const unavailableErr: any = new Error('Model unavailable: needsKey');
      unavailableErr.response = {
        status: 503,
        data: { error: { message: 'Model unavailable: needsKey' } },
      };
      axiosPostSpy.mockRejectedValue(unavailableErr);

      await expect(
        service.generateResponse(
          'Consulta que fallará en todos los modelos',
          [],
          'gemini-2.5-flash',
          undefined,
          'internal',
          'tenant-cared',
          'aura',
          [{ name: 'buscar_orden', description: 'desc' }],
          { url: 'https://api.luxuryos.com/tools' },
        ),
      ).rejects.toThrow(/Error con PitayaCode LLM/);
    });
  });

  describe('8. Resolución y configuración de modelos con tools', () => {
    it('debería priorizar agent.defaultModel si está configurado en el agente', async () => {
      dbService.mysql.agent.findFirst.mockResolvedValueOnce({
        defaultModel: 'claude-sonnet-4-5',
      });

      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(payload.model).toBe('claude-sonnet-4-5');
        return {
          data: {
            choices: [{ message: { role: 'assistant', content: 'OK' } }],
          },
        };
      });

      await service.generateResponse(
        'Mensaje',
        [],
        undefined, // sin modelName explícito
        undefined,
        'internal',
        'tenant-cared',
        'aura',
        [{ name: 'test_tool', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );
    });

    it('debería usar variable de entorno TOOL_DEFAULT_MODEL si agent.defaultModel no existe', async () => {
      const origEnv = process.env.TOOL_DEFAULT_MODEL;
      process.env.TOOL_DEFAULT_MODEL = 'gpt-oss-120b';

      try {
        axiosPostSpy.mockImplementationOnce(
          async (url: string, payload: any) => {
            expect(payload.model).toBe('gpt-oss-120b');
            return {
              data: {
                choices: [{ message: { role: 'assistant', content: 'OK' } }],
              },
            };
          },
        );

        await service.generateResponse(
          'Mensaje',
          [],
          'auto',
          undefined,
          'internal',
          'tenant-cared',
          'aura',
          [{ name: 'test_tool', description: 'desc' }],
          { url: 'https://api.luxuryos.com/tools' },
        );
      } finally {
        if (origEnv !== undefined) {
          process.env.TOOL_DEFAULT_MODEL = origEnv;
        } else {
          delete process.env.TOOL_DEFAULT_MODEL;
        }
      }
    });

    it('debería consultar GET /models y cachear el resultado por 5 minutos', async () => {
      // Limpiar caché
      (service as any).cachedGatewayModels = null;
      (service as any).cachedGatewayModelsExpiresAt = 0;

      const axiosGetSpy = jest.spyOn(axios, 'get').mockResolvedValue({
        data: {
          data: [
            { id: 'claude-sonnet-4-5', available: false },
            { id: 'gpt-oss-120b', available: true },
          ],
        },
      });

      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(payload.model).toBe('gpt-oss-120b');
        return {
          data: {
            choices: [{ message: { role: 'assistant', content: 'OK' } }],
          },
        };
      });

      await service.generateResponse(
        'Mensaje',
        [],
        'auto',
        undefined,
        'internal',
        'tenant-cared',
        'generic-agent',
        [{ name: 'test_tool', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      expect(axiosGetSpy).toHaveBeenCalledTimes(1);

      // Segunda llamada inmediata: debe usar la caché sin volver a llamar a GET /models
      axiosPostSpy.mockImplementationOnce(async (url: string, payload: any) => {
        expect(payload.model).toBe('gpt-oss-120b');
        return {
          data: {
            choices: [{ message: { role: 'assistant', content: 'OK' } }],
          },
        };
      });

      await service.generateResponse(
        'Mensaje 2',
        [],
        'auto',
        undefined,
        'internal',
        'tenant-cared',
        'generic-agent',
        [{ name: 'test_tool', description: 'desc' }],
        { url: 'https://api.luxuryos.com/tools' },
      );

      // Aún debe ser 1 debido a la caché de 5 minutos
      expect(axiosGetSpy).toHaveBeenCalledTimes(1);
    });

    it('debería respetar TOOL_MODEL_PREFERENCE para ordenar o sobreescribir la lista de modelos de preferencia', () => {
      const origPref = process.env.TOOL_MODEL_PREFERENCE;
      try {
        process.env.TOOL_MODEL_PREFERENCE = 'qwen3.8-27b, gpt-oss-120b';
        expect(service.getPreferredToolModels()).toEqual([
          'qwen3.8-27b',
          'gpt-oss-120b',
        ]);

        delete process.env.TOOL_MODEL_PREFERENCE;
        expect(service.getPreferredToolModels()).toEqual([
          'gpt-oss-120b',
          'qwen3.8-27b',
          'claude-haiku-4-5',
          'claude-sonnet-4-5',
        ]);
      } finally {
        if (origPref !== undefined) {
          process.env.TOOL_MODEL_PREFERENCE = origPref;
        } else {
          delete process.env.TOOL_MODEL_PREFERENCE;
        }
      }
    });
  });
});
