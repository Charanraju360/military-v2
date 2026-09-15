import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function AssistantPage() {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("osint_assistant_session_id") || null;
  });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Load message history if session exists
  useEffect(() => {
    if (!sessionId) return;
    const loadHistory = async () => {
      try {
        const data = await apiClient.fetchSessionMessages(sessionId);
        setMessages(data.items || []);
      } catch (err) {
        console.error("Failed to load session history:", err);
      }
    };
    loadHistory();
  }, [sessionId]);

  const handleNewChat = () => {
    localStorage.removeItem("osint_assistant_session_id");
    setSessionId(null);
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setSending(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg = { role: "user", text: userText };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await apiClient.sendChatMessage(userText, sessionId);

      if (response.session_id) {
        setSessionId(response.session_id);
        localStorage.setItem("osint_assistant_session_id", response.session_id);
      }

      const assistantMsg = {
        role: "assistant",
        text: response.answer,
        citations: response.citations || [],
        answer_source: response.answer_source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Assistant Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🤖</span> OSINT Intelligence Assistant
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ask questions about ingested military events. Answers are strictly grounded in event intelligence.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleNewChat}>
            + New Chat
          </Button>
        </div>

        {/* Chat Thread Container */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col justify-between space-y-4 min-h-[450px]">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400 my-auto">
                <div className="text-4xl">🛰️</div>
                <h3 className="font-bold text-slate-200">Start a conversation</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Try asking "What military drills happened recently?" or "Were there any air strikes in the region?"
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-xl p-4 text-sm leading-relaxed space-y-2 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Assistant Source Label / Citations */}
                    {msg.role === "assistant" && (
                      <div className="pt-2 border-t border-slate-700/60 text-xs space-y-1.5">
                        {msg.answer_source === "fallback_excerpt" && (
                          <p className="text-amber-400 font-semibold text-[11px]">
                            ⚠️ (from stored summary — AI was unavailable)
                          </p>
                        )}
                        {msg.answer_source === "no_match" && (
                          <p className="text-slate-400 text-[11px]">
                            ℹ️ No matching intelligence events retrieved.
                          </p>
                        )}

                        {/* Citation Chips */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-slate-400 text-[11px]">Citations:</span>
                            {msg.citations.map((citeId) => (
                              <button
                                key={citeId}
                                type="button"
                                onClick={() => navigate(`/events/${citeId}`)}
                                className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors"
                              >
                                🔗 Event #{citeId.slice(-6)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-xl p-3 text-xs animate-pulse">
                  Searching vector index & generating grounded answer...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-300 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Ask a question about military intelligence..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={sending}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <Button type="submit" variant="primary" disabled={sending || !inputMessage.trim()}>
              Send
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
