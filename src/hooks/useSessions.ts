import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Message {
    role: string;
    content: string;
    timestamp: string;
}

interface SessionInfo {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export function useSessions() {
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    const loadSessions = useCallback(async () => {
        try {
            const list: SessionInfo[] = await invoke('list_sessions');
            setSessions(list);
        } catch (e) {
            console.error('Failed to load sessions:', e);
        }
    }, []);

    const loadMessages = useCallback(async (sessionId: string) => {
        try {
            const msgs: Message[] = await invoke('get_session_messages', { sessionId });
            setMessages(msgs);
        } catch (e) {
            console.error('Failed to load messages:', e);
        }
    }, []);

    const selectSession = useCallback(async (sessionId: string) => {
        setActiveSessionId(sessionId);
        await loadMessages(sessionId);
    }, [loadMessages]);

    const createSession = useCallback(async (name?: string) => {
        try {
            const info: SessionInfo = await invoke('create_session', {
                name: name || `Session ${new Date().toLocaleString('sv-SE')}`,
            });
            await loadSessions();
            setActiveSessionId(info.id);
            setMessages([]);
            return info;
        } catch (e) {
            console.error('Failed to create session:', e);
        }
    }, [loadSessions]);

    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            await invoke('delete_session', { sessionId });
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
            }
            await loadSessions();
        } catch (e) {
            console.error('Failed to delete session:', e);
        }
    }, [activeSessionId, loadSessions]);

    const addMessage = useCallback(async (role: string, content: string) => {
        if (!activeSessionId) return;
        try {
            await invoke('add_message', {
                sessionId: activeSessionId,
                role,
                content,
            });
            await loadMessages(activeSessionId);
            await loadSessions(); // Update timestamps
        } catch (e) {
            console.error('Failed to add message:', e);
        }
    }, [activeSessionId, loadMessages, loadSessions]);

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    return {
        sessions,
        activeSessionId,
        messages,
        setMessages,
        selectSession,
        createSession,
        deleteSession,
        addMessage,
        loadSessions,
    };
}
