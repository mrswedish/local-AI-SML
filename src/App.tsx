import { useState } from 'react';
import './styles/theme.css';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputBar } from './components/InputBar';
import { SettingsModal } from './components/SettingsModal';
import { TerminalHeader } from './components/TerminalHeader';
import { useSessions } from './hooks/useSessions';
import { useSettings } from './hooks/useSettings';
import { AlertTriangle } from 'lucide-react';

function App() {
  const {
    sessions,
    activeSessionId,
    messages,
    selectSession,
    createSession,
    deleteSession,
    addMessage,
  } = useSessions();

  const { settings, updateSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleSend = async (content: string) => {
    if (!activeSessionId) {
      // Auto-create session if none active
      const session = await createSession();
      if (!session) return;
      // Brief delay to allow state to update
      setTimeout(() => handleSendToSession(session.id, content), 100);
      return;
    }
    await handleSendToSession(activeSessionId, content);
  };

  const handleSendToSession = async (_sessionId: string, content: string) => {
    // Save user message
    await addMessage('user', content);

    // TODO: Implement actual LLM inference via llama-cpp-2
    // For now, show a placeholder response
    setIsGenerating(true);

    setTimeout(async () => {
      await addMessage(
        'assistant',
        'Tack för ditt meddelande! LLM-inferens är inte ännu implementerad. ' +
        'Placera en GGUF-modell i `~/.sumrzr/models/` och välj den i inställningarna för att aktivera AI-svar.'
      );
      setIsGenerating(false);
    }, 1500);
  };

  const handleNewChat = async () => {
    await createSession();
  };

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="main-area">
        <TerminalHeader
          activeModel={settings.active_model}
          sessionName={activeSession?.name}
        />

        {!settings.active_model && activeSessionId && (
          <div className="no-model-banner">
            <AlertTriangle size={14} />
            Ingen AI-modell vald. Gå till Inställningar för att välja en modell.
          </div>
        )}

        <ChatArea
          messages={messages}
          isGenerating={isGenerating}
          activeSessionId={activeSessionId}
        />

        {activeSessionId && (
          <InputBar
            onSend={handleSend}
            disabled={isGenerating}
          />
        )}
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
