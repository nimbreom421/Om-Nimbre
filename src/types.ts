export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  pinned: number;
  archived?: number;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
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

export interface DashboardStats {
  totalConversations: number;
  totalPrompts: number;
  totalAiResponses: number;
  totalTokens: number;
  avgResponseLength: number;
  dailyActivity: {
    date: string;
    prompts: number;
    responses: number;
  }[];
  recentInteractions: {
    id: string;
    conversation_id: string;
    conversation_title: string;
    role: 'user' | 'model' | 'system';
    preview: string;
    tokens_used: number;
    created_at: string;
  }[];
}

export interface BackendCodeFiles {
  appPy: string;
  databaseSql: string;
  requirementsTxt: string;
  readme: string;
}
