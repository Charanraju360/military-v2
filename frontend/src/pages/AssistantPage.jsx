import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AssistantIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  RefreshIcon,
  ShieldIcon,
  SourcesIcon,
} from "../components/ui/Icons";

export default function AssistantPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const promptParam = urlParams.get("prompt") || "";

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("osint_assistant_session_id") || null;
  });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState(promptParam);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

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

  const handleNewSession = () => {
    localStorage.removeItem("osint_assistant_session_id");
    setSessionId(null);
    setMessages([]);
    setError(null);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    setInputMessage("");
    setSending(true);
    setError(null);

    // Optimistically add user query
    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await apiClient.sendChatMessage(text, sessionId);

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
      setError(err.message || "Failed to retrieve intelligence response.");
    } finally {
      setSending(false);
    }
  };

  const sampleQueries = [
    "Summarize recent naval drills and maritime movements in the Baltic Sea.",
    "What events involve air strikes or missile attacks reported this week?",
    "Identify which defense agreements or procurements were signed recently.",
    "Were there any conflicting reports regarding troop casualties or strike locations?",
  ];

  const getSourceModelTag = (source) => {
    switch (source) {
      case "qwen_primary":
        return { label: "Synthesized via Qwen3-14B", variant: "qwen_primary" };
      case "openrouter_secondary":
        return { label: "Synthesized via OpenRouter", variant: "openrouter_secondary" };
      case "structured_fallback":
        return { label: "Deterministic Structured Fallback", variant: "structured_fallback" };
      case "no_match":
        return { label: "No Matching Evidence Found", variant: "default" };
      default:
        return { label: "Grounded Synthesis", variant: "default" };
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Analytical Intelligence / RAG Query Workbench
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Intelligence Research Assistant
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Grounded, verifiable query engine interrogating the ingested military event index. All responses strictly cite member events.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              <span>Start New Inquiry</span>
            </Button>
          </div>
        </div>

        {/* Workbench Card */}
        <div className="flex-1 bg-[#FFFFFF] border border-[#E6E2DA] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden min-h-[520px]">
          {/* Messages Trail */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
            {messages.length === 0 ? (
              <div className="py-8 max-w-xl mx-auto space-y-5 text-center">
                <div className="w-10 h-10 mx-auto rounded border border-[#E0D9CD] bg-[#F7F5F0] flex items-center justify-center text-[#858078]">
                  <AssistantIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-medium text-base text-[#25231F]">
                    Analyst Inquiry Workspace
                  </h3>
                  <p className="text-xs text-[#706D66] leading-relaxed">
                    Submit analytical questions regarding events, armed forces, weapons systems, or geopolitical tensions.
                  </p>
                </div>

                {/* Pre-configured sample inquiries */}
                <div className="space-y-2 text-left pt-2">
                  <span className="text-[11px] font-mono uppercase text-[#858078] block text-center">
                    Suggested Analyst Queries
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sampleQueries.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        className="text-left p-3 rounded border border-[#E6E2DA] bg-[#FCFBF9] hover:bg-[#F2EFE8] text-xs text-[#47423B] transition-colors leading-relaxed"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const modelMeta = !isUser ? getSourceModelTag(msg.answer_source) : null;

                return (
                  <div
                    key={idx}
                    className={`space-y-1.5 ${isUser ? "pl-8 sm:pl-16" : "pr-4 sm:pr-12"}`}
                  >
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-[#858078]">
                      <span className="uppercase font-semibold text-[#25231F]">
                        {isUser ? "Analyst Query" : "Intelligence Synthesis"}
                      </span>
                      {!isUser && modelMeta && (
                        <>
                          <span>·</span>
                          <Badge variant={modelMeta.variant}>
                            {modelMeta.label}
                          </Badge>
                        </>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-md text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-[#F7F5F0] border border-[#E6E2DA] text-[#25231F] font-medium"
                          : "bg-[#FCFBF9] border border-[#E6E2DA] text-[#302E2A] space-y-3 font-serif"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Evidence Citations Footnote */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-3 border-t border-[#E8E4DC] font-sans space-y-2">
                          <span className="text-[11px] font-mono uppercase text-[#706D66] block">
                            Evidence Attribution & Citations:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((citeId) => (
                              <button
                                key={citeId}
                                type="button"
                                onClick={() => navigate(`/events/${citeId}`)}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#D5CFC3] bg-[#FFFFFF] hover:bg-[#F2EFE8] text-[11px] font-mono text-[#C96A4A] transition-colors"
                              >
                                <span>Report #{citeId.slice(-6)}</span>
                                <ChevronRightIcon size={11} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="space-y-1.5 pr-8">
                <span className="text-[11px] font-mono text-[#858078] uppercase">
                  Processing Query
                </span>
                <div className="p-4 rounded-md bg-[#FCFBF9] border border-[#E6E2DA] text-xs text-[#706D66] animate-pulse space-y-1">
                  <p>Interrogating ChromaDB semantic vector index & synthesizing collective event evidence...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-[#FDF2F2] border border-[#EFC7C7] rounded text-xs text-[#9B3838]">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-4 border-t border-[#E6E2DA] bg-[#FCFBF9]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about monitored military events, participating entities, weapons, or theatres..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sending}
                className="flex-1 bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#25231F] placeholder-[#8F8A80] focus:border-[#C96A4A] focus:outline-none transition-colors disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={sending || !inputMessage.trim()}
              >
                <span>Query</span>
                <ArrowRightIcon size={13} />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
