import { useEffect, useState } from "react";
import "./App.css";
import { Command } from '@tauri-apps/plugin-shell';
import ReactMarkdown from 'react-markdown';

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any>([]);
  const [isServerReady, setIsServerReady] = useState(false);

  // Health check: We have this in here to make sure the server is running
  // with the model successfully loaded before inference.
  const checkServerHealth = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8080/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const runLlamaServer = async () => {
      try {
        const command = Command.sidecar('runtime/llama-cpp/bin/llama-server', ['-hf', 'ggml-org/gemma-3-1b-it-GGUF']);
        
        command.on('close', data => {
          console.log(`Server finished with code ${data.code} and signal ${data.signal}`);
        });
        
        command.on('error', error => {
          console.error(`Server error: "${error}"`);
        });
        
        command.stdout.on('data', line => {
          console.log(`Server stdout: "${line}"`);
        });
        
        command.stderr.on('data', line => {
          console.log(`Server stderr: "${line}"`);
        });

        const child = await command.spawn();
        console.log('Server started with PID:', child.pid);
      } catch (error) {
        console.error('Failed to start llama server:', error);
      }
    };
    
    runLlamaServer();

    // Start health check polling
    const healthCheckInterval = setInterval(async () => {
      const isHealthy = await checkServerHealth();
      setIsServerReady(isHealthy);
    }, 2000); // Check every 2 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(healthCheckInterval);
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev: any) => [...prev, userMessage]);

    // Format the conversation history with token delimiters
    const conversationHistory = messages.concat(userMessage)
      .map((msg: any) => `<start_of_turn>${msg.role}\n${msg.content}<end_of_turn>\n`)
      .join('');
    
    try {
      const response = await fetch('http://127.0.0.1:8080/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `<bos>${conversationHistory}<start_of_turn>model\n`,
          n_predict: 512,
        })
      });

      const data = await response.json();
      console.log(data);
      const assistantMessage = { 
        role: "assistant", 
        content: data.content || String(data) 
      };
      setMessages((prev: any) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling LLM server:', error);
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error while processing your request." 
      };
      setMessages((prev: any) => [...prev, errorMessage]);
    }

    setInput("");
  }

  if (!isServerReady) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div className="loading-spinner"></div>
        <p>Waiting for LLM server to start...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh" }}>
      {/* Main Chat Area */}
      <main
        className="chat-container"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
          overflow: "hidden",
        }}
      >
        <div
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "1rem",
            paddingRight: "0.5rem",
          }}
        >
          {messages.map((msg: any, index: any) => (
            <div
              key={index}
              style={{
                margin: "0.5rem 0",
                textAlign: msg.role === "user" ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: msg.role === "user" ? "#daf0ff" : "#eee",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  maxWidth: "70%",
                  textAlign: "left"
                }}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={sendMessage}
          style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Send a message..."
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button type="submit" style={{ padding: "0.75rem 1rem" }}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
