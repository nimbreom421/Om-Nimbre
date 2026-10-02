import React, { useState } from 'react';
import { Conversation, User } from '../types';
import { GeminiLogo } from './GeminiLogo';
import {
  Plus,
  MessageSquare,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  Code2,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onPinConversation: (id: string, pinned: boolean) => void;
  onDeleteConversation: (id: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentView: 'chat' | 'dashboard' | 'backend';
  onSelectView: (view: 'chat' | 'dashboard' | 'backend') => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onPinConversation,
  onDeleteConversation,
  user,
  onOpenAuth,
  onLogout,
  currentView,
  onSelectView,
  isOpen,
  onToggleOpen,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filteredConversations.filter(c => c.pinned === 1);
  const unpinned = filteredConversations.filter(c => c.pinned !== 1);

  // Group unpinned by time
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const today = unpinned.filter(c => now - new Date(c.updated_at).getTime() < oneDay);
  const pastWeek = unpinned.filter(c => {
    const diff = now - new Date(c.updated_at).getTime();
    return diff >= oneDay && diff < sevenDays;
  });
  const older = unpinned.filter(c => now - new Date(c.updated_at).getTime() >= sevenDays);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConvItem = (conv: Conversation) => {
    const isActive = currentView === 'chat' && conv.id === activeConversationId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (!isEditing) {
            onSelectView('chat');
            onSelectConversation(conv.id);
          }
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
          isActive
            ? 'bg-[#282a2c] text-neutral-100 font-medium'
            : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {conv.pinned === 1 ? (
            <Pin size={14} className="text-amber-400 flex-shrink-0" />
          ) : (
            <MessageSquare size={14} className="flex-shrink-0 text-neutral-500 group-hover:text-neutral-300" />
          )}

          {isEditing ? (
            <form onSubmit={e => saveRename(conv.id, e)} className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
                className="bg-[#1e1f20] border border-blue-500/60 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
              />
              <button type="submit" className="p-1 hover:text-emerald-400">
                <Check size={13} />
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="p-1 hover:text-rose-400">
                <X size={13} />
              </button>
            </form>
          ) : (
            <span className="truncate text-[13px]">{conv.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 ml-2 text-neutral-400">
            <button
              onClick={e => {
                e.stopPropagation();
                onPinConversation(conv.id, conv.pinned !== 1);
              }}
              className="p-1 hover:text-amber-400 rounded transition-colors"
              title={conv.pinned === 1 ? 'Unpin' : 'Pin'}
            >
              <Pin size={13} className={conv.pinned === 1 ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
            <button
              onClick={e => startRename(conv, e)}
              className="p-1 hover:text-white rounded transition-colors"
              title="Rename"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                if (confirm('Delete this conversation?')) {
                  onDeleteConversation(conv.id);
                }
              }}
              className="p-1 hover:text-rose-400 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          onClick={onToggleOpen}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-[#1e1f20] border-r border-white/5 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <GeminiLogo size={24} />
            <span className="font-semibold text-neutral-200 text-sm tracking-wide">Gemini Studio</span>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation Switchers: Chat, Dashboard, Backend */}
        <div className="px-3 pt-3 pb-2 space-y-1">
          <button
            onClick={() => onSelectView('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              currentView === 'chat'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            <MessageSquare size={15} />
            <span>Chat Session</span>
          </button>

          <button
            onClick={() => onSelectView('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              currentView === 'dashboard'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Interactions Dashboard</span>
          </button>

          <button
            onClick={() => onSelectView('backend')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              currentView === 'backend'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            <Code2 size={15} />
            <span>Python & MySQL Engine</span>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-2">
          <button
            onClick={() => {
              onSelectView('chat');
              onNewChat();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-[#282a2c] hover:bg-[#333538] text-neutral-200 text-xs font-medium border border-white/10 shadow-sm transition-all group"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={14} />
            </div>
            <span>New chat</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-[#131314] border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No conversations found
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {pinned.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Pin size={10} className="text-amber-400" />
                    <span>Pinned</span>
                  </div>
                  <div className="space-y-0.5">{pinned.map(renderConvItem)}</div>
                </div>
              )}

              {/* Today section */}
              {today.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Today
                  </div>
                  <div className="space-y-0.5">{today.map(renderConvItem)}</div>
                </div>
              )}

              {/* Past 7 days */}
              {pastWeek.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Previous 7 Days
                  </div>
                  <div className="space-y-0.5">{pastWeek.map(renderConvItem)}</div>
                </div>
              )}

              {/* Older */}
              {older.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Older
                  </div>
                  <div className="space-y-0.5">{older.map(renderConvItem)}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Session Footer */}
        <div className="p-3 border-t border-white/5 bg-[#171819]">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-neutral-200 truncate">{user.username}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <ShieldCheck size={14} />
              <span>Sign in / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
