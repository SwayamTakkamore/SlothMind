# SlothMind: Implementation Plan (Phases 0 & 1)

## Executive Summary
This implementation plan establishes the architectural baseline, project scaffolding, and functional core for **SlothMind**, a local-first, privacy-focused Markdown knowledge workspace.

As specified in `PRD.md` and the orchestration brief, this phase focuses strictly on **Phase 0 (Environment Bootstrap & Foundation)** and **Phase 1 (Local-First Markdown Workspace)**. Advanced features (cloud sync, payments, cloud AI, complex graph) are explicitly out of scope for this milestone.

---

## 1. System & Architecture Analysis

### Current Environment
- **Operating System:** Linux (Kali Linux, x86_64)
- **Node.js:** v24.13.0 (accessible via `/home/kali/.nvm/versions/node/v24.13.0/bin` or standard nvm path)
- **NPM:** 11.6.2
- **Bun:** 1.3.14 (available at `/home/kali/.bun/bin/bun`)
- **Git:** Initialized clean repository on `main`
- **Rust/Cargo:** Not installed on the system
- **Ollama:** Installed at `/usr/local/bin/ollama`, active on `http://127.0.0.1:11434`, model `glm-4.7-flash:latest` detected.

### Technical Decision: Desktop Architecture & Runtime
- **PRD Guidance (Section 9.1 & 21):**
  > "Desktop shell: Tauri (preferred for a lightweight desktop app... If Tauri packaging threatens the deadline, a local web MVP can be built first, but local file access must remain safe and clearly scoped.)"
- **Rationale:** Because Cargo/Rust and Linux webkit2gtk-4.1 dev libraries are not pre-installed in the environment, building via Vite + React 19 + TypeScript + Tailwind CSS with a local Node.js secure backend service (providing filesystem access strictly scoped to the active vault) delivers:
  1. Instant, reliable zero-native-compilation builds in this Linux environment.
  2. Full compatibility with standard modern browser engines, including the T3 Code collaborative preview browser (`preview_open` / `preview_navigate`).
  3. Seamless packaging into Electron or Tauri whenever the native Rust toolchain is added, because all filesystem operations are abstracted behind a typed client service layer (`VaultService`).
  4. Real, persistent local filesystem read/write of `.md` files without browser sandbox limits (e.g., File System Access API dialog fatigue).

---

## 2. Target Component Architecture

```
SlothMind Application Structure
├── backend/ (Local Secure Vault Server - Express/Node/TypeScript)
│   ├── src/
│   │   ├── index.ts              # Local HTTP & WebSocket/SSE server on localhost
│   │   ├── routes/
│   │   │   ├── vault.ts          # Vault open, create, list, info
│   │   │   ├── notes.ts          # Note CRUD, rename, safe delete
│   │   │   └── search.ts         # Full-text search over indexed markdown files
│   │   ├── services/
│   │   │   ├── fsVault.ts        # Path validation, traversal guard, atomic writes
│   │   │   └── indexer.ts        # In-memory / SQLite full-text indexer
│   │   └── types/
│   └── tests/
├── frontend/ (Vite + React + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── explorer/
│   │   │   │   ├── FileTree.tsx
│   │   │   │   ├── FileTreeNode.tsx
│   │   │   │   ├── NewNoteModal.tsx
│   │   │   │   └── DeleteConfirmModal.tsx
│   │   │   ├── editor/
│   │   │   │   ├── MarkdownEditor.tsx
│   │   │   │   ├── EditorHeader.tsx
│   │   │   │   └── EditorToolbar.tsx
│   │   │   ├── search/
│   │   │   │   ├── SearchModal.tsx
│   │   │   │   └── SearchResultItem.tsx
│   │   │   └── common/
│   │   │       ├── Badge.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Toast.tsx
│   │   ├── services/
│   │   │   ├── api.ts            # Typed client for backend vault API
│   │   │   └── storage.ts        # Local settings & recent vault memory
│   │   ├── hooks/
│   │   │   ├── useAutosave.ts    # Debounced autosave with dirty checking
│   │   │   ├── useVault.ts       # Vault state management
│   │   │   └── useKeyboard.ts    # Hotkeys (Ctrl+P, Ctrl+S, Ctrl+N)
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── sample-vault/                 # Sample vault with realistic developer/researcher notes
└── docs/
    └── architecture.md
```

---

## 3. Implementation Units & Order of Work

### Unit 0: Environment Setup & Project Scaffolding (Phase 0)
- **Task 0.1:** Initialize root `package.json` with workspace configuration or clean monorepo setup supporting frontend and backend.
- **Task 0.2:** Setup TypeScript configuration (`tsconfig.json`), ESLint, Vitest, and Tailwind CSS.
- **Task 0.3:** Scaffold frontend (React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons).
- **Task 0.4:** Scaffold backend vault service (Node.js/Express + TypeScript) with path normalization and traversal prevention.
- **Task 0.5:** Configure unified startup scripts (`npm run dev`, `npm run build`, `npm run test`, `npm run lint`).
- **Acceptance Gate 0:** `npm run build` and `npm run test` pass cleanly with zero errors.

### Unit 1: Safe Filesystem & Vault Services (Phase 1 Backend)
- **Task 1.1: Vault Boundary Validation:**
  - Implement path canonicalization: verify all requested paths resolve strictly inside the active vault directory.
  - Reject path traversal attempts (`..`, symlink escapes, absolute paths outside vault).
- **Task 1.2: File Operations:**
  - `listVaultTree`: Recursively scan vault, return nested hierarchy of folders and `.md` files (ignoring `.git`, hidden files).
  - `readNote`: Read UTF-8 markdown file content and stat metadata (mtime, size).
  - `writeNote`: Safe atomic write (write to temporary file `.tmp~`, then atomic rename). Debounce support.
  - `renameNote`: Safely rename or move note; prevent silent overwriting of existing targets.
  - `deleteNote`: Safe deletion or move to `.trash` folder inside vault.
  - `createFolder` / `createNote`: Create folders and notes with sensible default naming (`Untitled.md`, `Untitled 1.md`).
- **Task 1.3: Full-Text Search Engine:**
  - Index note titles and markdown content (heading-aware and passage-aware).
  - Provide lexical search with snippet excerpting and match offsets.
- **Acceptance Gate 1:** Comprehensive unit and integration tests verifying path boundary safety, atomic writes, and search accuracy.

### Unit 2: UI Foundation & Vault Switcher (Phase 1 Frontend)
- **Task 2.1: Theme & Visual System:**
  - Dark theme default with charcoal palette (`#121316`, `#1a1b20`, `#22242b`), subtle violet accent (`#8b5cf6`), and high-contrast neutral text.
  - Responsive desktop layout: collapsible left sidebar, central workspace, and status bar.
- **Task 2.2: Vault Lifecycle & Open/Create Flow:**
  - Initial empty state / Welcome view if no vault is selected.
  - "Open Vault" and "Create Vault" flows.
  - Store recent vault paths in local storage for quick re-opening.
- **Acceptance Gate 2:** App launches in browser preview, displays welcome screen, and connects to local vault.

### Unit 3: File Explorer & Note Management
- **Task 3.1: File Tree Component:**
  - Display hierarchical folders and notes with expand/collapse states.
  - Active note highlighting.
  - Inline "New Note" and "New Folder" actions.
- **Task 3.2: Note Creation & Management:**
  - Create note with automatic focus in editor.
  - Inline rename with validation (prevent invalid characters `/ \ : * ? " < > |`).
  - Delete note with explicit confirmation modal.
- **Acceptance Gate 3:** File explorer accurately reflects filesystem changes; user can create, rename, and delete notes.

### Unit 4: Markdown Editor & Autosave
- **Task 4.1: Markdown Editor Component:**
  - Split view or toggle between Source Markdown and Rendered Preview.
  - Full syntax support: headings, code blocks with language labels, blockquotes, lists, tables, links.
  - Preservation of original UTF-8 markdown without destructive round-tripping.
- **Task 4.2: Autosave System:**
  - Debounced autosave (default 800ms after last keystroke).
  - Immediate save on blur or note switch.
  - Clear visual indicator: "Saved", "Saving...", "Unsaved changes", or "Save error".
  - Keyboard shortcut `Ctrl+S` / `Cmd+S` for manual force-save.
- **Acceptance Gate 4:** Typed changes autosave to disk; verified by inspecting actual `.md` files; no data loss on switching notes.

### Unit 5: Full-Text Search & Quick Switcher
- **Task 5.1: Search Modal (`Ctrl+K` / `Ctrl+P`):**
  - Instant keyboard-driven search modal.
  - Match highlighting, title, relative path, and context excerpt.
  - Up/Down arrow navigation and Enter to jump to note.
- **Acceptance Gate 5:** Searching for words contained in notes returns matching excerpts and navigates immediately to the selected note.

### Unit 6: Sample Vault, Documentation & Independent Verification
- **Task 6.1: Seed Sample Vault:**
  - Create `sample-vault/` containing realistic developer notes: debugging logs, architecture decision records (ADRs), API summaries, and code snippets.
- **Task 6.2: Documentation:**
  - `README.md` covering architecture, prerequisite setup, running dev mode, running tests, and manual verification steps.
- **Acceptance Gate 6:** All automated tests pass; full verification checklist completed.

---

## 4. Security, Privacy & Data Integrity Matrix

| Risk Category | Hazard | Mitigation |
|---|---|---|
| **Path Traversal** | Malicious path input accessing `/etc/` or parent dirs | Resolve real path via `path.resolve` and assert `targetPath.startsWith(vaultRoot + path.sep)`. Reject relative escapes. |
| **Silent Overwrite** | Renaming or creating a note with existing name | Explicitly check existence via `fs.promises.stat`; return HTTP 409 Conflict if destination exists. |
| **Write Corruption** | Power loss or crash during file write | Write content to temporary swap file (`.tmp~[id]`), then call atomic `fs.promises.rename`. |
| **Data Privacy** | Silent remote telemetry or cloud leakage | Strict zero-external-network policy in core app. All requests stay on `localhost`. |
| **XSS / HTML Injection** | Malicious scripts in note markdown | Sanitize rendered markdown preview using strict DOMPurify/rehype-sanitize rules. |

---

## 5. Verification & Acceptance Criteria Checklist
- [ ] Development environment boots cleanly with single command (`npm run dev`).
- [ ] Clean build produces no TypeScript or bundling errors (`npm run build`).
- [ ] Unit and integration tests pass (`npm run test`).
- [ ] User can select/create a local directory as a vault.
- [ ] File explorer lists nested folders and notes accurately.
- [ ] User can create, edit, rename, and delete `.md` notes.
- [ ] Autosave reliably persists content to the `.md` file on disk.
- [ ] File content matches what is on disk when re-opening the application.
- [ ] Full-text search returns matches with excerpts and links to notes.
- [ ] Non-markdown files or unauthorized paths outside the vault cannot be accessed.
