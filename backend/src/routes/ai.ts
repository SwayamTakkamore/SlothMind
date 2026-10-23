import { Router } from 'express';
import { asyncHandler } from '../routes/http';
import type { VaultSession } from '../services/vaultSession';
import * as hfService from '../services/hfService';
import { RetrievalService } from '../services/retrieval';
import * as ragService from '../services/ragService';

export function aiRouter(session: VaultSession): Router {
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

  router.post('/ask', asyncHandler(async (req, res) => {
    try {
      const { vault, index } = session.requireVault();
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: '"question" must be a string.',
          },
        });
      }
      
      const retrieval = new RetrievalService(vault, index);
      const retrievalResult = await retrieval.retrieve(question, 4);
      
      // If no relevant passages found, abstain
      if (retrievalResult.passages.length === 0) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        const message = "The vault does not contain enough information to answer this question.";
        res.write(`data: ${JSON.stringify({ content: message })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      
      const response = await ragService.askVault(question, retrievalResult.passages, true, req) as Response;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
            
            // Accumulate for citation extraction
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                try {
                  const parsed = JSON.parse(data) as { content?: string };
                  if (parsed.content) {
                    fullAnswer += parsed.content;
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
          
          // Extract and send citations
          let citedIds = ragService.extractCitationsFromAnswer(fullAnswer);
          if (
            citedIds.length === 0 &&
            !fullAnswer.includes('The vault does not contain enough information')
          ) {
            citedIds = retrievalResult.passages.map((p) => p.id);
          }
          const citations = ragService.buildCitationsMetadata(citedIds, retrievalResult.passages);
          const validatedCitations = ragService.validateCitations(citations, retrievalResult.passages);
          
          res.write(`data: ${JSON.stringify({ type: 'citations', citations: validatedCitations })}\n\n`);
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          res.end();
        }
      } else {
        res.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RAG service error';
      res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message,
        },
      });
    }
  }));

  router.get('/chunks', asyncHandler(async (_req, res) => {
    try {
      const { vault, index } = session.requireVault();
      const retrieval = new RetrievalService(vault, index);
      const chunks = await retrieval.getChunksForDebug();
      res.json({ chunks: chunks.length, items: chunks.slice(0, 50) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get chunks';
      res.status(503).json({
        error: {
          code: 'SERVICE_ERROR',
          message,
        },
      });
    }
  }));

  return router;
}
