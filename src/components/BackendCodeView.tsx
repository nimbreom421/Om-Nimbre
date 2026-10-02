import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BackendCodeFiles } from '../types';
import { Code2, Database, FileText, Check, Copy, Download, Terminal, Server } from 'lucide-react';

export const BackendCodeView: React.FC = () => {
  const [files, setFiles] = useState<BackendCodeFiles | null>(null);
  const [activeTab, setActiveTab] = useState<'app.py' | 'database.sql' | 'requirements.txt' | 'README.md'>('app.py');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getBackendCode()
      .then(data => setFiles(data))
      .catch(err => console.error('Failed to load code files:', err))
      .finally(() => setLoading(false));
  }, []);

  const getActiveContent = () => {
    if (!files) return '';
    switch (activeTab) {
      case 'app.py':
        return files.appPy;
      case 'database.sql':
        return files.databaseSql;
      case 'requirements.txt':
        return files.requirementsTxt;
      case 'README.md':
        return files.readme;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getActiveContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Server size={22} className="text-blue-400" />
            <h1 className="text-2xl font-semibold text-white tracking-tight">Python & MySQL Architecture</h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Complete standalone Python backend (FastAPI) and MySQL 8.0 schema mirroring this live chatbot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 text-xs text-neutral-300 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy File'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download size={13} />
            <span>Download {activeTab}</span>
          </button>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#1e1f20] border border-white/5 space-y-1">
          <div className="font-semibold text-neutral-200 flex items-center gap-2">
            <Code2 size={15} className="text-blue-400" />
            <span>FastAPI + Google GenAI</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Asynchronous Python API with JWT authentication and official <code className="text-blue-300">google-genai</code> SDK using model <code className="text-neutral-300">gemini-3.8-flash</code>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1e1f20] border border-white/5 space-y-1">
          <div className="font-semibold text-neutral-200 flex items-center gap-2">
            <Database size={15} className="text-emerald-400" />
            <span>MySQL 8.0 Relational Store</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Relational tables for <code className="text-neutral-300">users</code>, <code className="text-neutral-300">conversations</code>, <code className="text-neutral-300">messages</code>, and <code className="text-neutral-300">sessions</code> with foreign keys.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1e1f20] border border-white/5 space-y-1">
          <div className="font-semibold text-neutral-200 flex items-center gap-2">
            <Terminal size={15} className="text-amber-400" />
            <span>Quick Local Execution</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Install dependencies via <code className="text-amber-300">pip install -r requirements.txt</code> and start with <code className="text-neutral-300">uvicorn app:app --reload</code>.
          </p>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="rounded-2xl bg-[#18191a] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-3 pt-2 bg-[#131314] border-b border-white/5 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('app.py')}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono transition-all border-b-2 ${
                activeTab === 'app.py'
                  ? 'bg-[#18191a] text-blue-400 border-blue-500 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <Code2 size={13} />
              <span>app.py (FastAPI)</span>
            </button>

            <button
              onClick={() => setActiveTab('database.sql')}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono transition-all border-b-2 ${
                activeTab === 'database.sql'
                  ? 'bg-[#18191a] text-emerald-400 border-emerald-500 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <Database size={13} />
              <span>database.sql (MySQL)</span>
            </button>

            <button
              onClick={() => setActiveTab('requirements.txt')}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono transition-all border-b-2 ${
                activeTab === 'requirements.txt'
                  ? 'bg-[#18191a] text-amber-400 border-amber-500 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <FileText size={13} />
              <span>requirements.txt</span>
            </button>

            <button
              onClick={() => setActiveTab('README.md')}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-mono transition-all border-b-2 ${
                activeTab === 'README.md'
                  ? 'bg-[#18191a] text-purple-400 border-purple-500 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <FileText size={13} />
              <span>README.md</span>
            </button>
          </div>

          <span className="text-[11px] text-neutral-500 font-mono pr-2 hidden sm:inline">
            UTF-8
          </span>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-x-auto max-h-[550px]">
          {loading ? (
            <div className="text-neutral-500 font-mono text-xs py-8 text-center">
              Loading source files...
            </div>
          ) : (
            <pre className="font-mono text-xs leading-relaxed text-neutral-200 whitespace-pre">
              {getActiveContent()}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
