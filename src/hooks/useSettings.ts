import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Settings {
    active_model: string | null;
    font_size: number;
    scanline_intensity: number;
    text_color: string;
}

const COLOR_MAP: Record<string, { dim: string; bright: string; glow: string }> = {
    '#ffb000': { dim: '#b37a00', bright: '#ffd566', glow: '#ffb00033' },
    '#33ff33': { dim: '#1a9e1a', bright: '#88ff88', glow: '#33ff3333' },
    '#ff6633': { dim: '#b34422', bright: '#ff9966', glow: '#ff663333' },
    '#00ccff': { dim: '#0088aa', bright: '#66ddff', glow: '#00ccff33' },
    '#ffffff': { dim: '#999999', bright: '#ffffff', glow: '#ffffff22' },
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>({
        active_model: null,
        font_size: 16,
        scanline_intensity: 30,
        text_color: '#ffb000',
    });

    const applyTheme = useCallback((s: Settings) => {
        const root = document.documentElement;
        root.style.setProperty('--font-size', `${s.font_size}px`);
        root.style.setProperty('--scanline-intensity', `${s.scanline_intensity / 100}`);
        root.style.setProperty('--text-color', s.text_color);

        const colors = COLOR_MAP[s.text_color] || COLOR_MAP['#ffb000'];
        root.style.setProperty('--text-color-dim', colors.dim);
        root.style.setProperty('--text-color-bright', colors.bright);
        root.style.setProperty('--border-glow', colors.glow);
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const s: Settings = await invoke('get_settings');
            setSettings(s);
            applyTheme(s);
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }, [applyTheme]);

    const updateSettings = useCallback(async (partial: Partial<Settings>) => {
        const updated = { ...settings, ...partial };
        setSettings(updated);
        applyTheme(updated);
        try {
            await invoke('save_settings', { settings: updated });
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }, [settings, applyTheme]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return { settings, updateSettings };
}
