import { Router } from 'express';
import { asyncHandler } from '../routes/http';
import type { VaultSession } from '../services/vaultSession';
import * as hfService from '../services/hfService';

export function aiRouter(_session: VaultSession): Router {
  const router = Router();

  router.get('/health', asyncHandler(async (_req, res) => {
    try {
      const health = await hfService.getHealth();
      res.json(health);
    } catch {
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'Hugging Face local service is not available. Make sure ai-service/server.py is running.',
        },
      });
    }
  }));

  router.get('/models', asyncHandler(async (_req, res) => {
    try {
      const models = await hfService.getModels();
      res.json(models);
    } catch {
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'Hugging Face local service is not available.',
        },
      });
    }
  }));

  router.post('/chat', asyncHandler(async (req, res) => {
    try {
      const response = await hfService.chatStream(req.body, req);

      // Forward streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          res.end();
        }
      } else {
        res.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hugging Face local service error';
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message,
        },
      });
    }
  }));

  router.post('/summarize', asyncHandler(async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: '"text" must be a string.',
          },
        });
      }
      const result = await hfService.summarize(text);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hugging Face local service error';
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message,
        },
      });
    }
  }));

  router.post('/rewrite', asyncHandler(async (req, res) => {
    try {
      const { text, instruction } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: '"text" must be a string.',
          },
        });
      }
      if (!instruction || typeof instruction !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: '"instruction" must be a string.',
          },
        });
      }
      const result = await hfService.rewrite(text, instruction);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hugging Face local service error';
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message,
        },
      });
    }
  }));

  return router;
}
