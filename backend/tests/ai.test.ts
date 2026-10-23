import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index';

describe('AI routes', () => {
  it('returns graceful 503 with instructions when local AI service is not running', async () => {
    const app = createApp();
    const res = await request(app).get('/api/ai/health');
    // If the local python service isn't active on 43118, it returns 503
    expect([200, 503]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    } else {
      expect(res.body.provider).toBe('huggingface-local');
    }
  });

  it('validates summarize payload input', async () => {
    const app = createApp();
    const res = await request(app).post('/api/ai/summarize').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('validates rewrite payload input and instruction', async () => {
    const app = createApp();
    const resNoText = await request(app).post('/api/ai/rewrite').send({ instruction: 'simplify' });
    expect(resNoText.status).toBe(400);
    expect(resNoText.body.error.code).toBe('INVALID_INPUT');

    const resNoInstruction = await request(app).post('/api/ai/rewrite').send({ text: 'Some text' });
    expect(resNoInstruction.status).toBe(400);
    expect(resNoInstruction.body.error.code).toBe('INVALID_INPUT');
  });
});
