import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as assistantApi from '../api/assistant.js';
import { useAuth } from './AuthContext.jsx';

const ChatContext = createContext(null);
const STORAGE_KEY = 'artmind_chat';

export const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hello. Ask me about any painting, artist or style, or tell me what you would like to see.',
  paintings: [],
  followUps: [],
};

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const saved = useRef(readSaved());
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(saved.current?.messages || [WELCOME]);
  const [conversationId, setConversationId] = useState(saved.current?.conversationId || null);
  const [context, setContext] = useState(saved.current?.context || {});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const lastUser = useRef(user?.id);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-40), conversationId, context }));
    } catch {
    }
  }, [messages, conversationId, context]);

  const reset = useCallback(() => {
    setMessages([WELCOME]);
    setConversationId(null);
    setContext({});
    setError(null);
  }, []);

  useEffect(() => {
    if (lastUser.current !== user?.id) {
      lastUser.current = user?.id;
      reset();
    }
  }, [user, reset]);

  const send = useCallback(
    async (text, extraContext) => {
      const message = String(text || '').trim();
      if (!message || pending) return null;
      const withContext = { ...context, ...extraContext };
      const mine = { id: `local${Date.now()}`, role: 'user', text: message, paintings: [], followUps: [], createdAt: new Date().toISOString() };
      setMessages((list) => [...list, mine]);
      setPending(true);
      setError(null);
      try {
        const history = messages
          .filter((m) => m.id !== 'welcome')
          .slice(-10)
          .map((m) => ({ role: m.role, text: m.text, paintings: (m.paintings || []).map((p) => p.slug) }));
        const result = await assistantApi.sendMessage({ conversationId, message, context: withContext, history });
        setConversationId(result.conversationId);
        setMessages((list) => [...list, result.reply]);
        return result.reply;
      } catch (err) {
        setError(err.message || 'The assistant could not answer just now. Please try again.');
        return null;
      } finally {
        setPending(false);
      }
    },
    [context, conversationId, messages, pending],
  );

  const open = useCallback(
    ({ painting, query, message } = {}) => {
      let nextContext = null;
      if (painting) nextContext = { paintingSlug: painting.slug, paintingTitle: painting.title };
      else if (query) nextContext = { query };
      if (nextContext) setContext(nextContext);
      setIsOpen(true);
      if (message) setTimeout(() => send(message, nextContext || undefined), 0);
    },
    [send],
  );

  const loadConversation = useCallback(async (id) => {
    const { conversation } = await assistantApi.getConversation(id);
    setConversationId(conversation.id);
    setMessages([WELCOME, ...conversation.messages]);
    setContext({});
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      messages,
      send,
      pending,
      error,
      context,
      clearContext: () => setContext({}),
      conversationId,
      loadConversation,
      reset,
    }),
    [isOpen, open, messages, send, pending, error, context, conversationId, loadConversation, reset],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used inside ChatProvider');
  return context;
}
