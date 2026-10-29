import React from 'react';
import { GeminiLogo } from './GeminiLogo';
import { Menu, MessageSquare, LayoutDashboard, Code2, Sparkles, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  title: string;
  currentView: 'chat' | 'dashboard' | 'backend';
  onSelectView: (view: 'chat' | 'dashboard' | 'backend') => void;
  user: User | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  title,
  currentView,
  onSelectView,
  user,
  onOpenAuth,
}) => {
  return (
    <header className="h-14 border-b border-white/5 bg-[#131314]/90 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
      {/* Left: Sidebar toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <GeminiLogo size={20} />
          <span className="font-medium text-sm text-neutral-200 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {title || 'OMAI'}
          </span>
        </div>
      </div>

      {/* Center: View Switcher */}
      <div className="hidden sm:flex items-center bg-[#1e1f20] border border-white/5 p-1 rounded-full text-xs">
        <button
          onClick={() => onSelectView('chat')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
            currentView === 'chat'
              ? 'bg-[#282a2c] text-neutral-100 font-medium shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare size={13} />
          <span>Chat</span>
        </button>

        <button
          onClick={() => onSelectView('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
            currentView === 'dashboard'
              ? 'bg-[#282a2c] text-neutral-100 font-medium shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <LayoutDashboard size={13} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectView('backend')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
            currentView === 'backend'
              ? 'bg-[#282a2c] text-neutral-100 font-medium shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Code2 size={13} />
          <span>Python & MySQL</span>
        </button>
      </div>

      {/* Right: Model status / Auth button */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
          <Sparkles size={11} className="text-blue-400" />
          <span>Active</span>
        </div>

        {user ? (
          <button
            onClick={() => onSelectView('dashboard')}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border border-white/5 transition-colors text-xs text-neutral-300"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[80px] hidden sm:inline">{user.username}</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-200 text-xs font-medium transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};
