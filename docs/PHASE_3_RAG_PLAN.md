# SlothMind: Phase 3 Implementation Plan — Ask Your Vault (Grounded RAG)

## Executive Summary
Phase 3 implements **Ask Your Vault**, enabling users to ask natural-language questions across their Markdown notes. Answers are strictly grounded in retrieved local note passages, include validated clickable citations that open source notes in the editor, and abstain honestly when the vault lacks sufficient evidence.

---

## 1. Architecture & Data Flow

```
User Question -> [RAG Service] -> Retrieve Top-K Chunks -> Build Bounded Prompt
                        │
                        ▼
             [Hugging Face Local (SmolLM-135M-Instruct)]
                        │
                        ▼
         Stream Answer + Validate Citations -> [Frontend AI Panel]
                                                       │
                                        Click Citation │
                                                       ▼
                                          [Open Note in Editor]
```

### Components
1. **Chunking & Indexing Service (`backend/src/services/chunker.ts`):**
   - Splits Markdown notes into manageable, heading-aware chunks (200-400 words) while tracking `path`, `title`, `section`, and offsets.
2. **Retrieval Service (`backend/src/services/retrieval.ts`):**
   - Scores and ranks chunks using BM25/lexical matching over titles, headings, and chunk content.
   - Returns top-bounded passages (top 3-5).
3. **Prompt Construction & Citation Validation:**
   - Injects retrieved passages as untrusted reference material.
   - Instructs model to cite sources as `[1]`, `[2]`, etc., and abstain if evidence is absent.
   - Validates returned citation references against real retrieved files.
4. **API Endpoints:**
   - `POST /api/ai/ask`: Streaming endpoint returning answer text chunks and final structured citations:
     `{ id: number, path: string, title: string, section: string | null, excerpt: string }`.
   - `GET /api/ai/chunks`: Inspect indexed chunks for debugging / transparency.
5. **Frontend Vault Q&A Interface:**
   - Mode selector in `AIPanel.tsx`: "Vault Q&A" vs "General Chat".
   - Clickable citation cards/badges under assistant answers that open the source note in the editor.
   - Expandable "Inspect retrieved passages" toggle.
   - Empty/abstention state handling.

---

## 2. Acceptance Gates
- [ ] Chunks generated for all Markdown files in active vault with section and path metadata.
- [ ] Asking a question about notes in `sample-vault/` retrieves matching passages.
- [ ] Answer streams from local Hugging Face model and provides citation links.
- [ ] Clicking citation opens the source note in the editor.
- [ ] When context is missing, model abstains ("The vault does not contain enough information...").
- [ ] All unit, integration, and build checks pass (`npm run verify`).
