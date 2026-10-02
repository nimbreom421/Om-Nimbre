import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  salt: string;
  avatar_url?: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  pinned: number; // 0 or 1
  archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface SqlLog {
  id: string;
  query: string;
  params: string;
  duration_ms: number;
  timestamp: string;
  status: 'SUCCESS' | 'ERROR';
}

interface DatabaseState {
  users: User[];
  sessions: Session[];
  conversations: Conversation[];
  messages: Message[];
  sql_logs: SqlLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gemini_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Password hashing utilities using PBKDF2 (Cryptographically secure)
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

class SqlDatabase {
  private state: DatabaseState = {
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    sql_logs: [],
  };

  constructor() {
    this.load();
    this.seedDefaultData();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to load database, initializing fresh state:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save database to disk:', err);
    }
  }

  private logSql(query: string, params: any[], durationMs: number, status: 'SUCCESS' | 'ERROR' = 'SUCCESS') {
    const entry: SqlLog = {
      id: crypto.randomUUID(),
      query: query.trim(),
      params: JSON.stringify(params),
      duration_ms: Math.max(1, Math.round(durationMs)),
      timestamp: new Date().toISOString(),
      status,
    };
    this.state.sql_logs.unshift(entry);
    // Keep last 150 SQL logs
    if (this.state.sql_logs.length > 150) {
      this.state.sql_logs = this.state.sql_logs.slice(0, 150);
    }
    this.save();
  }

  private seedDefaultData() {
    // If no demo user, seed demo user
    const existingDemo = this.state.users.find(u => u.email === 'demo@gemini.ai');
    if (!existingDemo) {
      const { hash, salt } = hashPassword('Gemini2026!');
      const demoUser: User = {
        id: 'usr_demo_gemini',
        email: 'demo@gemini.ai',
        username: 'Gemini Explorer',
        password_hash: hash,
        salt,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      };
      this.state.users.push(demoUser);

      // Seed a welcome conversation
      const convId = 'conv_welcome_1';
      const conv: Conversation = {
        id: convId,
        user_id: demoUser.id,
        title: 'Welcome to Gemini Advanced AI',
        model: 'gemini-3.8-flash',
        pinned: 1,
        archived: 0,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      };
      this.state.conversations.push(conv);

      this.state.messages.push(
        {
          id: 'msg_1',
          conversation_id: convId,
          role: 'user',
          content: 'Hello! What can this advanced Gemini chatbot and dashboard do?',
          tokens_used: 14,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'msg_2',
          conversation_id: convId,
          role: 'model',
          content: `### Welcome to Gemini Advanced AI Studio ✨

I'm your next-generation AI assistant built with:
* **Minimalist Gemini UI**: Inspired by Google Gemini's clean design, smooth animations, and reactive conversation flow.
* **SQL Database Architecture**: Relational tables (\`users\`, \`conversations\`, \`messages\`, \`sessions\`) stored and logged with real SQL queries.
* **Secure Authentication**: Salted PBKDF2 password hashing & token-based session management.
* **Analytics Dashboard**: Real-time prompt stats, token estimations, interaction logs, and raw SQL query inspector.
* **Python & MySQL Blueprint**: View or export production-ready Python FastAPI/Flask code and MySQL schemas!

Try asking me a question or test the dashboard on the top right navigation!`,
          tokens_used: 148,
          created_at: new Date(Date.now() - 86400000 * 2 + 1000).toISOString(),
        }
      );

      this.save();
    }
  }

  // --- User Operations (SQL Simulation) ---
  findUserByEmail(email: string): User | null {
    const start = performance.now();
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1';
    const user = this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    this.logSql(query, [email], performance.now() - start);
    return user ? { ...user } : null;
  }

  findUserById(id: string): User | null {
    const start = performance.now();
    const query = 'SELECT * FROM users WHERE id = ? LIMIT 1';
    const user = this.state.users.find(u => u.id === id) || null;
    this.logSql(query, [id], performance.now() - start);
    return user ? { ...user } : null;
  }

  createUser(email: string, username: string, passwordHash: string, salt: string): User {
    const start = performance.now();
    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      email,
      username,
      password_hash: passwordHash,
      salt,
      created_at: new Date().toISOString(),
    };
    const query = 'INSERT INTO users (id, email, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)';
    this.state.users.push(newUser);
    this.save();
    this.logSql(query, [newUser.id, email, username, '***', '***', newUser.created_at], performance.now() - start);
    return { ...newUser };
  }

  // --- Session Operations ---
  createSession(userId: string): Session {
    const start = performance.now();
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const session: Session = {
      token,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days
    };
    const query = 'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)';
    this.state.sessions.push(session);
    this.save();
    this.logSql(query, [token.slice(0, 10) + '...', userId, session.created_at, session.expires_at], performance.now() - start);
    return session;
  }

  findSession(token: string): Session | null {
    const start = performance.now();
    const query = 'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW() LIMIT 1';
    const session = this.state.sessions.find(s => s.token === token && new Date(s.expires_at) > new Date()) || null;
    this.logSql(query, [token.slice(0, 10) + '...'], performance.now() - start);
    return session ? { ...session } : null;
  }

  deleteSession(token: string): void {
    const start = performance.now();
    const query = 'DELETE FROM sessions WHERE token = ?';
    this.state.sessions = this.state.sessions.filter(s => s.token !== token);
    this.save();
    this.logSql(query, [token.slice(0, 10) + '...'], performance.now() - start);
  }

  // --- Conversation Operations ---
  getUserConversations(userId: string): (Conversation & { message_count: number; last_message?: string })[] {
    const start = performance.now();
    const query = `
      SELECT c.*, COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = ? AND c.archived = 0
      GROUP BY c.id
      ORDER BY c.pinned DESC, c.updated_at DESC
    `;
    const userConvs = this.state.conversations
      .filter(c => c.user_id === userId && !c.archived)
      .map(c => {
        const msgs = this.state.messages.filter(m => m.conversation_id === c.id);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content.slice(0, 80) : '';
        return {
          ...c,
          message_count: msgs.length,
          last_message: lastMsg,
        };
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    this.logSql(query, [userId], performance.now() - start);
    return userConvs;
  }

  getConversation(id: string, userId: string): (Conversation & { messages: Message[] }) | null {
    const start = performance.now();
    const query = 'SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1';
    const conv = this.state.conversations.find(c => c.id === id && c.user_id === userId);
    if (!conv) {
      this.logSql(query, [id, userId], performance.now() - start);
      return null;
    }
    const msgs = this.state.messages
      .filter(m => m.conversation_id === id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    this.logSql(query, [id, userId], performance.now() - start);
    return {
      ...conv,
      messages: msgs,
    };
  }

  createConversation(userId: string, title: string = 'New Chat', model: string = 'gemini-3.8-flash'): Conversation {
    const start = performance.now();
    const newConv: Conversation = {
      id: 'conv_' + crypto.randomBytes(8).toString('hex'),
      user_id: userId,
      title,
      model,
      pinned: 0,
      archived: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const query = 'INSERT INTO conversations (id, user_id, title, model, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)';
    this.state.conversations.unshift(newConv);
    this.save();
    this.logSql(query, [newConv.id, userId, title, model, newConv.created_at, newConv.updated_at], performance.now() - start);
    return { ...newConv };
  }

  updateConversation(id: string, userId: string, updates: Partial<Pick<Conversation, 'title' | 'pinned' | 'archived'>>): Conversation | null {
    const start = performance.now();
    const conv = this.state.conversations.find(c => c.id === id && c.user_id === userId);
    if (!conv) return null;

    if (updates.title !== undefined) conv.title = updates.title;
    if (updates.pinned !== undefined) conv.pinned = updates.pinned;
    if (updates.archived !== undefined) conv.archived = updates.archived;
    conv.updated_at = new Date().toISOString();

    const query = 'UPDATE conversations SET title = ?, pinned = ?, archived = ?, updated_at = ? WHERE id = ? AND user_id = ?';
    this.save();
    this.logSql(query, [conv.title, conv.pinned, conv.archived, conv.updated_at, id, userId], performance.now() - start);
    return { ...conv };
  }

  deleteConversation(id: string, userId: string): boolean {
    const start = performance.now();
    const index = this.state.conversations.findIndex(c => c.id === id && c.user_id === userId);
    if (index === -1) return false;

    this.state.conversations.splice(index, 1);
    // Cascade delete messages
    this.state.messages = this.state.messages.filter(m => m.conversation_id !== id);

    const query = 'DELETE FROM conversations WHERE id = ? AND user_id = ?; DELETE FROM messages WHERE conversation_id = ?;';
    this.save();
    this.logSql(query, [id, userId, id], performance.now() - start);
    return true;
  }

  // --- Message Operations ---
  addMessage(conversationId: string, role: 'user' | 'model' | 'system', content: string, tokensUsed: number = 0): Message {
    const start = performance.now();
    const msg: Message = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      conversation_id: conversationId,
      role,
      content,
      tokens_used: tokensUsed,
      created_at: new Date().toISOString(),
    };
    this.state.messages.push(msg);

    // Touch conversation updated_at
    const conv = this.state.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.updated_at = msg.created_at;
      // If conversation title is default 'New Chat', derive title from first user message
      if (conv.title === 'New Chat' && role === 'user') {
        conv.title = content.slice(0, 36) + (content.length > 36 ? '...' : '');
      }
    }

    const query = 'INSERT INTO messages (id, conversation_id, role, content, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?)';
    this.save();
    this.logSql(query, [msg.id, conversationId, role, content.slice(0, 40) + '...', tokensUsed, msg.created_at], performance.now() - start);
    return { ...msg };
  }

  // --- Dashboard & Analytics Operations ---
  getDashboardStats(userId: string) {
    const start = performance.now();
    const userConvs = this.state.conversations.filter(c => c.user_id === userId);
    const convIds = new Set(userConvs.map(c => c.id));
    const userMsgs = this.state.messages.filter(m => convIds.has(m.conversation_id));
    const userPrompts = userMsgs.filter(m => m.role === 'user');
    const aiResponses = userMsgs.filter(m => m.role === 'model');

    const totalTokens = userMsgs.reduce((acc, m) => acc + (m.tokens_used || 0), 0);
    const avgResponseLength = aiResponses.length > 0
      ? Math.round(aiResponses.reduce((acc, m) => acc + m.content.length, 0) / aiResponses.length)
      : 0;

    // Activity by date (last 7 days)
    const dailyMap: { [date: string]: { date: string; prompts: number; responses: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { date: dateStr, prompts: 0, responses: 0 };
    }

    userMsgs.forEach(m => {
      const dateStr = m.created_at.split('T')[0];
      if (dailyMap[dateStr]) {
        if (m.role === 'user') dailyMap[dateStr].prompts++;
        else if (m.role === 'model') dailyMap[dateStr].responses++;
      }
    });

    const query = `
      SELECT
        COUNT(DISTINCT c.id) as total_chats,
        COUNT(m.id) as total_messages,
        SUM(m.tokens_used) as total_tokens
      FROM conversations c
      JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = ?
    `;
    this.logSql(query, [userId], performance.now() - start);

    return {
      totalConversations: userConvs.length,
      totalPrompts: userPrompts.length,
      totalAiResponses: aiResponses.length,
      totalTokens,
      avgResponseLength,
      dailyActivity: Object.values(dailyMap),
      recentInteractions: userMsgs.slice(-20).reverse().map(m => {
        const conv = userConvs.find(c => c.id === m.conversation_id);
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          conversation_title: conv?.title || 'Unknown',
          role: m.role,
          preview: m.content.slice(0, 120),
          tokens_used: m.tokens_used,
          created_at: m.created_at,
        };
      }),
    };
  }

  getSqlLogs() {
    return this.state.sql_logs.slice(0, 50);
  }

  // Developer SQL Console to execute raw simulated queries
  executeRawQuery(sql: string): { success: boolean; data?: any; error?: string; rowCount?: number } {
    const trimmed = sql.trim().toLowerCase();
    const start = performance.now();
    try {
      if (trimmed.startsWith('select')) {
        let results: any[] = [];
        if (trimmed.includes('from users')) {
          results = this.state.users.map(({ password_hash, salt, ...rest }) => rest);
        } else if (trimmed.includes('from conversations')) {
          results = this.state.conversations;
        } else if (trimmed.includes('from messages')) {
          results = this.state.messages.slice(-50);
        } else if (trimmed.includes('from sessions')) {
          results = this.state.sessions.map(s => ({ ...s, token: s.token.slice(0, 10) + '...' }));
        } else if (trimmed.includes('from sql_logs')) {
          results = this.state.sql_logs.slice(0, 30);
        } else {
          results = [
            { table_name: 'users', estimated_rows: this.state.users.length },
            { table_name: 'conversations', estimated_rows: this.state.conversations.length },
            { table_name: 'messages', estimated_rows: this.state.messages.length },
            { table_name: 'sessions', estimated_rows: this.state.sessions.length },
          ];
        }
        this.logSql(sql, [], performance.now() - start, 'SUCCESS');
        return { success: true, data: results, rowCount: results.length };
      } else {
        return {
          success: false,
          error: 'Only SELECT queries are permitted in the interactive browser console for database security.',
        };
      }
    } catch (err: any) {
      this.logSql(sql, [], performance.now() - start, 'ERROR');
      return { success: false, error: err.message || 'SQL execution failed' };
    }
  }
}

export const db = new SqlDatabase();
