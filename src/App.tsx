/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { User, Conversation, Message } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { DashboardView } from './components/DashboardView';
import { BackendCodeView } from './components/BackendCodeView';
import { AuthModal } from './components/AuthModal';
import { GeminiLogo } from './components/GeminiLogo';
import {
  Sparkles,
  Code2,
  Database,
  Lightbulb,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'backend'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isStreaming]);

  // Initial user check and load conversations
  useEffect(() => {
    const init = async () => {
      try {
        if (api.getToken()) {
          const userData = await api.getMe();
          setUser(userData);
          loadConversations();
        } else {
          // Auto-login with Demo Account so user immediately has full working app with SQL database!
          try {
            const demoRes = await api.login('demo@gemini.ai', 'Gemini2026!');
            setUser(demoRes.user);
            loadConversations();
          } catch (demoErr) {
            console.error('Demo auto-login error:', demoErr);
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
        api.clearToken();
      }
    };
    init();
  }, []);

  const loadConversations = async () => {
    try {
      const convList = await api.getConversations();
      setConversations(convList);
      if (convList.length > 0 && !activeConvId) {
        selectConversation(convList[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setLoadingChat(true);
    try {
      const convData = await api.getConversation(id);
      setMessages(convData.messages || []);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(undefined);
    setMessages([]);
    setCurrentView('chat');
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await api.updateConversation(id, { title: newTitle });
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error('Rename conversation failed:', err);
    }
  };

  const handlePinConversation = async (id: string, pinned: boolean) => {
    try {
      await api.updateConversation(id, { pinned: pinned ? 1 : 0 });
      loadConversations();
    } catch (err) {
      console.error('Pin conversation failed:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Delete conversation failed:', err);
    }
  };

  const handleSendMessage = async (text: string, webSearch: boolean) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    if (!text.trim() || isStreaming) return;

    // Temporary optimistic user message
    const tempUserMsg: Message = {
      id: 'temp_u_' + Date.now(),
      conversation_id: activeConvId || 'pending',
      role: 'user',
      content: text,
      tokens_used: Math.max(3, Math.ceil(text.length / 4)),
      created_at: new Date().toISOString(),
    };

    // Temporary placeholder AI message for streaming
    const tempAiMsg: Message = {
      id: 'temp_ai_' + Date.now(),
      conversation_id: activeConvId || 'pending',
      role: 'model',
      content: '',
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg, tempAiMsg]);
    setIsStreaming(true);

    let streamText = '';

    await api.sendChatMessageStream(
      {
        conversation_id: activeConvId,
        message: text,
        webSearch,
      },
      (chunk: string) => {
        streamText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: streamText,
            };
          }
          return updated;
        });
      },
      (finalAiMsg: Message, totalTokens: number) => {
        setIsStreaming(false);
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            updated[lastIdx] = finalAiMsg;
          }
          return updated;
        });
        if (!activeConvId && finalAiMsg.conversation_id) {
          setActiveConvId(finalAiMsg.conversation_id);
        }
        loadConversations();
      },
      (errorMsg: string) => {
        setIsStreaming(false);
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: `⚠️ Error: ${errorMsg}. Please verify connection or try again.`,
            };
          }
          return updated;
        });
      }
    );
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  // Suggested prompt chips for the blank state
  const suggestions = [
    {
      title: 'Write Python & MySQL Code',
      desc: 'Create an async FastAPI connection pool with PyMySQL',
      icon: <Code2 size={16} className="text-blue-400" />,
      prompt: 'Write a clean Python script using FastAPI and PyMySQL to securely connect to a MySQL database, query user conversation history, and return results with error handling.',
    },
    {
      title: 'Optimize SQL Schema',
      desc: 'Add indexing and foreign key constraints for chat messages',
      icon: <Database size={16} className="text-emerald-400" />,
      prompt: 'How should I design and index MySQL tables for a high-traffic AI chatbot handling millions of messages and user sessions?',
    },
    {
      title: 'Explain Quantum Computing',
      desc: 'Simple analogies for superposition and entanglement',
      icon: <Lightbulb size={16} className="text-amber-400" />,
      prompt: 'Explain quantum computing, superposition, and quantum entanglement using clear, simple real-world analogies.',
    },
    {
      title: 'Creative Sci-Fi Prompt',
      desc: 'A story about a conscious planetary satellite network',
      icon: <Compass size={16} className="text-purple-400" />,
      prompt: 'Write an atmospheric sci-fi opening scene about an orbital satellite constellation that unexpectedly achieves collective sentience.',
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#131314] text-neutral-100 select-none">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onPinConversation={handlePinConversation}
        onDeleteConversation={handleDeleteConversation}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={async () => {
          await api.logout();
          setUser(null);
          setConversations([]);
          setMessages([]);
          setActiveConvId(undefined);
        }}
        currentView={currentView}
        onSelectView={view => setCurrentView(view)}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Navigation Bar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          title={
            currentView === 'chat'
              ? activeConversation?.title || 'Gemini 3.8 Flash'
              : currentView === 'dashboard'
              ? 'Interactions Dashboard'
              : 'Python & MySQL Engine'
          }
          currentView={currentView}
          onSelectView={view => setCurrentView(view)}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* View Routing */}
        {currentView === 'dashboard' ? (
          <DashboardView
            user={user}
            onOpenChat={(convId: string) => {
              setCurrentView('chat');
              selectConversation(convId);
            }}
          />
        ) : currentView === 'backend' ? (
          <BackendCodeView />
        ) : (
          /* Chat View */
          <div className="flex-1 flex flex-col h-full min-h-0 relative select-text">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-2">
              {loadingChat ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <GeminiLogo size={32} animated />
                    <span className="text-xs text-neutral-400">Loading conversation history...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                /* Gemini Welcome State */
                <div className="h-full max-w-4xl mx-auto flex flex-col justify-center items-start px-4 sm:px-8 py-10">
                  <div className="mb-8 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400">
                      <Sparkles size={13} className="text-blue-400" />
                      <span>Google GenAI • Python & MySQL Backend</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mt-4">
                      Hello,{' '}
                      <span className="gemini-gradient-text">
                        {user ? user.username.split(' ')[0] : 'Explorer'}
                      </span>
                    </h1>
                    <p className="text-2xl sm:text-4xl font-normal text-neutral-400">
                      How can I help you today?
                    </p>
                  </div>

                  {/* Suggestion Chips Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mt-4">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.prompt, false)}
                        className="group p-4 rounded-2xl bg-[#1e1f20] hover:bg-[#282a2c] border border-white/5 hover:border-white/15 text-left transition-all flex items-start justify-between shadow-md"
                      >
                        <div className="space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span className="text-xs font-semibold text-neutral-200">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[12px] text-neutral-400 leading-snug">{item.desc}</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center text-neutral-400 group-hover:text-white transition-all flex-shrink-0 mt-0.5">
                          <ArrowRight size={13} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message List */
                <div className="space-y-1">
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id || index}
                      message={msg}
                      isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'model'}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isStreaming}
              placeholder={
                messages.length === 0
                  ? 'Ask Gemini anything... (e.g. Write a Python script to query MySQL)'
                  : 'Reply to Gemini...'
              }
            />
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={newUser => {
          setUser(newUser);
          loadConversations();
        }}
      />
    </div>
  );
}
