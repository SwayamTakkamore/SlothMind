# Cache Crash Fix

**Date:** 2026-10-24  
**Context:** Application crashed after enabling aggressive caching in the preview service.

## Symptoms
- Segmentation fault on startup
- Logs showed `invalid handle` in the cache lookup
- Only reproduced with warm caches

## Investigation
1. Traced cache key serialization to a JSON cycle
2. Found that a circular reference was passed to `JSON.stringify`
3. The serializer threw, but the error was swallowed and left a stale handle

## Fix
- Added cycle detection before serialization
- Wrapped serialization in try/catch with explicit logging
- Added a regression test to prevent reintroducing circular refs

## Rejected approach
We considered disabling the cache entirely, but that would have hurt cold-start times too much. A safer serializer was the correct trade-off.
