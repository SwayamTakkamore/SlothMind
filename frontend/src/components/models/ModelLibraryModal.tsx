import { AlertCircle, Check, Cpu, Download, HardDrive, Play, Power, RefreshCw, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import type { ModelsResponse } from '../../types';

interface ModelLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onModelChanged?: (modelId: string | null) => void;
}

type FilterTab = 'all' | 'downloaded' | 'available' | 'downloading';

export function ModelLibraryModal({ open, onClose, onModelChanged }: ModelLibraryModalProps) {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      const res = await api.getModels();
      setData(res);
      setErrorMsg(null);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setErrorMsg('Could not connect to AI service. Ensure ai-service is running.');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open, fetchModels]);

  // Polling for download progress while modal is open and something is downloading
  useEffect(() => {
    if (!open) return;
    const hasDownloading = data?.models.some((m) => m.is_downloading);
    if (!hasDownloading) return;

    const interval = setInterval(() => {
      fetchModels();
    }, 1500);

    return () => clearInterval(interval);
  }, [open, data, fetchModels]);

  const handleActivate = async (modelId: string) => {
    setActionLoading(`activate-${modelId}`);
    setErrorMsg(null);
    try {
      await api.activateModel(modelId);
      await fetchModels();
      onModelChanged?.(modelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Activation failed';
      setErrorMsg(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnload = async () => {
    setActionLoading('unload');
    setErrorMsg(null);
    try {
      await api.unloadModel();
      await fetchModels();
      onModelChanged?.(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unload failed';
      setErrorMsg(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (modelId: string) => {
    setActionLoading(`download-${modelId}`);
    setErrorMsg(null);
    try {
      await api.downloadModel(modelId);
      await fetchModels();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setErrorMsg(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const models = data?.models ?? [];
  const activeModelId = data?.active_model;

  const filteredModels = models.filter((m) => {
    if (filter === 'downloaded') return m.is_downloaded;
    if (filter === 'available') return !m.is_downloaded && !m.is_downloading;
    if (filter === 'downloading') return m.is_downloading;
    return true;
  });

  const downloadedCount = models.filter((m) => m.is_downloaded).length;
  const downloadingCount = models.filter((m) => m.is_downloading).length;

  return (
    <Modal open={open} title="AI Model Library (Steam Style)" onClose={onClose}>
      <div className="flex flex-col h-[520px] -mx-4 -my-3 select-none">
        {/* Steam-Style Top Dashboard Bar */}
        <header className="border-b border-sloth-border bg-sloth-surface/40 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sloth-accent/20 text-sloth-accent shadow-inner">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-sloth-text">Gemma & Local Model Library</h3>
                <span className="rounded-full bg-sloth-surface border border-sloth-border/80 px-2 py-0.5 text-[10px] text-sloth-subtle font-mono">
                  {models.length} Models
                </span>
              </div>
              <p className="text-xs text-sloth-subtle flex items-center gap-1.5 mt-0.5">
                <Cpu size={12} className="text-emerald-500" />
                <span>{data?.device?.gpu ?? 'NVIDIA RTX 3050 (4 GB VRAM)'}</span>
                <span className="text-sloth-border">•</span>
                <span>Active: </span>
                <strong className={activeModelId ? 'text-emerald-500' : 'text-amber-500 font-normal'}>
                  {activeModelId ? activeModelId.split('/')[1] || activeModelId : 'None (No model selected)'}
                </strong>
              </p>
            </div>
          </div>

          {activeModelId && (
            <button
              onClick={handleUnload}
              disabled={actionLoading === 'unload'}
              className="flex items-center gap-1.5 rounded-lg border border-sloth-border bg-sloth-surface px-3 py-1.5 text-xs text-sloth-subtle transition hover:bg-sloth-danger/10 hover:text-sloth-danger hover:border-sloth-danger/40"
              title="Unload model to free GPU memory"
            >
              <Power size={13} />
              <span>{actionLoading === 'unload' ? 'Unloading...' : 'Unload from VRAM'}</span>
            </button>
          )}
        </header>

        {/* Filter Navigation Tabs (Steam Library Style) */}
        <div className="flex items-center justify-between border-b border-sloth-border px-5 py-2 bg-sloth-panel">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === 'all'
                  ? 'bg-sloth-surface text-sloth-text shadow-sm'
                  : 'text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface/50'
              }`}
            >
              All Models ({models.length})
            </button>
            <button
              onClick={() => setFilter('downloaded')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === 'downloaded'
                  ? 'bg-sloth-surface text-sloth-text shadow-sm'
                  : 'text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface/50'
              }`}
            >
              Ready to Play ({downloadedCount})
            </button>
            {downloadingCount > 0 && (
              <button
                onClick={() => setFilter('downloading')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === 'downloading'
                    ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                    : 'text-sloth-accent hover:bg-sloth-surface/50'
                }`}
              >
                <RefreshCw size={12} className="animate-spin" />
                Downloading ({downloadingCount})
              </button>
            )}
            <button
              onClick={() => setFilter('available')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === 'available'
                  ? 'bg-sloth-surface text-sloth-text shadow-sm'
                  : 'text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface/50'
              }`}
            >
              Store / Available ({models.length - downloadedCount})
            </button>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchModels().finally(() => setLoading(false));
            }}
            className="flex items-center gap-1 rounded-lg p-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
            title="Refresh library"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 my-2 rounded-lg border border-sloth-danger/30 bg-sloth-danger/10 px-3 py-2 text-xs text-sloth-danger flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Steam-Style Games Grid / Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-sloth-subtle">
              <HardDrive size={32} className="opacity-40 mb-2" />
              <p className="text-sm font-medium">No models match this filter</p>
              <p className="text-xs mt-1">Switch tabs to view available or downloaded models.</p>
            </div>
          ) : (
            filteredModels.map((model) => {
              const isActive = model.is_active;
              const isDownloaded = model.is_downloaded;
              const isDownloading = model.is_downloading;
              const isActivating = actionLoading === `activate-${model.id}`;
              const isStartingDownload = actionLoading === `download-${model.id}`;

              return (
                <div
                  key={model.id}
                  className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
                      : isDownloaded
                      ? 'border-sloth-border bg-sloth-surface/30 hover:border-sloth-accent/40 hover:bg-sloth-surface/50'
                      : 'border-sloth-border/70 bg-sloth-surface/15 hover:border-sloth-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-sloth-surface border border-sloth-border px-2 py-0.5 text-[10px] font-semibold tracking-wider text-sloth-accent uppercase">
                          {model.family}
                        </span>
                        <h4 className="text-sm font-bold text-sloth-text">{model.name}</h4>
                        {model.recommended && (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                            ★ Recommended for 4GB VRAM
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE IN GPU
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-sloth-subtle mt-1.5 leading-relaxed">{model.description}</p>

                      {/* Technical Specs Pills */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="rounded bg-sloth-surface/80 border border-sloth-border/60 px-2 py-0.5 text-[11px] text-sloth-subtle">
                          Parameters: <strong className="text-sloth-text">{model.parameters}</strong>
                        </span>
                        <span className="rounded bg-sloth-surface/80 border border-sloth-border/60 px-2 py-0.5 text-[11px] text-sloth-subtle">
                          Download Size: <strong className="text-sloth-text">{model.size_gb.toFixed(2)} GB</strong>
                        </span>
                        {model.tags.map((tag) => (
                          <span key={tag} className="rounded bg-sloth-panel px-1.5 py-0.5 text-[10px] text-sloth-subtle border border-sloth-border/40">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Downloading Live Progress Bar */}
                      {isDownloading && (
                        <div className="mt-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-sloth-subtle">
                            <span className="flex items-center gap-1.5 text-sloth-accent font-medium">
                              <RefreshCw size={12} className="animate-spin" />
                              Downloading from Hugging Face...
                            </span>
                            <span className="font-mono text-sloth-text">{model.download_progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-sloth-panel border border-sloth-border/80">
                            <div
                              className="h-full bg-gradient-to-r from-sloth-accent to-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.max(5, model.download_progress)}%` }}
                            />
                          </div>
                          {model.download_message && (
                            <p className="text-[11px] text-sloth-subtle font-mono">{model.download_message}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Steam-Style Action Button */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {isActive ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium px-2 py-1">
                            <Check size={14} /> Running
                          </span>
                        </div>
                      ) : isDownloaded ? (
                        <button
                          onClick={() => handleActivate(model.id)}
                          disabled={isActivating}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                          {isActivating ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>LOADING TO GPU...</span>
                            </>
                          ) : (
                            <>
                              <Play size={14} className="fill-current" />
                              <span>ACTIVATE MODEL</span>
                            </>
                          )}
                        </button>
                      ) : isDownloading ? (
                        <button
                          disabled
                          className="flex items-center gap-2 rounded-xl border border-sloth-border bg-sloth-surface/50 px-4 py-2.5 text-xs font-medium text-sloth-subtle opacity-70 cursor-wait"
                        >
                          <RefreshCw size={13} className="animate-spin" />
                          <span>DOWNLOADING...</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(model.id)}
                          disabled={isStartingDownload}
                          className="flex items-center gap-2 rounded-xl bg-sloth-accent hover:bg-sloth-accentHover px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                          {isStartingDownload ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>STARTING...</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              <span>DOWNLOAD ({model.size_gb.toFixed(1)} GB)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
