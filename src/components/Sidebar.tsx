
import { Plus, Trash2, Settings } from 'lucide-react';

interface SessionInfo {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

interface SidebarProps {
    sessions: SessionInfo[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    onOpenSettings: () => void;
}

export function Sidebar({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onOpenSettings,
}: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1>Sumrzr</h1>
                <span className="version">v0.1.0 – Mötessummerare</span>
                <button className="new-chat-btn" onClick={onNewChat}>
                    <Plus size={16} />
                    Ny chatt
                </button>
            </div>

            <div className="session-list">
                {sessions.length === 0 && (
                    <div style={{
                        padding: '20px 12px',
                        fontSize: '12px',
                        color: 'var(--text-color-dim)',
                        opacity: 0.5,
                        textAlign: 'center',
                    }}>
                        Inga sessioner ännu.
                        <br />
                        Klicka "Ny chatt" för att börja.
                    </div>
                )}
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                        onClick={() => onSelectSession(session.id)}
                    >
                        <span className="session-name">{session.name}</span>
                        <button
                            className="delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                            }}
                            title="Radera session"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                <button className="settings-btn" onClick={onOpenSettings}>
                    <Settings size={16} />
                    Inställningar
                </button>
            </div>
        </aside>
    );
}
