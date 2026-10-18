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
});
