import { del, get, post } from './client.js';

export const getSuggestions = () => get('/assistant/suggestions');

export const sendMessage = ({ conversationId = null, message, context, history }) =>
  post('/assistant/messages', { conversationId, message, context, history });

export const listConversations = () => get('/assistant/conversations');
export const getConversation = (id) => get(`/assistant/conversations/${id}`);
export const deleteConversation = (id) => del(`/assistant/conversations/${id}`);
