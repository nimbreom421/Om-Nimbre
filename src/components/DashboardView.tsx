import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats, SqlLog, User } from '../types';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Clock,
  Database,
  Search,
  Download,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileJson,
  FileText,
} from 'lucide-react';

interface DashboardViewProps {
  user: User | null;
  onOpenChat: (convId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onOpenChat }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sqlLogs, setSqlLogs] = useState<SqlLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interactionSearch, setInteractionSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'model'>('all');

  // Interactive SQL Console State
  const [rawSql, setRawSql] = useState('SELECT * FROM conversations LIMIT 10;');
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statsData, logsData] = await Promise.all([
        api.getDashboardStats(),
        api.getSqlLogs(),
      ]);
      setStats(statsData);
      setSqlLogs(logsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const runSqlConsole = async () => {
    if (!rawSql.trim()) return;
    setQueryRunning(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await api.runRawSql(rawSql);
      if (res.success) {
        setQueryResult(res.data);
      } else {
        setQueryError(res.error || 'SQL query error');
      }
      // Refresh SQL logs after running query
      const logs = await api.getSqlLogs();
      setSqlLogs(logs);
    } catch (err: any) {
      setQueryError(err.message || 'Execution failed');
    } finally {
      setQueryRunning(false);
    }
  };

  // Export conversations to JSON
  const exportAsJson = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-chat-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as Markdown
  const exportAsMarkdown = () => {
    if (!stats) return;
    let md = `# Gemini AI Interaction History Export\nExported on: ${new Date().toLocaleString()}\nUser: ${user?.username} (${user?.email})\n\n`;
    md += `## Metrics Summary\n- Total Conversations: ${stats.totalConversations}\n- Total Prompts: ${stats.totalPrompts}\n- Total AI Responses: ${stats.totalAiResponses}\n- Total Estimated Tokens: ${stats.totalTokens}\n\n`;
    md += `## Past Interactions Log\n\n`;
    stats.recentInteractions.forEach(item => {
      md += `### [${item.role.toUpperCase()}] in "${item.conversation_title}" (${new Date(item.created_at).toLocaleString()})\n`;
      md += `\`\`\`\n${item.preview}\n\`\`\`\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-interactions-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInteractions = (stats?.recentInteractions || []).filter(item => {
    const matchesSearch =
      item.preview.toLowerCase().includes(interactionSearch.toLowerCase()) ||
      item.conversation_title.toLowerCase().includes(interactionSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-400 text-sm">Loading interaction analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Interactions & Analytics Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time conversation telemetry, SQL relational store, and model performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 text-xs text-neutral-300 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportAsJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 text-xs text-neutral-300 transition-colors"
          >
            <FileJson size={13} className="text-amber-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={exportAsMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 text-xs text-neutral-300 transition-colors"
          >
            <FileText size={13} className="text-blue-400" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Total Conversations</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats?.totalConversations || 0}</div>
            <div className="text-[11px] text-neutral-500">Active threads stored</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">User Prompts Sent</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats?.totalPrompts || 0}</div>
            <div className="text-[11px] text-neutral-500">{stats?.totalAiResponses || 0} AI answers</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Zap size={22} />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Estimated Tokens</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats?.totalTokens.toLocaleString() || 0}</div>
            <div className="text-[11px] text-neutral-500">Across all turns</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Avg Answer Length</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats?.avgResponseLength || 0} <span className="text-xs font-normal text-neutral-400">chars</span></div>
            <div className="text-[11px] text-neutral-500">Concise & articulate</div>
          </div>
        </div>
      </div>

      {/* 7-Day Activity Chart */}
      <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
          <span>7-Day Interaction Activity</span>
          <span className="text-xs font-normal text-neutral-500">(Prompts vs Gemini Replies)</span>
        </h2>

        <div className="grid grid-cols-7 gap-2 pt-4 border-t border-white/5">
          {(stats?.dailyActivity || []).map((day, idx) => {
            const maxVal = Math.max(
              ...stats!.dailyActivity.map(d => Math.max(d.prompts, d.responses)),
              5
            );
            const promptHeight = Math.min(100, Math.round((day.prompts / maxVal) * 90));
            const responseHeight = Math.min(100, Math.round((day.responses / maxVal) * 90));

            const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
            });

            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="h-28 w-full flex items-end justify-center gap-1.5 pb-2">
                  {/* User Bar */}
                  <div
                    className="w-3 bg-blue-500 rounded-t transition-all hover:brightness-110"
                    style={{ height: `${Math.max(promptHeight, 4)}%` }}
                    title={`User Prompts: ${day.prompts}`}
                  />
                  {/* Model Bar */}
                  <div
                    className="w-3 bg-purple-500 rounded-t transition-all hover:brightness-110"
                    style={{ height: `${Math.max(responseHeight, 4)}%` }}
                    title={`AI Responses: ${day.responses}`}
                  />
                </div>
                <div className="text-[11px] text-neutral-400 font-medium">{dayLabel}</div>
                <div className="text-[10px] text-neutral-500">{day.prompts + day.responses} msgs</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-xs" />
            <span>User Prompts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-xs" />
            <span>Gemini Responses</span>
          </div>
        </div>
      </div>

      {/* Past Interactions Searchable Table */}
      <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Past Interaction History</h2>
            <p className="text-xs text-neutral-500">Query and inspect prompt records stored in the SQL database.</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
              <input
                type="text"
                value={interactionSearch}
                onChange={e => setInteractionSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-[#131314] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="bg-[#131314] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User Prompts</option>
              <option value="model">AI Replies</option>
            </select>
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131314] text-neutral-400 border-b border-white/5">
              <tr>
                <th className="py-2.5 px-4 font-medium">Role</th>
                <th className="py-2.5 px-4 font-medium">Conversation Thread</th>
                <th className="py-2.5 px-4 font-medium">Snippet Preview</th>
                <th className="py-2.5 px-4 font-medium">Tokens</th>
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-300">
              {filteredInteractions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    No matching past interactions found.
                  </td>
                </tr>
              ) : (
                filteredInteractions.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {item.role === 'user' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
                          User
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-medium">
                          Gemini
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-neutral-200 max-w-[150px] truncate">
                      {item.conversation_title}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-400 max-w-[280px] truncate font-mono text-[11px]">
                      {item.preview}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-400 whitespace-nowrap">
                      {item.tokens_used} tok
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenChat(item.conversation_id)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                      >
                        Open Chat →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive SQL Console & Live SQL Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive SQL Console */}
        <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-neutral-200">Interactive SQL Console</h2>
            </div>
            <span className="text-[11px] text-neutral-500">MySQL/SQLite Compatible</span>
          </div>

          <div className="relative mb-3 flex-1">
            <textarea
              value={rawSql}
              onChange={e => setRawSql(e.target.value)}
              rows={3}
              placeholder="SELECT * FROM conversations LIMIT 5;"
              className="w-full bg-[#131314] font-mono text-xs text-blue-300 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-neutral-400">
              <span>Quick templates:</span>
              <button
                onClick={() => setRawSql('SELECT * FROM conversations LIMIT 5;')}
                className="hover:text-blue-400 underline"
              >
                conversations
              </button>
              <button
                onClick={() => setRawSql('SELECT * FROM messages LIMIT 5;')}
                className="hover:text-blue-400 underline"
              >
                messages
              </button>
              <button
                onClick={() => setRawSql('SELECT * FROM users LIMIT 5;')}
                className="hover:text-blue-400 underline"
              >
                users
              </button>
            </div>

            <button
              onClick={runSqlConsole}
              disabled={queryRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Play size={12} className={queryRunning ? 'animate-spin' : ''} />
              <span>Run SQL</span>
            </button>
          </div>

          {/* Results Area */}
          <div className="bg-[#131314] border border-white/5 rounded-xl p-3 max-h-48 overflow-auto font-mono text-xs">
            {queryRunning && <div className="text-neutral-500">Executing SQL query...</div>}
            {queryError && (
              <div className="text-rose-400 flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{queryError}</span>
              </div>
            )}
            {queryResult && (
              <pre className="text-neutral-300 whitespace-pre-wrap text-[11px]">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            )}
            {!queryRunning && !queryError && !queryResult && (
              <div className="text-neutral-600">Enter a SELECT query above and press "Run SQL".</div>
            )}
          </div>
        </div>

        {/* Live SQL Execution Logs */}
        <div className="p-5 rounded-2xl bg-[#1e1f20] border border-white/5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-neutral-200">Live SQL Activity Stream</h2>
            </div>
            <span className="text-[11px] text-neutral-500">Last 50 queries</span>
          </div>

          <div className="flex-1 bg-[#131314] border border-white/5 rounded-xl p-3 max-h-80 overflow-y-auto space-y-2 font-mono text-[11px]">
            {sqlLogs.length === 0 ? (
              <div className="text-neutral-600 text-center py-6">No queries recorded yet.</div>
            ) : (
              sqlLogs.map(log => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-[#18191a] border border-white/5 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="text-emerald-400 font-semibold">{log.status}</span>
                    <span className="text-neutral-400">{log.duration_ms} ms</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-neutral-300 break-all">{log.query}</div>
                  {log.params !== '[]' && (
                    <div className="text-neutral-500 text-[10px] truncate">Params: {log.params}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
