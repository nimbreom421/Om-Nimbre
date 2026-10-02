import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Mic, MicOff, Sparkles, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, webSearch: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Ask Gemini anything... (e.g. Write a Python script to query MySQL)',
}) => {
  const [text, setText] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim(), webSearch);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Web Speech API for voice dictation
  const toggleSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(prev => (prev ? prev + ' ' : '') + transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6">
      <div className="relative rounded-2xl sm:rounded-3xl bg-[#1e1f20] border border-white/10 hover:border-white/20 focus-within:border-blue-500/60 shadow-xl transition-all p-3 sm:p-4">
        {/* Input box */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-[15px] focus:outline-none resize-none min-h-[44px] max-h-[180px] leading-relaxed"
        />

        {/* Action toolbar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs text-neutral-400">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Model Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300">
              <Sparkles size={12} className="text-blue-400" />
              <span className="font-medium text-[11px]">gemini-3.8-flash</span>
            </div>

            {/* Web Search toggle */}
            <button
              type="button"
              onClick={() => setWebSearch(!webSearch)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] font-medium ${
                webSearch
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-neutral-300'
              }`}
            >
              <Globe size={12} className={webSearch ? 'text-blue-400' : ''} />
              <span>Search Grounding</span>
            </button>

            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                title="Clear input"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleSpeech}
              className={`p-2 rounded-full transition-all ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : 'hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
              title={isRecording ? 'Stop recording' : 'Dictate voice'}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!text.trim() || disabled}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                text.trim() && !disabled
                  ? 'bg-white text-neutral-900 hover:bg-neutral-200 shadow-lg cursor-pointer transform active:scale-95'
                  : 'bg-white/10 text-neutral-500 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
