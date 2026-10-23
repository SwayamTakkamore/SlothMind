# ADR-001: Local-First Architecture

**Status:** Accepted  
**Date:** 2026-10-24

## Decision
SlothMind will be local-first. Notes are stored as plain Markdown files in a user-selected vault. A rebuildable index lives on disk but is never the source of truth.

## Rationale
- User ownership and portability
- Works offline
- Avoids accidental cloud sync of private notes
- Simple backups (just copy the folder)

## Consequences
- We need careful path validation and safe writes
- Search is limited until embeddings are added
- Some conveniences (cross-device sync) are deferred to post-MVP
