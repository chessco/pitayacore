import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-key';

  describe('ApiKeyGuard Protection', () => {
    it('should reject requests without x-api-key header (401)', () => {
      return request(app.getHttpServer()).get('/api/hitl/pending').expect(401);
    });

    it('should reject requests with invalid x-api-key (401)', () => {
      return request(app.getHttpServer())
        .get('/api/hitl/pending')
        .set('x-api-key', 'wrong-key')
        .expect(401);
    });

    it('should allow requests with valid internal x-api-key (200 or other)', async () => {
      // We expect 200 (OK) if authorized, even if data is empty
      const response = await request(app.getHttpServer())
        .get('/api/hitl/pending')
        .set('x-api-key', INTERNAL_API_KEY)
        .set('x-tenant-id', 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718');

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should protect AI analysis endpoint', () => {
      return request(app.getHttpServer())
        .post('/api/ai/analyze-conversation')
        .send({ messages: [] })
        .expect(401);
    });

    it('should allow AI analysis with correct key', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/analyze-conversation')
        .set('x-api-key', INTERNAL_API_KEY)
        .set('x-tenant-id', 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718')
        .send({ messages: [] });

      expect(response.status).not.toBe(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
