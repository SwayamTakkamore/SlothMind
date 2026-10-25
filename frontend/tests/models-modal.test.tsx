import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ModelLibraryModal } from '../src/components/models/ModelLibraryModal';
import { api } from '../src/services/api';
import type { ModelsResponse } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: {
    getModels: vi.fn(),
    activateModel: vi.fn(),
    unloadModel: vi.fn(),
    downloadModel: vi.fn(),
    pauseModel: vi.fn(),
    resumeModel: vi.fn(),
    deleteModel: vi.fn(),
  },
}));

const mockData: ModelsResponse = {
  active_model: null,
  device: { gpu: 'NVIDIA RTX 3050 (4 GB VRAM)' },
  models: [
    {
      id: 'google/gemma-3-1b-it',
      name: 'Gemma 3 1B IT',
      family: 'gemma3',
      parameters: '1B',
      size_gb: 2.0,
      recommended: true,
      description: 'Super compact model',
      context_window: 8192,
      tags: ['gemma3', '1b'],
      is_downloaded: true,
      is_downloading: false,
      is_paused: false,
      download_progress: 100,
      download_status: 'downloaded',
      is_active: false,
      disk_size_bytes: 2000000000,
    },
    {
      id: 'google/gemma-2-2b-it',
      name: 'Gemma 2 2B IT',
      family: 'gemma2',
      parameters: '2B',
      size_gb: 4.5,
      recommended: false,
      description: 'Larger model',
      context_window: 8192,
      tags: ['gemma2', '2b'],
      is_downloaded: false,
      is_downloading: true,
      is_paused: false,
      download_progress: 42,
      download_status: 'downloading',
      download_message: '42.0% downloaded',
      is_active: false,
      disk_size_bytes: 1800000000,
    },
    {
      id: 'google/gemma-3-4b-it',
      name: 'Gemma 3 4B IT',
      family: 'gemma3',
      parameters: '4B',
      size_gb: 8.0,
      recommended: false,
      description: 'Paused model',
      context_window: 8192,
      tags: ['gemma3', '4b'],
      is_downloaded: false,
      is_downloading: false,
      is_paused: true,
      download_progress: 15,
      download_status: 'paused',
      download_message: 'Download paused at 15.0%',
      is_active: false,
      disk_size_bytes: 1200000000,
    },
  ],
};

describe('ModelLibraryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getModels).mockResolvedValue(mockData);
  });

  it('renders library with downloaded, downloading, and paused models', async () => {
    await act(async () => {
      render(<ModelLibraryModal open={true} onClose={() => {}} />);
    });

    expect(screen.getByText('Gemma 3 1B IT')).toBeDefined();
    expect(screen.getByText('ACTIVATE MODEL')).toBeDefined();
    expect(screen.getByText('Gemma 2 2B IT')).toBeDefined();
    expect(screen.getByText('PAUSE')).toBeDefined();
    expect(screen.getByText('Gemma 3 4B IT')).toBeDefined();
    expect(screen.getByText('RESUME')).toBeDefined();
  });

  it('handles pause action when pause button is clicked', async () => {
    vi.mocked(api.pauseModel).mockResolvedValue({ status: 'paused', model_id: 'google/gemma-2-2b-it' });

    await act(async () => {
      render(<ModelLibraryModal open={true} onClose={() => {}} />);
    });

    const pauseBtn = screen.getByText('PAUSE');
    await act(async () => {
      fireEvent.click(pauseBtn);
    });

    expect(api.pauseModel).toHaveBeenCalledWith('google/gemma-2-2b-it');
  });

  it('handles resume action when resume button is clicked', async () => {
    vi.mocked(api.resumeModel).mockResolvedValue({ status: 'resumed', model_id: 'google/gemma-3-4b-it' });

    await act(async () => {
      render(<ModelLibraryModal open={true} onClose={() => {}} />);
    });

    const resumeBtn = screen.getByText('RESUME');
    await act(async () => {
      fireEvent.click(resumeBtn);
    });

    expect(api.resumeModel).toHaveBeenCalledWith('google/gemma-3-4b-it');
  });

  it('handles delete action with confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.deleteModel).mockResolvedValue({ status: 'deleted', model_id: 'google/gemma-3-1b-it' });

    await act(async () => {
      render(<ModelLibraryModal open={true} onClose={() => {}} />);
    });

    const deleteButtons = screen.getAllByTitle('Delete downloaded model files from disk to free space');
    expect(deleteButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(api.deleteModel).toHaveBeenCalledWith('google/gemma-3-1b-it');
  });
});
