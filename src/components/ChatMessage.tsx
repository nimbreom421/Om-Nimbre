import React, { useState } from 'react';
import { Message } from '../types';
import { GeminiLogo } from './GeminiLogo';
import { Copy, Check, Volume2, ThumbsUp, ThumbsDown, User as UserIcon, Sparkles } from 'lucide-react';
import { marked } from 'marked';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      // Clean markdown tags for natural speech
      const cleanText = message.content.replace(/[#*`_~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Safe markdown render
  const renderMarkdown = (raw: string) => {
    try {
      return { __html: marked.parse(raw, { gfm: true, breaks: true }) as string };
    } catch (e) {
      return { __html: raw };
    }
  };

  return (
    <div
      className={`group w-full max-w-4xl mx-auto py-5 px-4 sm:px-6 transition-all duration-200 ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      <div className={`flex items-start gap-4 max-w-[92%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <UserIcon size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1e1f20] border border-white/10 flex items-center justify-center shadow-lg">
              <GeminiLogo size={20} animated={isStreaming} />
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          {/* Header info */}
          <div className={`flex items-center gap-2 mb-1.5 text-xs text-neutral-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="font-medium text-neutral-300">{isUser ? 'You' : 'Gemini 3.8 Flash'}</span>
            <span>•</span>
            <span>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.tokens_used > 0 && (
              <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-neutral-400">
                ~{message.tokens_used} tok
              </span>
            )}
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all text-[15px] ${
              isUser
                ? 'bg-[#2b2c2f] text-neutral-100 rounded-tr-sm shadow-md'
                : 'bg-transparent text-neutral-200 -ml-2'
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            ) : (
              <div className="relative">
                <div
                  className="prose-gemini overflow-x-auto"
                  dangerouslySetInnerHTML={renderMarkdown(message.content)}
                />
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Assistant Actions Bar */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1 mt-2 text-neutral-400 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                title="Copy response"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied && <span className="text-[11px] text-emerald-400">Copied</span>}
              </button>

              <button
                onClick={handleSpeak}
                className={`p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${
                  isSpeaking ? 'text-blue-400 bg-blue-500/10' : ''
                }`}
                title="Read aloud"
              >
                <Volume2 size={14} />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${
                  feedback === 'up' ? 'text-emerald-400 bg-emerald-500/10' : ''
                }`}
                title="Good response"
              >
                <ThumbsUp size={14} />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${
                  feedback === 'down' ? 'text-rose-400 bg-rose-500/10' : ''
                }`}
                title="Bad response"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
