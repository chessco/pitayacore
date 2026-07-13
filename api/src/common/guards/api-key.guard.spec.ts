import { ApiKeyGuard } from './api-key.guard';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'INTERNAL_API_KEY') return 'test-secret-123';
        return null;
      }),
    } as any;
    guard = new ApiKeyGuard(configService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when the correct API key is provided', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': 'test-secret-123',
          },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return false when an incorrect API key is provided', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': 'wrong-secret',
          },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false when no API key is provided', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false if config is missing', () => {
    configService = {
      get: jest.fn(() => null),
    } as any;
    guard = new ApiKeyGuard(configService);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': 'test-key',
          },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
