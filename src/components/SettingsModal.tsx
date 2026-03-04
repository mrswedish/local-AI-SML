import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useModels } from '../hooks/useModels';

interface Settings {
    active_model: string | null;
    font_size: number;
    scanline_intensity: number;
    text_color: string;
}

interface SettingsModalProps {
    settings: Settings;
    onUpdate: (partial: Partial<Settings>) => void;
    onClose: () => void;
}

const COLOR_PRESETS = [
    { color: '#ffb000', label: 'Amber' },
    { color: '#33ff33', label: 'Grön' },
    { color: '#ff6633', label: 'Orange' },
    { color: '#00ccff', label: 'Cyan' },
    { color: '#ffffff', label: 'Vit' },
];

export function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
    const { models, loadModels, formatSize } = useModels();

    useEffect(() => {
        loadModels();
    }, [loadModels]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="settings-modal">
                <div className="settings-header">
                    <h2>⚙ Inställningar</h2>
                    <button className="settings-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="settings-body">
                    {/* AI Model */}
                    <div className="settings-section">
                        <h3>AI-Modell</h3>
                        <div className="setting-row">
                            <label>Aktiv modell</label>
                            <select
                                value={settings.active_model || ''}
                                onChange={(e) => onUpdate({ active_model: e.target.value || null })}
                            >
                                <option value="">Ingen modell vald</option>
                                {models.map((model) => (
                                    <option key={model.filename} value={model.path}>
                                        {model.name} ({formatSize(model.size_bytes)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {models.length === 0 && (
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--text-color-dim)',
                                opacity: 0.7,
                                marginTop: '8px',
                            }}>
                                Inga modeller hittades. Placera GGUF-filer i:
                                <br />
                                <code style={{ fontSize: '11px' }}>~/.sumrzr/models/</code>
                            </p>
                        )}
                    </div>

                    {/* Display Settings */}
                    <div className="settings-section">
                        <h3>Grafik</h3>

                        <div className="setting-row">
                            <label>Textstorlek</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="range"
                                    min={12}
                                    max={24}
                                    value={settings.font_size}
                                    onChange={(e) => onUpdate({ font_size: parseInt(e.target.value) })}
                                />
                                <span className="range-value">{settings.font_size}px</span>
                            </div>
                        </div>

                        <div className="setting-row">
                            <label>Scanline-intensitet</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={settings.scanline_intensity}
                                    onChange={(e) => onUpdate({ scanline_intensity: parseInt(e.target.value) })}
                                />
                                <span className="range-value">{settings.scanline_intensity}%</span>
                            </div>
                        </div>

                        <div className="setting-row">
                            <label>Textfärg</label>
                            <div className="color-presets">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.color}
                                        className={`color-preset ${settings.text_color === preset.color ? 'active' : ''}`}
                                        style={{ backgroundColor: preset.color }}
                                        onClick={() => onUpdate({ text_color: preset.color })}
                                        title={preset.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div className="settings-section">
                        <h3>Om</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-color-dim)', lineHeight: '1.8' }}>
                            Sumrzr v0.1.0
                            <br />
                            Lokal AI-mötessummerare
                            <br />
                            Byggd med Tauri + React + llama.cpp
                            <br />
                            Dina data stannar på din dator.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
