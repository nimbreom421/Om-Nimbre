import { User, Conversation, Message, DashboardStats, SqlLog, BackendCodeFiles } from '../types';

const TOKEN_KEY = 'gemini_auth_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(path, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  },

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  },

  async register(email: string, username: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    this.setToken(data.token);
    return data;
  },

  async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.clearToken();
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/api/conversations');
  },

  async createConversation(title?: string): Promise<Conversation> {
    return this.request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Chat' }),
    });
  },

  async getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
    return this.request<Conversation & { messages: Message[] }>(`/api/conversations/${id}`);
  },

  async updateConversation(
    id: string,
    updates: Partial<Pick<Conversation, 'title' | 'pinned' | 'archived'>>
  ): Promise<Conversation> {
    return this.request<Conversation>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteConversation(id: string): Promise<void> {
    await this.request(`/api/conversations/${id}`, { method: 'DELETE' });
  },

  // Chat Streaming via SSE
  async sendChatMessageStream(
    params: {
      conversation_id?: string;
      message: string;
      webSearch?: boolean;
    },
    onChunk: (chunk: string) => void,
    onDone: (aiMsg: Message, totalTokens: number) => void,
    onError: (err: string) => void
  ) {
    const token = this.getToken();
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          conversation_id: params.conversation_id,
          message: params.message,
          webSearch: params.webSearch,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('ReadableStream not supported');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'chunk') {
                onChunk(parsed.text);
              } else if (parsed.type === 'done') {
                onDone(parsed.message, parsed.total_tokens);
              } else if (parsed.type === 'error') {
                onError(parsed.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE chunk:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message || 'Stream connection failed');
    }
  },

  // Dashboard & SQL
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/dashboard/stats');
  },

  async getSqlLogs(): Promise<SqlLog[]> {
    return this.request<SqlLog[]>('/api/dashboard/sql-logs');
  },

  async runRawSql(sql: string): Promise<{ success: boolean; data?: any; error?: string; rowCount?: number }> {
    return this.request('/api/dashboard/run-sql', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
  },

  async getBackendCode(): Promise<BackendCodeFiles> {
    return this.request<BackendCodeFiles>('/api/backend/code');
  },
};
