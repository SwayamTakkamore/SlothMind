import type { Request } from 'express';

const HF_SERVICE_URL = process.env.HF_SERVICE_URL || 'http://127.0.0.1:43118';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface NotionAIRequest {
  task: string;
  text?: string;
  prompt?: string;
  template_type?: string;
  tone?: string;
  target_language?: string;
  max_tokens?: number;
  stream?: boolean;
}

export async function getHealth() {
  const res = await fetch(`${HF_SERVICE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return await res.json();
}

export async function getModels() {
  const res = await fetch(`${HF_SERVICE_URL}/models`);
  if (!res.ok) throw new Error(`Models fetch failed: ${res.status}`);
  return await res.json();
}

export async function activateModel(model_id: string) {
  const res = await fetch(`${HF_SERVICE_URL}/models/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model activation failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function unloadModel() {
  const res = await fetch(`${HF_SERVICE_URL}/models/unload`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model unload failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function downloadModel(model_id: string) {
  const res = await fetch(`${HF_SERVICE_URL}/models/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download initiation failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export async function getDownloadStatus() {
  const res = await fetch(`${HF_SERVICE_URL}/models/download-status`);
  if (!res.ok) throw new Error(`Download status fetch failed: ${res.status}`);
  return await res.json();
}

export async function chatStream(request: ChatRequest, _req: Request) {
  const res = await fetch(`${HF_SERVICE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed: ${res.status} ${text}`);
  }

  return res;
}

export async function summarize(text: string) {
  const res = await fetch(`${HF_SERVICE_URL}/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const textErr = await res.text();
    throw new Error(`Summarize failed: ${res.status} ${textErr}`);
  }
  return await res.json();
}

export async function rewrite(text: string, instruction: string) {
  const res = await fetch(`${HF_SERVICE_URL}/rewrite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, instruction }),
  });
  if (!res.ok) {
    const textErr = await res.text();
    throw new Error(`Rewrite failed: ${res.status} ${textErr}`);
  }
  return await res.json();
}

export async function notionAI(request: NotionAIRequest) {
  const res = await fetch(`${HF_SERVICE_URL}/notion-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const textErr = await res.text();
    throw new Error(`Notion AI failed: ${res.status} ${textErr}`);
  }
  return res;
}
