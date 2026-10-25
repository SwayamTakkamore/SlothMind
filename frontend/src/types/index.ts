export interface VaultInfo {
  path: string;
  name: string;
  openedAt: string;
}

export interface VaultSummary {
  vault: VaultInfo | null;
  indexedNotes: number;
}

export type VaultNodeType = 'folder' | 'note';

export interface VaultNode {
  name: string;
  path: string;
  type: VaultNodeType;
  size?: number;
  modifiedAt?: string;
  children?: VaultNode[];
}

export interface NoteContent {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export interface NoteWriteResult {
  path: string;
  size: number;
  modifiedAt: string;
}

export interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  matchStart: number;
  matchEnd: number;
  section: string | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  indexedNotes: number;
  tookMs: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface DirectoryListing {
  path: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  vault: VaultSummary;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface ModelInfo {
  id: string;
  name: string;
  family: string;
  parameters: string;
  size_gb: number;
  recommended: boolean;
  description: string;
  context_window: number;
  tags: string[];
  is_downloaded: boolean;
  is_downloading: boolean;
  is_paused?: boolean;
  download_progress: number;
  download_status: 'available' | 'downloading' | 'paused' | 'completed' | 'error' | 'downloaded';
  download_message?: string | null;
  is_active: boolean;
  disk_size_bytes: number;
}

export interface ModelsResponse {
  active_model: string | null;
  last_active_model?: string | null;
  device: {
    device?: string;
    gpu?: string;
    gpu_count?: number;
    total_vram_mb?: number;
  };
  models: ModelInfo[];
}

export type NotionAITask =
  | 'draft'
  | 'edit'
  | 'improve'
  | 'fix-grammar'
  | 'make-shorter'
  | 'make-longer'
  | 'simplify'
  | 'change-tone'
  | 'translate'
  | 'explain'
  | 'action-items'
  | 'summarize'
  | 'key-takeaways'
  | 'continue';

export type NotionAITemplate =
  | 'brainstorm'
  | 'blog-post'
  | 'prd'
  | 'meeting-agenda'
  | 'email'
  | 'press-release'
  | 'job-description'
  | 'essay-outline';

export type NotionAITone =
  | 'professional'
  | 'casual'
  | 'direct'
  | 'confident'
  | 'friendly';

export interface NotionAIRequest {
  task: NotionAITask | string;
  text?: string;
  prompt?: string;
  template_type?: NotionAITemplate | string;
  tone?: NotionAITone | string;
  target_language?: string;
  max_tokens?: number;
  stream?: boolean;
}

export interface NotionAIResponse {
  status: string;
  task: string;
  result: string;
}
