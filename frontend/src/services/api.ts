import type {
  ApiError,
  DirectoryListing,
  HealthResponse,
  NoteContent,
  SearchResponse,
  VaultInfo,
  VaultSummary,
} from '../types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const apiError = data as ApiError | undefined;
    const message = apiError?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = apiError?.error?.code;
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  getSession: () => request<VaultSummary>('/api/system/session'),
  getHome: () => request<{ home: string; platform: string; separator: string }>('/api/system/home'),
  listDirectories: (path?: string) => {
    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<DirectoryListing>(`/api/system/directories${query}`);
  },
  openVault: (path: string) => request<{ vault: VaultInfo; indexedNotes: number }>('/api/vault/open', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ path }),
  }),
  createVault: (parent: string, name: string) => request<{ vault: VaultInfo; indexedNotes: number }>('/api/vault/create', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ parent, name }),
  }),
  refreshVault: () => request<{ changed: number; removed: number; total: number }>('/api/vault/refresh', {
    method: 'POST',
  }),
  listTree: () => request<{ tree: import('../types').VaultNode[] }>('/api/notes/tree'),
  readNote: (path: string) => request<NoteContent>(`/api/notes?path=${encodeURIComponent(path)}`),
  createNote: (folder: string = '', name?: string) => request<NoteContent>('/api/notes', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ folder, name }),
  }),
  createFolder: (parent: string = '', name: string) => request<{ path: string; name: string }>('/api/notes/create-folder', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ parent, name }),
  }),
  writeNote: (path: string, content: string) => request<NoteContent>('/api/notes', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ path, content }),
  }),
  renameEntry: (from: string, to: string) => request<{ path: string }>('/api/notes/rename', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ from, to }),
  }),
  deleteEntry: (path: string) => request<{ path: string; trashedTo: string }>('/api/notes', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ path }),
  }),
  search: (q: string, limit = 20) => request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};
