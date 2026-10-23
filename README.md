# SlothMind

**Your second brain. Your rules.**  
A local-first, privacy-focused Markdown knowledge workspace for developers and researchers.

## What works in this build (Phases 0, 1, 2 & 3)

- **Vault management** – Open an existing folder or create a new vault. Recent vaults are remembered in `localStorage`.
- **Safe filesystem access** – All backend operations are scoped to the active vault. Path traversal, absolute paths, and symlink escapes are rejected. Writes use atomic rename (temp file + rename), renames/moves block silent overwrites, and deletes move items to a recoverable `.trash/` folder.
- **File explorer** – Nested folders and `.md` notes with expand/collapse, active-note highlighting, inline create/rename/delete actions.
- **Markdown editor** – Source editing with a preview toggle, rendered with GitHub-flavored Markdown. UTF-8 content is preserved as-is.
- **Reliable autosave** – Debounced autosave (800ms), save on blur/note switch, manual `Ctrl+S`/`Cmd+S`, and visible status (`Saved`, `Saving...`, `Unsaved changes`, `Save error`).
- **Full-text search** – Instant modal (`Ctrl+K` / `Ctrl+P`) with title/content matches, excerpts, section hints, and keyboard navigation.
- **Local-first UX** – Charcoal dark theme with violet accent, desktop layout with collapsible sidebar and status bar.
- **Hugging Face Local AI** – Complete migration from Ollama to local Hugging Face service with CUDA acceleration. Right AI panel with streaming chat, summarize note, rewrite selection, and save as note functionality.
- **Ask Your Vault (Grounded RAG)** – Ask questions about your notes with section-aware chunking, retrieval of relevant passages, and answers grounded strictly in your vault. Citations are validated against retrieved content and clicking them opens the source note in the editor. If the vault doesn't contain enough information, the assistant honestly abstains.
- **Sample vault** – `sample-vault/` included for quick testing.

## Architecture

```
SlothMind/
├── backend/   # Node.js + Express + TypeScript (vault-scoped filesystem + search)
├── frontend/  # Vite + React + TypeScript + Tailwind CSS
├── sample-vault/
└── docs/
```

- The backend runs on `127.0.0.1:43117` and only accepts paths relative to the server-tracked active vault.
- The frontend proxies `/api` to the backend in dev mode.
- The index is rebuildable from disk and never becomes the source of truth.

## Prerequisites

- Node.js `>=20.19.0` (tested with `v24.13.0` via nvm at `/home/kali/.nvm/versions/node/v24.13.0/bin`)
- npm
- Python 3 with `torch`, `transformers`, `accelerate`, `fastapi`, `uvicorn` (for local Hugging Face AI service)
- NVIDIA GPU with CUDA (optional but recommended) - tested with RTX 3050 Laptop GPU
- Pre-cached model: `HuggingFaceTB/SmolLM-135M-Instruct` in `~/.cache/huggingface/hub/`

## Setup

```bash
export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"
npm install
```

## Run in development

Start backend, frontend, and the local Hugging Face AI service together:

```bash
export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"
npm run dev
```

- Backend: http://127.0.0.1:43117
- Frontend: http://localhost:5173
- AI Service: http://127.0.0.1:43118

Alternatively run them separately from `backend/`, `frontend/`, or with `npm run ai`.

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"
npm run test
```

Backend tests cover path traversal protection, atomic writes, safe rename/delete, tree listing, search indexing/results, and API route safety.

## Build

```bash
export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"
npm run build
```

## Quick demo (matches the MVP milestone)

1. `npm run dev`
2. Open http://localhost:5173
3. Click **Open / Switch vault** → create or open a folder (try `sample-vault/`)
4. Create a note with `Ctrl+N` or the sidebar button, type Markdown, and watch it autosave
5. Search with `Ctrl+K` / `Ctrl+P` and jump to a note
6. Try **Vault Q&A** in the AI panel - ask questions about your notes and click citations to jump to sources
7. Rename/delete notes from the file tree (deletes go to `.trash/`)

## Security notes

- Vault boundary enforcement on every filesystem operation
- No silent overwrites; rename conflicts return errors
- Atomic writes to prevent corruption on crash
- Backend binds to localhost only
- No cloud sync, accounts, or remote AI calls in this build

## Roadmap

See `IMPLEMENTATION_PLAN.md` for the approved phases. AI chat, vault RAG with citations, and additional workflows are planned for subsequent phases.
