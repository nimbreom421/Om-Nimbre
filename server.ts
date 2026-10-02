import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { db, hashPassword, verifyPassword } from './server/db';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// JSON parser
app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client (Server-side ONLY as required)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Authentication middleware
interface AuthRequest extends Request {
  userId?: string;
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const session = db.findSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  req.userId = session.user_id;
  next();
};

// ==========================================
// 1. Auth Endpoints
// ==========================================

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const { hash, salt } = hashPassword(password);
    const user = db.createUser(email.toLowerCase(), username.trim(), hash, salt);
    const session = db.createSession(user.id);

    return res.json({
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const session = db.createSession(user.id);
    return res.json({
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Current User profile
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = db.findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.deleteSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// 2. Conversation Endpoints
// ==========================================

// List user conversations
app.get('/api/conversations', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const conversations = db.getUserConversations(req.userId!);
    return res.json(conversations);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// Create new conversation
app.post('/api/conversations', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, model } = req.body;
    const conv = db.createConversation(req.userId!, title || 'New Chat', model || 'gemini-3.8-flash');
    return res.json(conv);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation with messages
app.get('/api/conversations/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const conv = db.getConversation(req.params.id, req.userId!);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json(conv);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load conversation' });
  }
});

// Update conversation (rename / pin / archive)
app.patch('/api/conversations/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, pinned, archived } = req.body;
    const updated = db.updateConversation(req.params.id, req.userId!, { title, pinned, archived });
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
app.delete('/api/conversations/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const deleted = db.deleteConversation(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ==========================================
// 3. AI Chat Endpoint (Gemini 3.8 Flash Streaming & Unary)
// ==========================================

app.post('/api/chat', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversation_id, message, stream = true, webSearch = false, system_instruction } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // 1. Resolve or create conversation
    let convId = conversation_id;
    let conv = convId ? db.getConversation(convId, req.userId!) : null;

    if (!conv) {
      const newConv = db.createConversation(
        req.userId!,
        message.slice(0, 36) + (message.length > 36 ? '...' : ''),
        'gemini-3.8-flash'
      );
      convId = newConv.id;
      conv = db.getConversation(convId, req.userId!);
    }

    // 2. Append User message in SQL Database
    const estimatedUserTokens = Math.max(3, Math.ceil(message.length / 4));
    const userMsg = db.addMessage(convId, 'user', message, estimatedUserTokens);

    // 3. Prepare conversation history for Gemini
    const allMessages = db.getConversation(convId, req.userId!)?.messages || [];
    // Format contents according to @google/genai specifications
    const contents = allMessages.slice(-14).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = system_instruction ||
      'You are Gemini, Google\'s state-of-the-art AI assistant. ' +
      'Provide articulate, precise, well-structured answers using markdown with headings, bullet points, clean tables, and syntax-highlighted code blocks where helpful. ' +
      'Maintain an empathetic, intelligent, and minimalist tone.';

    const modelConfig: any = {
      systemInstruction,
    };

    if (webSearch) {
      modelConfig.tools = [{ googleSearch: {} }];
    }

    // 4. Stream response using Server-Sent Events (SSE)
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send initial meta event
      res.write(`data: ${JSON.stringify({ type: 'start', conversation_id: convId, user_message: userMsg })}\n\n`);

      let fullResponseText = '';

      try {
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: modelConfig,
        });

        for await (const chunk of responseStream) {
          const textChunk = chunk.text || '';
          if (textChunk) {
            fullResponseText += textChunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: textChunk })}\n\n`);
          }
        }

        // Store model response in SQL database
        const estimatedAiTokens = Math.max(5, Math.ceil(fullResponseText.length / 4));
        const aiMsg = db.addMessage(convId, 'model', fullResponseText, estimatedAiTokens);

        res.write(`data: ${JSON.stringify({ type: 'done', message: aiMsg, total_tokens: estimatedUserTokens + estimatedAiTokens })}\n\n`);
        return res.end();
      } catch (genError: any) {
        console.error('Gemini Stream Error:', genError);
        const fallbackText = `I encountered an issue processing your request: ${genError.message || 'Unknown error'}. Please try again.`;
        db.addMessage(convId, 'model', fallbackText, 20);
        res.write(`data: ${JSON.stringify({ type: 'error', error: genError.message || 'Gemini API call failed' })}\n\n`);
        return res.end();
      }
    } else {
      // Unary fallback
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: modelConfig,
      });

      const replyText = response.text || 'No response generated.';
      const estimatedAiTokens = Math.max(5, Math.ceil(replyText.length / 4));
      const aiMsg = db.addMessage(convId, 'model', replyText, estimatedAiTokens);

      return res.json({
        conversation_id: convId,
        user_message: userMsg,
        ai_message: aiMsg,
      });
    }
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process chat message' });
  }
});

// ==========================================
// 4. Dashboard, Analytics & SQL Logs
// ==========================================

// Dashboard metrics
app.get('/api/dashboard/stats', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const stats = db.getDashboardStats(req.userId!);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

// SQL query logs
app.get('/api/dashboard/sql-logs', requireAuth, (_req: AuthRequest, res: Response) => {
  try {
    const logs = db.getSqlLogs();
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve SQL logs' });
  }
});

// Interactive SQL query execution
app.post('/api/dashboard/run-sql', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query string required' });
    }
    const result = db.executeRawQuery(sql);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'SQL execution failed' });
  }
});

// Get Python & MySQL codebase for inspection
app.get('/api/backend/code', (_req: Request, res: Response) => {
  try {
    const pyAppPath = path.resolve('python-backend/app.py');
    const sqlSchemaPath = path.resolve('python-backend/database.sql');
    const reqsPath = path.resolve('python-backend/requirements.txt');
    const readmePath = path.resolve('python-backend/README.md');

    const appPy = fs.existsSync(pyAppPath) ? fs.readFileSync(pyAppPath, 'utf-8') : '';
    const databaseSql = fs.existsSync(sqlSchemaPath) ? fs.readFileSync(sqlSchemaPath, 'utf-8') : '';
    const requirementsTxt = fs.existsSync(reqsPath) ? fs.readFileSync(reqsPath, 'utf-8') : '';
    const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '';

    return res.json({
      appPy,
      databaseSql,
      requirementsTxt,
      readme,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read Python backend files' });
  }
});

// ==========================================
// 5. Dev Server & Production Static Handling
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gemini Chatbot Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
