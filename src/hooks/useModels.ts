import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ModelInfo {
    name: string;
    filename: string;
    path: string;
    size_bytes: number;
}

export function useModels() {
    const [models, setModels] = useState<ModelInfo[]>([]);

    const loadModels = useCallback(async () => {
        try {
            const list: ModelInfo[] = await invoke('list_models');
            setModels(list);
        } catch (e) {
            console.error('Failed to load models:', e);
        }
    }, []);

    const formatSize = (bytes: number): string => {
        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
        if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
        return `${(bytes / 1e3).toFixed(0)} KB`;
    };

    return { models, loadModels, formatSize };
}
