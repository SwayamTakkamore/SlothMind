# SlothMind: Phase 2 Implementation Plan — Hugging Face Local AI Migration

## Executive Summary
This plan details the complete migration of SlothMind's local AI foundation from Ollama to **Hugging Face Local**, utilizing the host system's native PyTorch 2.14.1 with CUDA acceleration on the NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM). All traces of Ollama are completely removed.

---

## 1. Local Hugging Face Architecture

```
SlothMind Phase 2 Architecture
┌────────────────────────────────────────────────────────┐
│                      Frontend                          │
│  Markdown Editor | Right AI Panel | Chat | Actions     │
└───────────────────────────┬────────────────────────────┘
                            │ /api/*
┌───────────────────────────▼────────────────────────────┐
│                  Backend (Node.js/Express)             │
│  Vault FS | FTS Indexer | AI Proxy & Coordination      │
└───────────────────────────┬────────────────────────────┘
                            │ localhost:43118
┌───────────────────────────▼────────────────────────────┐
│           Hugging Face Local Service (Python/FastAPI)   │
│  PyTorch + CUDA + Transformers (SmolLM-135M-Instruct)   │
│  Streaming Generator | Health | Summarize | Rewrite     │
└────────────────────────────────────────────────────────┘
```

### Components
1. **Python Hugging Face Service (`ai-service/`):**
   - High-performance FastAPI server running on `127.0.0.1:43118`.
   - Uses native `transformers` and `torch` with `cuda:0` (RTX 3050) float16 inference.
   - Pre-cached local model: `HuggingFaceTB/SmolLM-135M-Instruct`.
   - Endpoints:
     - `GET /health`: GPU status, device name, VRAM allocated, active model.
     - `GET /models`: Lists available local Hugging Face models.
     - `POST /chat`: Streaming SSE token generation using `TextIteratorStreamer`.
     - `POST /summarize`: Structured note summarization.
     - `POST /rewrite`: Text transformation with selectable instructions.
2. **Node.js Backend AI Router (`backend/src/routes/ai.ts`):**
   - Routes `/api/ai/*` to the local Hugging Face service.
   - Fallback error handling if AI service is starting or offline.
   - Full removal of Ollama client/routes/types.
3. **Frontend Right AI Panel (`frontend/src/components/ai/`):**
   - Collapsible panel in main layout (PRD Section 8.2).
   - Real-time status pill: "Hugging Face Local (RTX 3050 CUDA)".
   - Streaming Chat view with cancellation support (`AbortController`).
   - "Summarize Note" contextual button.
   - "Rewrite Selection" modal / dropdown with options (Make Shorter, Professional, Fix Grammar, Explain).
   - "Save Output as New Note" flow.

---

## 2. Ordered Implementation Units

### Unit 2.1: Python Local Hugging Face Service (`ai-service/server.py`)
- Fast startup, CUDA auto-detection, memory-safe generation bounds.
- Streaming via `TextIteratorStreamer` and `StreamingResponse(..., media_type="text/event-stream")`.
- Unit tests verifying model inference, prompt templating, and endpoints.

### Unit 2.2: Backend Integration & Ollama Cleanup
- Implement `backend/src/services/hfService.ts` and `backend/src/routes/ai.ts`.
- Purge all remaining Ollama references from backend code, documentation, and types.
- Add lifecycle management script to launch the AI service seamlessly with `npm run dev`.

### Unit 2.3: Frontend AI Panel & Actions
- Implement `AIPanel.tsx`, `AIChatMessage.tsx`, `AIPromptInput.tsx`.
- Add "Summarize" and "Rewrite" buttons to `EditorHeader.tsx`.
- Connect streaming API to UI.
- Update `StatusBar.tsx` to display Hugging Face local AI status.

### Unit 2.4: Verification & Automated Tests
- Integration tests for AI endpoints.
- End-to-end browser verification using T3 collaborative preview.
