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

export const CHAT_ERROR = 'Something went wrong. Please try again.';

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function ChatProvider({ children }) {
  const { user, isLoading } = useAuth();
  const saved = useRef(readSaved());
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(saved.current?.messages || [WELCOME]);
  const [conversationId, setConversationId] = useState(saved.current?.conversationId || null);
  const [context, setContext] = useState(saved.current?.context || {});
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(null);
  const [version, setVersion] = useState(0);
  const lastUser = useRef(saved.current ? saved.current.userId ?? null : undefined);
  const launcherRef = useRef(null);
  const state = useRef({});
  state.current = { messages, conversationId, context, pending };

  useEffect(() => {
    try {
      if (lastUser.current === undefined) return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: lastUser.current, messages: messages.slice(-40), conversationId, context }));
    } catch {
    }
  }, [messages, conversationId, context, isLoading]);

  const reset = useCallback(() => {
    setMessages([WELCOME]);
    setConversationId(null);
    setContext({});
    setDraft('');
    setFailed(null);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const id = user?.id ?? null;
    if (lastUser.current === undefined) {
      lastUser.current = id;
      return;
    }
    if (lastUser.current !== id) {
      lastUser.current = id;
      reset();
    }
  }, [user, isLoading, reset]);

  const ask = useCallback(async (message, { addBubble = true } = {}) => {
    const now = state.current;
    if (!message || now.pending) return null;
    if (addBubble) {
      const mine = { id: `local${Date.now()}`, role: 'user', text: message, paintings: [], followUps: [], createdAt: new Date().toISOString() };
      setMessages((list) => [...list, mine]);
    }
    setPending(true);
    setFailed(null);
    try {
      const history = now.messages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text, paintings: (m.paintings || []).map((p) => p.slug) }));
      const result = await assistantApi.sendMessage({ conversationId: now.conversationId, message, context: now.context, history });
      setConversationId(result.conversationId);
      setMessages((list) => [...list, result.reply]);
      if (result.conversationId) setVersion((v) => v + 1);
      return result.reply;
    } catch {
      setFailed(message);
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const send = useCallback((text) => {
    const message = String(text || '').trim();
    if (!message || state.current.pending) return null;
    setDraft('');
    return ask(message);
  }, [ask]);

  const retry = useCallback(() => {
    if (failed) ask(failed, { addBubble: false });
  }, [ask, failed]);

  const open = useCallback(({ painting, query } = {}) => {
    if (painting) {
      setContext({ paintingSlug: painting.slug, paintingTitle: painting.title });
      setDraft(`Tell me about ${painting.title}`);
    } else if (query) {
      setContext({ query });
      setDraft(`Help me find ${query}`);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setIsOpen(false);
    if (restoreFocus) setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  const loadConversation = useCallback(async (id) => {
    const { conversation } = await assistantApi.getConversation(id);
    setConversationId(conversation.id);
    setMessages([WELCOME, ...conversation.messages]);
    setContext({});
    setFailed(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle: () => setIsOpen((v) => !v),
      launcherRef,
      messages,
      send,
      retry,
      pending,
      error: failed ? CHAT_ERROR : null,
      draft,
      setDraft,
      context,
      clearContext: () => setContext({}),
      conversationId,
      loadConversation,
      reset,
      version,
    }),
    [isOpen, open, close, messages, send, retry, pending, failed, draft, context, conversationId, loadConversation, reset, version],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used inside ChatProvider');
  return context;
}
